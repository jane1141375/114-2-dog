const DogAdoptionHouse = (() => {
  const STORAGE_KEY = "adoptedDogs";
  let overlay = null;
  let closeBtn = null;
  let container = null;
  let paginationContainer = null;
  let currentPage = 1;
  const DOGS_PER_PAGE = 5;

  function init(domElements) {
    overlay = domElements.adoptionHouseOverlay;
    closeBtn = domElements.adoptionClose;
    container = domElements.adoptedDogsContainer;
    paginationContainer = domElements.adoptionPagination;

    if (!overlay) return;

    closeBtn?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    paginationContainer?.addEventListener("click", (event) => {
      const button = event.target.closest(".page-btn");
      if (!button) return;
      const page = parseInt(button.dataset.page, 10);
      if (!Number.isFinite(page)) return;
      currentPage = page;
      renderDogs();
    });
  }

  function open() {
    if (!overlay) return;
    currentPage = 1;
    renderDogs();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function addAdoptedDog(imageDataURL) {
    if (!imageDataURL) return;

    const adoptedDogs = getAdoptedDogs();
    // 使用不含年份的本地化時間（例如：5/29 15:30 或 上午/下午 樣式），以免顯示年分
    const timestamp = new Date().toLocaleString("zh-TW", { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    adoptedDogs.push({
      image: imageDataURL,
      timestamp: timestamp,
      id: Date.now(),
      name: ""
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(adoptedDogs));
  }

  function renameAdoptedDog(id) {
    const adoptedDogs = getAdoptedDogs();
    const dogIndex = adoptedDogs.findIndex((dog) => dog.id === id);
    if (dogIndex === -1) return;

    const currentName = adoptedDogs[dogIndex].name || "";
    const newName = window.prompt("請輸入狗狗的新名字：", currentName);
    if (newName === null) return;

    adoptedDogs[dogIndex].name = newName.trim() || currentName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adoptedDogs));
    renderDogs();
  }

  function getAdoptedDogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("讀取收養狗狗資料失敗：", e);
      return [];
    }
  }

  function renderDogs() {
    if (!container) return;

    const adoptedDogs = getAdoptedDogs();

    if (adoptedDogs.length === 0) {
      container.innerHTML = '<p class="empty-message">你還沒有帶回家任何狗狗呢，加油！</p>';
      renderPagination(0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(adoptedDogs.length / DOGS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * DOGS_PER_PAGE;
    const pageDogs = adoptedDogs.slice(startIndex, startIndex + DOGS_PER_PAGE);

    container.innerHTML = pageDogs.map((dog, index) => `
      <div class="adopted-dog-card">
        <img src="${dog.image}" alt="已收養的狗狗 ${startIndex + index + 1}" class="adopted-dog-image" />
        <div class="adopted-dog-meta">
          <p class="adopted-dog-name">${dog.name ? `${dog.name}` : '尚未命名'}</p>
          <p class="adopted-dog-timestamp">${dog.timestamp}</p>
        </div>
        <div class="adopted-dog-actions">
          <button class="name-dog-btn" type="button" data-id="${dog.id}">命名</button>
          <button class="delete-dog-btn" type="button" data-id="${dog.id}" aria-label="刪除此狗狗">🗑️</button>
        </div>
      </div>
    `).join("");

    renderPagination(totalPages);

    // 為命名與刪除按鈕添加事件監聽
    container.querySelectorAll(".name-dog-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        renameAdoptedDog(id);
      });
    });

    container.querySelectorAll(".delete-dog-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        deleteAdoptedDog(id);
        renderDogs();
      });
    });
  }

  function renderPagination(totalPages) {
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.style.display = "none";
      paginationContainer.innerHTML = "";
      return;
    }

    paginationContainer.style.display = "flex";
    paginationContainer.innerHTML = Array.from({ length: totalPages }, (_, i) => {
      const page = i + 1;
      return `<button type="button" class="page-btn${page === currentPage ? ' active' : ''}" data-page="${page}">${page}</button>`;
    }).join("");
  }

  function deleteAdoptedDog(id) {
    const adoptedDogs = getAdoptedDogs();
    const filtered = adoptedDogs.filter(dog => dog.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  return {
    init,
    open,
    close,
    addAdoptedDog,
    getAdoptedDogs,
  };
})();

const StatsPanel = (() => {
  const STORAGE_KEY = "endingCounts";
  let overlay = null;
  let closeBtn = null;
  let canvas = null;
  let countsContainer = null;
  let ctx = null;
  let resetBtn = null;

  function init(dom) {
    overlay = dom.statsOverlay;
    closeBtn = dom.statsClose;
    canvas = dom.statsCanvas;
    countsContainer = dom.statsCounts;
    resetBtn = dom.resetStatsBtn;

    if (!overlay) return;

    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    if (canvas) ctx = canvas.getContext('2d');

    // 綁定重置按鈕
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        try {
          if (window.confirm('確定要重置所有結局統計紀錄？此操作無法復原。')) {
            resetCounts();
          }
        } catch (e) { console.error(e); }
      });
    }

    render();
  }

  function open() {
    if (!overlay) return;
    render();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function getCounts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { adopted: 0, escaped: 0, bitten: 0, hidden: 0, careless: 0 };
      const obj = JSON.parse(raw);
      return Object.assign({ adopted: 0, escaped: 0, bitten: 0, hidden: 0, careless: 0 }, obj);
    } catch (e) {
      console.error('讀取統計資料失敗', e);
      return { adopted: 0, escaped: 0, bitten: 0, hidden: 0, careless: 0 };
    }
  }

  function saveCounts(c) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) { console.error(e); }
  }

  function resetCounts() {
    try {
      const empty = { adopted: 0, escaped: 0, bitten: 0, hidden: 0, careless: 0 };
      saveCounts(empty);
      render();
    } catch (e) { console.error('重置統計失敗', e); }
  }

  function incrementEnding(type) {
    const counts = getCounts();
    if (!Object.prototype.hasOwnProperty.call(counts, type)) counts[type] = 0;
    counts[type] += 1;
    saveCounts(counts);
    render();
  }

  function render() {
    const counts = getCounts();

    // 重新計算使用者要求的分類：
    // 照顧不周 (careless): 包含過度餵食與累暈（由 game.js 在觸發時累計到 careless）
    // 成功: adopted
    // 失敗: bitten
    // 其他隱藏: escaped + hidden
    const careless = counts.careless || 0;
    const success = counts.adopted || 0;
    const failure = counts.bitten || 0;
    const otherHidden = (counts.escaped || 0) + (counts.hidden || 0);

    renderCanvas({ careless, success, failure, otherHidden });
    if (countsContainer) {
      countsContainer.innerHTML = `
        <div class="stat-item">照顧不周<br><strong>${careless}</strong></div>
        <div class="stat-item">成功<br><strong>${success}</strong></div>
        <div class="stat-item">失敗<br><strong>${failure}</strong></div>
        <div class="stat-item">其他隱藏<br><strong>${otherHidden}</strong></div>
      `;
    }
  }

  function renderCanvas(counts) {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // 接受 counts 結構： { careless, success, failure, otherHidden }
    const labels = ['照顧不周','成功','失敗','其他隱藏'];
    const values = [counts.careless || 0, counts.success || 0, counts.failure || 0, counts.otherHidden || 0];
    const max = Math.max(1, ...values);

    const padding = 28;
    const barWidth = (w - padding * 2) / values.length * 0.6;
    const gap = ((w - padding * 2) - barWidth * values.length) / (values.length - 1);

    values.forEach((val, i) => {
      const x = padding + i * (barWidth + gap);
      const barH = (val / max) * (h - 80);
      const y = h - padding - barH - 24;

      // bar background
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, h - padding - (h - 80) * 0.02, barWidth, (h - 80) * 0.02);

      // bar
      const colors = ['#ff9f43','#4fd56f','#ff6b6b','#6f8cd6'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, barWidth, barH);

      // value
      ctx.fillStyle = '#5a3a24';
      ctx.font = '16px "Microsoft JhengHei", Arial';
      ctx.textAlign = 'center';
      ctx.fillText(String(val), x + barWidth / 2, y - 8);

      // label
      ctx.font = '12px "Microsoft JhengHei", Arial';
      ctx.fillText(labels[i], x + barWidth / 2, h - 8);
    });
  }

  return { init, open, close, incrementEnding, getCounts };
})();

const GameController = (() => {
  let dogState = {
    affection: 20,
    satiety: 0,
    energy: 0,
    mood: "normal",
    adopted: false,
    escaped: false,
    bitten: false,
  };


  const actionMessages = {
    feed: [
      "好吃！狗狗開心地嚼著食物！",
      "狗狗聞了聞，接受了你的食物。",
      "狗狗三口兩口就吃完了！",
    ],
    music: "狗狗聽到音樂，開始判斷你的品味。",
    pet: [
      "你伸手摸摸牠，狗狗正在思考要不要相信你。",
      "狗狗側著頭看你，感覺有點警戒。",
      "你輕輕摸了一下，狗狗的耳朵動了一下。",
    ],
    play: "你們一起玩了一下，狗狗看起來有點心動。",
  };

  function getActionMessage(action) {
    const message = actionMessages[action];
    if (Array.isArray(message)) {
      return message[getRandomInt(0, message.length - 1)];
    }
    return message || "狗狗看了你一眼。";
  }


  const actionRanges = { // 每個行動對好感度的影響範圍
    feed: [0, 0], 
    music: [-8, 24],
    pet: [-12, 18],
    play: [-15, 19],
  };


  let elements = {};
  let toastTimerId = null;
  let interactionCount = 0;
  let metabolismClickThreshold = 2;
  let metabolismTimerId = null;
  let metabolismStartTimerId = null;
  let metabolismStarted = false;
  let overfeedExtraClicks = 0;

  const PianoMode = (() => {
    let overlay = null;
    let closeBtn = null;
    let doneBtn = null;
    let keys = null;
    let feedback = null;
    let scoreSheetButtons = null;
    let scoreSheetContent = null;
    let exitCallback = null;
    let audioContext = null;
    // 管理中途排程與正在播放的節點，方便退出時立即停止
    let scheduledIds = [];
    let activeSources = [];
    let activeOscillators = [];

    // 儲解碼後的真實鋼琴音訊緩衝區 (AudioBuffer)
    const audioBuffers = {};

    const scoreNotations = {
      mary: `瑪莉有隻小綿羊
3 2 1 2 | 3 3 3 - | 2 2 2 - | 3 5 5 -
3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1 - - -`,
      twinkle: `小星星
1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -
5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 -
1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -`,
      bee: `小蜜蜂
5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 -
5 3 3 - | 4 2 2 - | 1 3 5 5 | 3 - - -
2 2 2 2 | 2 3 4 - | 3 3 3 3 | 3 4 5 -
5 3 3 - | 4 2 2 - | 1 3 5 5 | 1 - - -`
    };

    // 使用真實鋼琴音訊採樣網址 (這裡使用開源的鋼琴採樣)
    const noteUrls = {
      C: "https://tonejs.github.io/audio/salamander/C4.mp3",
      D: "https://tonejs.github.io/audio/salamander/D4.mp3",
      E: "https://tonejs.github.io/audio/salamander/E4.mp3",
      F: "https://tonejs.github.io/audio/salamander/F4.mp3",
      G: "https://tonejs.github.io/audio/salamander/G4.mp3",
      A: "https://tonejs.github.io/audio/salamander/A4.mp3",
      B: "https://tonejs.github.io/audio/salamander/B4.mp3",
    };

    // 鍵盤熱鍵映射表：對應鍵盤 A, S, D, F, G, H, J
    const keyboardMap = {
      a: "C",
      s: "D",
      d: "E",
      f: "F",
      g: "G",
      h: "A",
      j: "B",
      A: "C",
      S: "D",
      D: "E",
      F: "F",
      G: "G",
      H: "A",
      J: "B",
    };

    function init(domElements) {
      overlay = domElements.pianoOverlay;
      closeBtn = domElements.pianoClose;
      doneBtn = domElements.pianoDone;
      keys = domElements.pianoKeys;
      feedback = domElements.pianoFeedback;

      if (!overlay) return;

      closeBtn?.addEventListener("click", close);
      doneBtn?.addEventListener("click", close);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
      });

      scoreSheetButtons = domElements.scoreSheetButtons;
      scoreSheetContent = domElements.scoreSheetContent;

      scoreSheetButtons?.forEach((button) => {
        button.addEventListener("click", () => {
          showScoreNotation(button.dataset.song);
          scoreSheetButtons?.forEach((btn) => btn.classList.remove("active"));
          button.classList.add("active");
        });
      });

      keys?.forEach((key) => {
        key.addEventListener("click", () => {
          handleKeyPress(key.dataset.note);
        });
      });

      // 預先非同步載入音色庫，避免點擊時卡頓
      preloadSamples();
    }

    // 非同步預載真實鋼琴聲音
    async function preloadSamples() {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      for (const [note, url] of Object.entries(noteUrls)) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          audioBuffers[note] = await audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
          console.error(`無法載入音符 ${note} 的真實音檔，將使用備用方案`, e);
        }
      }
    }

    function open(onExit) {
      if (!overlay) {
        onExit?.();
        return;
      }
      exitCallback = onExit;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      updateFeedback(
        "進入鋼琴模式！可以用滑鼠點擊，或敲擊鍵盤 [ A, S, D, F, G, H, J ] 演奏輕快旋律！"
      );
      window.addEventListener("keydown", handleKeyDown);
    }

    function close() {
      if (!overlay) {
        exitCallback?.();
        return;
      }
      // 退出時立即停止所有排程與正在播放的音訊
      stopAllPlayback();
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      updateFeedback("開始彈奏一段輕快的旋律吧！");
      window.removeEventListener("keydown", handleKeyDown);
      exitCallback?.();
    }

    // 處理鍵盤敲擊邏輯
    function handleKeyDown(event) {
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        playQuickRiff();
        return;
      }

      const note = keyboardMap[event.key];
      if (note) {
        handleKeyPress(note);
        triggerVisualEffect(note);
      }
    }

    // 讓畫面的琴鍵有被按下的視覺回饋
    function triggerVisualEffect(note) {
      const activeKey = overlay.querySelector(`[data-note="${note}"]`);
      if (activeKey) {
        activeKey.classList.add("active");
        setTimeout(() => activeKey.classList.remove("active"), 100);
      }
    }

    function handleKeyPress(note) {
      if (audioBuffers[note]) {
        playSample(audioBuffers[note]);
      } else {
        playBackupOscillator(note);
      }

      if (feedback) {
        feedback.textContent = `你彈了 ${note}，這清脆的鋼琴聲讓狗狗聽得好開心！`;
      }
    }

    function showScoreNotation(song) {
      if (!scoreSheetContent) return;
      const notation = scoreNotations[song] || "目前尚無簡譜資料。";
      scoreSheetContent.textContent = notation;
      updateFeedback(`已顯示 ${song === 'mary' ? '瑪莉有隻小綿羊' : song === 'twinkle' ? '小星星' : '小蜜蜂'} 的數字簡譜，繼續彈奏即可。`);
    }

    function playSample(buffer) {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const now = audioContext.currentTime;
      const bufferSource = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      bufferSource.buffer = buffer;
      gainNode.gain.setValueAtTime(1.0, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      bufferSource.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 記錄來源以便在退出時可以立即停止
      activeSources.push(bufferSource);
      bufferSource.onended = () => {
        const idx = activeSources.indexOf(bufferSource);
        if (idx !== -1) activeSources.splice(idx, 1);
      };

      bufferSource.start(now);
      // 原先會在短時間後自動 stop，保留此行以維持消音效果
      bufferSource.stop(now + 0.3);
    }

    function playQuickRiff() {
      const riff = [ //當按下空白鍵時，播放小蜜蜂
        "G", "E", "E",null,
        "F", "D", "D",null,
        "C", "D", "E", "F",
        "G", "G", "G",null,
        "G", "E", "E",null,
        "F", "D", "D",null,
        "C", "E", "G", "G",
        "C", null, null, null,
        "D","D","D","D",
        "D","E","F",null,
        "E","E","E","E",
        "E","F","G",null,
        "G","E","E",null,
        "F","D","D",null,
        "C","E","G","G",
        "C", null, null, null,
      ];
      
      overlay.querySelectorAll(".piano-key").forEach(key => key.classList.remove("active"));
      
      // 先清除先前可能殘留的排程
      scheduledIds.forEach(id => clearTimeout(id));
      scheduledIds = [];

      riff.forEach((note, index) => {
        const id = setTimeout(() => {
          if (note) {
            handleKeyPress(note);
            triggerVisualEffect(note);
          } else {
            overlay.querySelectorAll(".piano-key").forEach(key => key.classList.remove("active"));
          }
        }, index * 450);
        scheduledIds.push(id);
      });

      if (feedback) {
        feedback.textContent = "🎵 你按下空白鍵，狗狗聽到小蜜蜂旋律了！";
      }
    }

    function playBackupOscillator(note) {
      const backupFreqs = {
        C: 261.6,
        D: 293.7,
        E: 329.6,
        F: 349.2,
        G: 392.0,
        A: 440.0,
        B: 493.9,
      };
      const freq = backupFreqs[note];
      if (!freq) return;

      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioContext.destination);

      // 記錄 oscillator 以便在退出時停止
      activeOscillators.push({ osc, gain });
      osc.onended = () => {
        const i = activeOscillators.findIndex(o => o.osc === osc);
        if (i !== -1) activeOscillators.splice(i, 1);
      };

      osc.start();
      osc.stop(audioContext.currentTime + 0.2);
    }

    // 停止所有已排程與正在播放的音訊
    function stopAllPlayback() {
      // 清掉尚未執行的 riff 時間點
      scheduledIds.forEach(id => clearTimeout(id));
      scheduledIds = [];

      // 停止所有 buffer source
      activeSources.forEach(src => {
        try {
          src.stop?.(0);
        } catch (e) {}
        try { src.disconnect?.(); } catch (e) {}
      });
      activeSources = [];

      // 停止所有 oscillator
      activeOscillators.forEach(({ osc, gain }) => {
        try { osc.stop?.(0); } catch (e) {}
        try { osc.disconnect?.(); } catch (e) {}
        try { gain.disconnect?.(); } catch (e) {}
      });
      activeOscillators = [];

      // 清除畫面上所有按鍵的 active 樣式
      if (overlay) {
        overlay.querySelectorAll('.piano-key').forEach(key => key.classList.remove('active'));
      }
    }

    function updateFeedback(text) {
      if (feedback) feedback.textContent = text;
    }

    return { init, open, close };
  })();


  function init(domElements) {
    elements = domElements;
    PianoMode.init(domElements);
    bindActionButtons();
    resetGame();
  }


  function showAdoptionToast() {
    if (!elements.adoptionToast) return;

    const toast = elements.adoptionToast;
    const message = elements.adoptionToastMessage;
    if (message) {
      message.textContent = "恭喜！狗狗已加入收養紀錄";
    }

    createHeartBurst();
    toast.classList.add("visible");

    if (toastTimerId) {
      clearTimeout(toastTimerId);
    }

    toastTimerId = setTimeout(() => {
      hideAdoptionToast();
    }, 2400);
  }

  function hideAdoptionToast() {
    if (!elements.adoptionToast) return;

    if (toastTimerId) {
      clearTimeout(toastTimerId);
      toastTimerId = null;
    }

    elements.adoptionToast.classList.remove("visible");
    elements.adoptionToast.querySelectorAll(".heart").forEach((el) => el.remove());
  }

  function createHeartBurst() {
    if (!elements.adoptionToast) return;

    const burst = elements.adoptionToast.querySelector(".heart-burst");
    if (!burst) return;

    burst.innerHTML = "";
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart";
      heart.textContent = "❤";
      const isLeft = i % 2 === 0;
      const sideMin = isLeft ? 10 : 70;
      const sideMax = isLeft ? 30 : 92;
      heart.style.left = `${sideMin + Math.random() * (sideMax - sideMin)}%`;
      heart.style.top = `${50 + (Math.random() * 16 - 8)}%`;
      heart.style.animation = `heartFloat 1.2s ease-out forwards ${i * 0.04}s`;
      burst.appendChild(heart);
    }
  }


  function resetGame() {
    dogState = {
      affection: getRandomInt(20, 35),
      satiety: getRandomInt(35, 50), // 飽足值初始值範圍
      energy: getRandomInt(70, 90), // 體力值初始值範圍
      mood: "normal",
      adopted: false,
      escaped: false,
      bitten: false,
      hiddenEnding: null,
    };
    interactionCount = 0;
    metabolismClickThreshold = getRandomInt(2, 3);
    overfeedExtraClicks = 0;
    clearMetabolismTimer();
    scheduleInitialMetabolism();
    enableButtons();
    hideRetryButton();
    hideAdoptionToast();
    setStatus("狗狗正在等你陪牠玩喔！");
    updateUI();
  }


  function bindActionButtons() {
    document.querySelectorAll(".game-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "music") {
          openPianoMode();
          return;
        }

        interact(action);
      });
    });
  }

  function isGameEnded() {
    return (
      dogState.adopted ||
      dogState.escaped ||
      dogState.bitten ||
      dogState.hiddenEnding !== null 
    );
  }


  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }


  function clearMetabolismTimer(preserveStarted = false) {
    if (metabolismTimerId !== null) {
      clearTimeout(metabolismTimerId);
      metabolismTimerId = null;
    }
    if (metabolismStartTimerId !== null) {
      clearTimeout(metabolismStartTimerId);
      metabolismStartTimerId = null;
    }
    if (!preserveStarted) {
      metabolismStarted = false;
    }
  }


  function scheduleInitialMetabolism() {
    clearMetabolismTimer();
    metabolismStarted = false;

    metabolismStartTimerId = setTimeout(() => {
      if (!dogState.adopted && !dogState.escaped && !dogState.bitten) {
        metabolismStarted = true;
        scheduleMetabolismTimer();
      }
    }, 10000); // 進入遊戲後 10 秒內不會有自動代謝變動
  }


  function scheduleMetabolismTimer() {
    clearMetabolismTimer(true);

    const delay = getRandomInt(8000, 15000); // 降低飽足值和增加體力值的頻率 8到15秒
    metabolismTimerId = setTimeout(() => {
      if (!dogState.adopted && !dogState.escaped && !dogState.bitten) {
        applyMetabolismTick("time");
      }
      scheduleMetabolismTimer();
    }, delay);
  }


  function applyMetabolismTick(source) { // 隨時間或互動次數後 降低飽足值、增加體力值並降低好感度
    const satietyLoss = getRandomInt(7, 15); // 每次消化減少的飽足值範圍
    const energyGain = getRandomInt(5, 7); // 每次消化增加的體力值範圍
    const affectionLoss = getRandomInt(4, 8); // 每次消化降低的好感度範圍

    dogState.satiety = clamp(dogState.satiety - satietyLoss, 0, 100);
    dogState.energy = clamp(dogState.energy + energyGain, 0, 100);
    dogState.affection = clamp(dogState.affection - affectionLoss, 0, 100);

    const sourceLabel = source === "time" ? "時間過去" : "互動後";
    const metabolismNote = `${sourceLabel}，狗狗牠變了，飽足值 -${satietyLoss}，體力值 +${energyGain}，好感度 -${affectionLoss}`;

    setStatus(metabolismNote);
    updateUI();
  }
  function openPianoMode() {
    pauseMetabolism();
    disableButtons();
    PianoMode.open(() => {
      interact("music");
      resumeMetabolism();
      enableButtons();
    });
  }

  function pauseMetabolism() {
    clearMetabolismTimer(true);
  }

  function resumeMetabolism() {
    if (metabolismStarted) {
      scheduleMetabolismTimer();
    } else {
      scheduleInitialMetabolism();
    }
  }

  function interact(action) {
    if (isGameEnded()) {
      return;
    }

    let delta = 0;
    let customFeedMessage = null;

    if (action === "play" && dogState.energy <= 5) {
      triggerHiddenEnding("exhaustion", "狗狗累暈了！");
      updateUI();
      return;
    }

    if (action === "feed") {
      if (dogState.satiety > 100) {
        overfeedExtraClicks += 1;
      } else {
        overfeedExtraClicks = 0;
      }

      if (overfeedExtraClicks >= 2) {
        triggerHiddenEnding("overeating", "狗狗吃太飽撐死了！");
        updateUI();
        return;
      }

      if (dogState.satiety > 90) { // 如果飢餓大於90，吃東西的好感度
        customFeedMessage = "狗狗很飽了，不要再餵食啦！";
      } else if (dogState.satiety > 70) { // 如果飢餓在70到90之間，吃東西的好感度
        customFeedMessage = "狗狗吃飽了！讓牠休息一下吧。";
      }

      if (dogState.satiety < 30) { // 如果飢餓小於30，吃東西的好感度
        delta = getRandomInt(15, 18);
      } else if (dogState.satiety > 90) { // 如果飢餓大於90，吃東西的好感度
        delta = getRandomInt(0, 3);
      } else if (dogState.satiety > 70) { // 如果飢餓在70到90之間，吃東西的好感度
        delta = getRandomInt(3, 10);
      } else {
        delta = getRandomInt(10, 18);
      }

      dogState.satiety += getRandomInt(5, 23);
    } else {
      overfeedExtraClicks = 0;

      if (action === "play") {
        if (dogState.energy < 25) { // 如果體力小於25，玩耍的好感度
          delta = getRandomInt(-15, -5);
        } else if (dogState.energy < 45) { // 如果體力在25到45之間，玩耍的好感度
          delta = getRandomInt(-13, 5);
        } else {
          const [minDelta, maxDelta] = actionRanges[action] || [0, 0];
          delta = getRandomInt(minDelta, maxDelta);
        }
        dogState.energy -= getRandomInt(10, 25);
      } else {
        const [minDelta, maxDelta] = actionRanges[action] || [0, 0];
        delta = getRandomInt(minDelta, maxDelta);

        if (action === "music") {
          dogState.energy += getRandomInt(0, 5);
        } else if (action === "pet") {
          dogState.energy += getRandomInt(0, 3);
        }
      }
    }

    let statusMessage = getActionMessage(action);
    if (action === "pet" && statusMessage === "狗狗側著頭看你，感覺有點警戒。") {
      delta = getRandomInt(-12, -1);
    }

    dogState.affection = clamp(dogState.affection + delta, 0, 100);

    try {
      if (typeof delta === "number" && delta !== 0) {
        displayAffectionDelta(delta);
      }
    } catch (e) {
      console.error("displayAffectionDelta error:", e);
    }

    updateMood();
    updateUI();

    if (tryHiddenProcessEnding()) {
      return;
    }

    if (action === "play") {
      if (dogState.energy < 25) { // 如果體力值小於25
        statusMessage = "狗狗累了，不是很想一起玩耍呢！";
      } else if (dogState.energy < 45) { // 如果體力值在25到45之間
        statusMessage = "你們一起玩了一下，但狗狗似乎有些累了。";
      } else {
        statusMessage = "你們一起玩了一下，狗狗看起來有點心動。";
      }
    }


    const sign = delta >= 0 ? "+" : "";

    if (action === "feed" && customFeedMessage) {
      statusMessage = customFeedMessage;
    }

    let finalStatus = `${statusMessage}（好感度 ${sign}${delta}）`;

    interactionCount += 1;
    if (interactionCount >= metabolismClickThreshold) {
      applyMetabolismTick("click");
      interactionCount = 0;
      metabolismClickThreshold = getRandomInt(2, 3);
      finalStatus += " 再加上狗狗的消化變化！";
    }

    setStatus(finalStatus);


    updateMood();
    checkEnding();
    updateUI();
  }

  // 在捕捉照片上方顯示浮動的好感度增減文字
  function displayAffectionDelta(delta) {
    const wrap = document.querySelector('.captured-dog-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'affection-delta';
    el.setAttribute('aria-hidden', 'true');
    // 根據正負值套用顏色 class
    if (delta > 0) {
      el.classList.add('positive');
    } else {
      el.classList.add('negative');
    }
    el.textContent = (delta > 0 ? '+' : '') + delta;
    wrap.appendChild(el);
    void el.offsetWidth;
    el.classList.add('animate');
    el.addEventListener('animationend', () => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    setTimeout(() => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
  }

  function updateMood() { // 根據好感度更新狗狗的心情狀態
    if (dogState.affection >= 70) {
      dogState.mood = "happy";
    } else if (dogState.affection < 30) {
      dogState.mood = "angry";
    } else {
      dogState.mood = "normal";
    }
  }

  function checkEnding() { // 結局條件
    if (dogState.affection >= 100) {
      dogState.adopted = true;
      setStatus("狗狗願意跟你回家！");
      disableButtons();
      clearMetabolismTimer();
      showRetryButton();
      
      // 保存狗狗照片到收養系統
      const dogImage = elements.capturedDog?.src;
      if (dogImage) {
        DogAdoptionHouse.addAdoptedDog(dogImage);
      }
      showAdoptionToast();
      try { StatsPanel.incrementEnding('adopted'); } catch (e) {}
    }

    if (dogState.affection <= 0) {
      dogState.bitten = true;
      setStatus("狗狗咬你一口！遊戲結束。");
      disableButtons();
      clearMetabolismTimer();
      showRetryButton();
      try { StatsPanel.incrementEnding('bitten'); } catch (e) {}
    }
  }

  function triggerHiddenEnding(type, message) {
    dogState.hiddenEnding = type;
    setStatus(message);
    disableButtons();
    clearMetabolismTimer();
    showRetryButton();
    try {
      // 依使用者要求分類：
      // - owner -> escaped (會被主人帶走，視為其他隱藏)
      // - overeating / exhaustion -> careless（照顧不周）
      // - 其餘隱藏結局（例如 butterfly） -> hidden
      if (type === 'owner') {
        StatsPanel.incrementEnding('escaped');
      } else if (type === 'overeating' || type === 'exhaustion') {
        StatsPanel.incrementEnding('careless');
      } else {
        StatsPanel.incrementEnding('hidden');
      }
    } catch (e) {}
  }

  function tryHiddenProcessEnding() {
    if (isGameEnded()) {
      return false;
    }

    const roll = Math.random();
    if (roll < 0.001) { // 0.1% 的機率
      triggerHiddenEnding("owner", "狗狗的主人來帶牠回家了！");
      return true;
    }

    if (roll < 0.002) { // 0.1% 的機率
      triggerHiddenEnding("butterfly", "狗狗被附近蝴蝶吸引跑走了！");
      return true;
    }

    return false;
  }


  function updateUI() {   // 更新遊戲介面上的數值和表情
    const clamped = clamp(dogState.affection, 0, 100);
    const clampedSatiety = clamp(dogState.satiety, 0, 100);
    const clampedEnergy = clamp(dogState.energy, 0, 100);


    if (elements.progressFill) {
      elements.progressFill.style.width = `${clamped}%`;


      if (clamped < 40) {
        elements.progressFill.style.background = "#ff6b6b";
      } else {
        elements.progressFill.style.background = "linear-gradient(90deg, #ff9f43 0%, #4fd56f 100%)";
      }
    }


    if (elements.affectionValue) {
      elements.affectionValue.textContent = `${clamped}%`;
    }


    if (elements.satietyFill) {
      elements.satietyFill.style.width = `${clampedSatiety}%`;
      elements.satietyFill.style.background =
        clampedSatiety < 20 ? '#ff6b6b' :
        clampedSatiety < 40 ? '#ff9f43' : '#4fd56f';
    }


    if (elements.energyFill) {
      elements.energyFill.style.width = `${clampedEnergy}%`;
      elements.energyFill.style.background =
        clampedEnergy < 20 ? '#ff6b6b' :
        clampedEnergy < 40 ? '#ff9f43' : '#4fd56f'; 
    }


    if (elements.satietyValue) {
      elements.satietyValue.textContent = `${clampedSatiety}%`;
    }


    if (elements.energyValue) {
      elements.energyValue.textContent = `${clampedEnergy}%`;
    }


    if (elements.dogEmoji) {
      if (dogState.adopted) {
        elements.dogEmoji.textContent = "🥰";
      } else if (dogState.bitten) {
        elements.dogEmoji.textContent = "😡";
      } else if (dogState.mood === "happy") {
        elements.dogEmoji.textContent = "😊";
      } else if (dogState.mood === "angry") {
        elements.dogEmoji.textContent = "😠";
      } else {
        elements.dogEmoji.textContent = "🐶";
      }
    }
  }


  function setStatus(text) {
    if (elements.gameStatus) {
      elements.gameStatus.textContent = text;
    }
  }


  function openGame() {
    if (elements.gameOverlay) {
      elements.gameOverlay.classList.add("is-open");
      elements.gameOverlay.setAttribute("aria-hidden", "false");
    }
  }


  function closeGame() {
    if (elements.gameOverlay) {
      elements.gameOverlay.classList.remove("is-open");
      elements.gameOverlay.setAttribute("aria-hidden", "true");
    }
  }


  function setCapturedDogImage(imageDataURL) {
    if (!elements.capturedDog || !imageDataURL) {
      return;
    }


    elements.capturedDog.src = imageDataURL;
    elements.capturedDog.classList.add("has-image");
  }


  function clearCapturedDogImage() {
    if (!elements.capturedDog) {
      return;
    }


    elements.capturedDog.removeAttribute("src");
    elements.capturedDog.classList.remove("has-image");
  }


  function disableButtons() {
    document.querySelectorAll(".game-btn").forEach((button) => {
      button.disabled = true;
    });
  }


  function enableButtons() {
    document.querySelectorAll(".game-btn").forEach((button) => {
      button.disabled = false;
    });
  }


  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // 顯示「再試一次」按鈕
  function showRetryButton() {
    // 移除已存在的按鈕（如果有的話）
    const existing = document.getElementById('retry-btn-game');
    if (existing) existing.remove();

    // 在遊戲卡片下方創建並插入按鈕
    const gameCard = document.querySelector('.game-card');
    if (!gameCard) return;

    const retryBtn = document.createElement('button');
    retryBtn.id = 'retry-btn-game';
    retryBtn.textContent = '再試一次';
    retryBtn.style.cssText = `
      width: 100%; 
      border: none;
      border-radius: 16px;
      background: #ff8a3d;
      color: #fff;
      font-weight: 700;
      padding: 12px 0;
      cursor: pointer;
      margin-top: 14px;
      transition: all 0.18s ease;
    `;
    retryBtn.onmouseover = () => {
      retryBtn.style.background = '#e97218';
      retryBtn.style.transform = 'translateY(-1px)';
    };
    retryBtn.onmouseout = () => {
      retryBtn.style.background = '#ff8a3d';
      retryBtn.style.transform = 'translateY(0)';
    };
    retryBtn.onclick = handleRetry;

    gameCard.appendChild(retryBtn);
  }

  // 隱藏「再試一次」按鈕
  function hideRetryButton() {
    const retryBtn = document.getElementById('retry-btn-game');
    if (retryBtn) retryBtn.remove();
  }

  // 處理再試一次邏輯
  function handleRetry() {
    resetGame();
  }


  return {
    init,
    resetGame,
    openGame,
    closeGame,
    setCapturedDogImage,
    clearCapturedDogImage,
  };
})();
