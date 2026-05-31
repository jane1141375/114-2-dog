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

  function addAdoptedDog(imageDataURL, virtualImageURL = "") {
    if (!imageDataURL) return;

    const adoptedDogs = getAdoptedDogs();
    // 使用不含年份的本地化時間（例如：5/29 15:30 或 上午/下午 樣式），以免顯示年分
    const timestamp = new Date().toLocaleString("zh-TW", { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    adoptedDogs.push({
      image: imageDataURL,
      virtualImage: virtualImageURL,
      mood: typeof virtualImageURL === "string" ? virtualImageURL : "",
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

  function getMoodEmojiFromDog(dog) {
    const raw = `${dog.mood || ""} ${dog.virtualImage || ""}`.toLowerCase();

    if (raw.includes("trust")) return "🥰";
    if (raw.includes("happy")) return "😊";
    if (raw.includes("angry")) return "😡";
    if (raw.includes("alert")) return "⚠️";
    if (raw.includes("bored")) return "😑";
    if (raw.includes("tired")) return "😪";
    if (raw.includes("full")) return "😵‍💫";
    if (raw.includes("curious")) return "🤔";

    return "🐶";
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
        <div class="adopted-dog-photo-wrap">
          <img src="${dog.image}" alt="已收養的狗狗 ${startIndex + index + 1}" class="adopted-dog-image real" />
          <div class="adopted-dog-mood-badge" aria-hidden="true">${getMoodEmojiFromDog(dog)}</div>
        </div>

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
        confirmAbandonDog(id);
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


  async function confirmAbandonDog(id) {
    const firstConfirm = await showAbandonConfirm("你真的要把牠送走嗎？牠已經記得你的味道，也以為這裡就是牠的家了。");
    if (!firstConfirm) return;

    const secondConfirm = await showAbandonConfirm("牠還是很愛你。就算你按下確認，牠也不會知道自己做錯了什麼。你真的要拋棄牠嗎？");
    if (!secondConfirm) return;

    const finalConfirm = await showAbandonConfirm("最後一次確認。牠會安靜地從家裡消失，只留下這張照片。");
    if (!finalConfirm) return;

    deleteAdoptedDog(id);
    renderDogs();
  }

  function showAbandonConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "abandon-confirm-overlay";
      modal.innerHTML = `
        <div class="abandon-confirm-card" role="dialog" aria-modal="true">
          <p>${message}</p>
          <div class="abandon-confirm-actions">
            <button type="button" class="abandon-no">否</button>
            <button type="button" class="abandon-yes">是</button>
          </div>
        </div>
      `;

      function close(value) {
        modal.remove();
        resolve(value);
      }

      modal.querySelector(".abandon-no")?.addEventListener("click", () => close(false));
      modal.querySelector(".abandon-yes")?.addEventListener("click", () => close(true));
      modal.addEventListener("click", (event) => {
        if (event.target === modal) close(false);
      });

      document.body.appendChild(modal);
    });
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
  const STORAGE_KEY = "gameRecords";
  let overlay = null;
  let closeBtn = null;
  let countsContainer = null;
  let resetBtn = null;

  const resultText = {
    adopted: "成功把狗狗帶回家",
    bitten: "失敗：被狗狗咬了一口",
    escaped: "隱藏：狗狗跑走了",
    owner: "隱藏：主人把狗狗帶走了",
    overeating: "照顧不周：狗狗吃太飽",
    exhaustion: "照顧不周：狗狗累壞了",
    hidden: "其他隱藏結局",
  };

  function init(dom) {
    overlay = dom.statsOverlay;
    closeBtn = dom.statsClose;
    countsContainer = dom.statsCounts;
    resetBtn = dom.resetStatsBtn;

    if (!overlay) return;

    closeBtn?.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    resetBtn?.addEventListener("click", () => {
      if (window.confirm("確定要清空所有遊玩紀錄嗎？")) {
        localStorage.removeItem(STORAGE_KEY);
        render();
      }
    });

    render();
  }

  function open() {
    if (!overlay) return;
    render();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function getRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error("讀取遊玩紀錄失敗", error);
      return [];
    }
  }

  function addRecord(type, detail = "") {
    const records = getRecords();
    const timestamp = new Date().toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    records.unshift({
      id: Date.now(),
      type,
      title: resultText[type] || resultText.hidden,
      detail,
      timestamp,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 60)));
    render();
  }

  // 保留舊名稱，避免其他程式呼叫時壞掉
  function incrementEnding(type) {
    addRecord(type);
  }

  function getCounts() {
    return getRecords().reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {});
  }

  function render() {
    if (!countsContainer) return;

    const records = getRecords();

    if (records.length === 0) {
      countsContainer.innerHTML = `<p class="empty-message">目前還沒有遊玩紀錄。</p>`;
      return;
    }

    countsContainer.innerHTML = `
      <ol class="play-record-list">
        ${records.map((record) => `
          <li class="play-record-item ${record.type}">
            <span class="record-time">${record.timestamp}</span>
            <strong>${record.title}</strong>
            ${record.detail ? `<p>${record.detail}</p>` : ""}
          </li>
        `).join("")}
      </ol>
    `;
  }

  return { init, open, close, incrementEnding, addRecord, getCounts };
})();

const GameController = (() => {
  const DOG_STATE_IMAGES = {
    curious: "assets/dogs/curious.png",
    alert: "assets/dogs/alert.png",
    angry: "assets/dogs/angry.png",
    bored: "assets/dogs/bored.png",
    happy: "assets/dogs/happy.png",
    trust: "assets/dogs/trust.png",
    tired: "assets/dogs/tired.png",
    full: "assets/dogs/full.png",
  };

  const DOG_MOOD_EMOJIS = {
    curious: "🤔",
    alert: "⚠️",
    angry: "😡",
    bored: "😑",
    happy: "😊",
    trust: "🥰",
    tired: "😪",
    full: "😵‍💫",
  };

  const DOG_STATES = {
    curious: {
      label: "好奇的小狗",
      best: ["music", "play"],
      deltas: { feed: 8, music: 12, pet: 6, play: 15 },
      satiety: { feed: 25, music: -3, pet: -2, play: -5 },
      energy: { feed: 0, music: 2, pet: 2, play: -20 },
      next: { feed: "curious", music: "happy", pet: "curious", play: "happy" },
      messages: {
        feed: "狗狗聞了聞食物，還在觀察你。",
        music: "狗狗歪頭聽了一下，好像有點感興趣。",
        pet: "狗狗讓你靠近一點，但還沒有完全放鬆。",
        play: "狗狗被你逗起興趣，開始想靠近你。",
      },
    },
    alert: {
      label: "警戒狀態的小狗",
      best: ["feed"],
      deltas: { feed: 15, music: -12, pet: -18, play: -10 },
      satiety: { feed: 25, music: -1, pet: -1, play: -3 },
      energy: { feed: 0, music: -2, pet: 0, play: -15 },
      next: { feed: "curious", music: "angry", pet: "angry", play: "angry" },
      messages: {
        feed: "狗狗保持距離吃了一點，警戒感下降。",
        music: "狗狗覺得你很吵，牠開始生氣了。",
        pet: "狗狗還不信任你，突然伸手讓牠更緊張。",
        play: "狗狗還沒準備好玩，牠被你嚇到了。",
      },
    },
    angry: {
      label: "凶狠的小狗",
      best: ["feed"],
      deltas: { feed: 12, music: -18, pet: -30, play: -20 },
      satiety: { feed: 25, music: -1, pet: -1, play: -3 },
      energy: { feed: 0, music: -3, pet: -5, play: -15 },
      next: { feed: "alert", music: "angry", pet: "angry", play: "angry" },
      messages: {
        feed: "狗狗雖然生氣，但食物讓牠稍微冷靜。",
        music: "狗狗被吵得更不爽了。",
        pet: "狗狗不想被碰，你硬摸讓牠非常生氣。",
        play: "狗狗現在不想玩，牠覺得你很煩。",
      },
    },
    bored: {
      label: "無聊趴下的小狗",
      best: ["play"],
      deltas: { feed: 4, music: -8, pet: 3, play: 25 },
      satiety: { feed: 25, music: -2, pet: -2, play: -5 },
      energy: { feed: 0, music: 0, pet: 1, play: -25 },
      next: { feed: "bored", music: "bored", pet: "curious", play: "happy" },
      messages: {
        feed: "狗狗吃了一點，但牠其實不是想吃東西。",
        music: "狗狗覺得難聽，牠更無聊了。",
        pet: "狗狗被你摸了一下，但反應不大。",
        play: "狗狗終於有事做了，牠看起來開心很多。",
      },
    },
    happy: {
      label: "開心的小狗",
      best: ["pet", "play"],
      deltas: { feed: 6, music: 10, pet: 18, play: 18 },
      satiety: { feed: 25, music: -3, pet: -2, play: -5 },
      energy: { feed: 0, music: 2, pet: 3, play: -22 },
      next: { feed: "happy", music: "happy", pet: "trust", play: "happy" },
      messages: {
        feed: "狗狗心情很好，所以也接受了你的食物。",
        music: "狗狗跟著節奏晃尾巴。",
        pet: "狗狗很喜歡你的摸摸。",
        play: "狗狗玩得很開心，但也消耗了不少體力。",
      },
    },
    trust: {
      label: "信任而露出肚皮的小狗",
      best: ["pet"],
      deltas: { feed: 5, music: 8, pet: 25, play: 8 },
      satiety: { feed: 20, music: -2, pet: -2, play: -4 },
      energy: { feed: 0, music: 3, pet: 4, play: -18 },
      next: { feed: "happy", music: "trust", pet: "trust", play: "happy" },
      messages: {
        feed: "狗狗已經很信任你，食物只是小小加分。",
        music: "狗狗覺得很放鬆。",
        pet: "狗狗完全信任你，摸摸讓牠非常開心。",
        play: "狗狗願意跟你玩，但現在牠更想被溫柔對待。",
      },
    },
    tired: {
      label: "疲累的小狗",
      best: ["pet", "music"],
      deltas: { feed: 5, music: 8, pet: 12, play: -25 },
      satiety: { feed: 20, music: -2, pet: -2, play: -2 },
      energy: { feed: 5, music: 6, pet: 6, play: -25 },
      next: { feed: "tired", music: "curious", pet: "curious", play: "tired" },
      messages: {
        feed: "狗狗吃了一點，稍微恢復精神。",
        music: "狗狗被音樂安撫了，慢慢恢復體力。",
        pet: "溫柔摸摸讓狗狗休息了一下。",
        play: "狗狗已經很累了，你還逼牠玩，牠快撐不住了。",
      },
    },
    full: {
      label: "吃超飽的小狗",
      best: ["music", "pet"],
      deltas: { feed: -25, music: 8, pet: 6, play: -15 },
      satiety: { feed: 20, music: -6, pet: -4, play: -6 },
      energy: { feed: -5, music: 2, pet: 3, play: -20 },
      next: { feed: "full", music: "tired", pet: "tired", play: "tired" },
      messages: {
        feed: "狗狗已經很飽了，你還繼續餵，牠很不舒服。",
        music: "狗狗躺著聽音樂消化。",
        pet: "狗狗吃飽後被輕輕摸摸，放鬆了一點。",
        play: "狗狗吃太飽了，現在玩耍讓牠很不舒服。",
      },
    },
  };

  const actionNames = {
    feed: "餵食",
    music: "聽歌",
    pet: "摸摸",
    play: "玩耍",
  };

  let elements = {};
  let dogState = {};
  let capturedRealDogImage = null;
  let toastTimerId = null;


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
    let scheduledIds = [];
    let activeOscillators = [];
    let playedNoteCount = 0;
    let musicTotalDelta = 0;
    let phraseBonusCount = 0;

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

    const noteFreqs = {
      C: 261.6,
      D: 293.7,
      E: 329.6,
      F: 349.2,
      G: 392.0,
      A: 440.0,
      B: 493.9,
    };

    const keyboardMap = {
      a: "C", s: "D", d: "E", f: "F", g: "G", h: "A", j: "B",
      A: "C", S: "D", D: "E", F: "F", G: "G", H: "A", J: "B",
    };

    function init(domElements) {
      overlay = domElements.pianoOverlay;
      closeBtn = domElements.pianoClose;
      doneBtn = domElements.pianoDone;
      keys = domElements.pianoKeys;
      feedback = domElements.pianoFeedback;
      scoreSheetButtons = domElements.scoreSheetButtons;
      scoreSheetContent = domElements.scoreSheetContent;

      if (!overlay) return;

      closeBtn?.addEventListener("click", closeWithoutReward);
      doneBtn?.addEventListener("click", completeAndClose);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeWithoutReward();
      });

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
          triggerVisualEffect(key.dataset.note);
        });
      });
    }

    function open(onExit) {
      exitCallback = null;
      playedNoteCount = 0;
      musicTotalDelta = 0;
      phraseBonusCount = 0;

      if (!overlay) {
        return;
      }

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      updateMusicFeedback();
      window.addEventListener("keydown", handleKeyDown);
    }

    function closeWithoutReward() {
      stopAllPlayback();
      overlay?.classList.remove("is-open");
      overlay?.setAttribute("aria-hidden", "true");
      updateFeedback("開始彈奏一段輕快的旋律吧！");
      window.removeEventListener("keydown", handleKeyDown);
      playedNoteCount = 0;
      exitCallback = null;
    }

    function completeAndClose() {
      stopAllPlayback();
      overlay?.classList.remove("is-open");
      overlay?.setAttribute("aria-hidden", "true");
      window.removeEventListener("keydown", handleKeyDown);

      if (playedNoteCount === 0) {
        updateFeedback("你沒有彈任何音符，狗狗沒有反應。");
      }

      playedNoteCount = 0;
      musicTotalDelta = 0;
      phraseBonusCount = 0;
      exitCallback = null;
    }

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

    function triggerVisualEffect(note) {
      if (!overlay || !note) return;
      const activeKey = overlay.querySelector(`[data-note="${note}"]`);
      if (activeKey) {
        activeKey.classList.add("active");
        setTimeout(() => activeKey.classList.remove("active"), 120);
      }
    }

    function handleKeyPress(note) {
      playedNoteCount += 1;
      playOscillator(note);

      const current = DOG_STATES[dogState.visualState] || DOG_STATES.curious;
      const baseDelta = current.deltas?.music ?? 0;
      let noteDelta = 0;

      if (baseDelta > 0) noteDelta = 1;
      if (baseDelta < 0) noteDelta = -1;

      // 彈滿一段旋律時給 bonus；如果狗狗本來就不喜歡音樂，bonus 也會是負面的。
      let bonusDelta = 0;
      const currentPhrase = Math.floor(playedNoteCount / 8);
      if (playedNoteCount > 0 && playedNoteCount % 8 === 0 && currentPhrase > phraseBonusCount) {
        phraseBonusCount = currentPhrase;
        bonusDelta = baseDelta > 0 ? 5 : baseDelta < 0 ? -5 : 0;
      }

      const totalDelta = noteDelta + bonusDelta;
      dogState.affection = clamp((dogState.affection || 0) + totalDelta, 0, 100);
      musicTotalDelta += totalDelta;

      if (bonusDelta !== 0) {
        updateVisualStateAfterAction("music", totalDelta);
      }

      updateUI();
      playActionAnimation("music");
      updateMusicFeedback(note, noteDelta, bonusDelta);

      if (checkEnding()) {
        updateUI();
        completeAndClose();
      }
    }

    function updateMusicFeedback(note = "", noteDelta = 0, bonusDelta = 0) {
      const current = DOG_STATES[dogState.visualState] || DOG_STATES.curious;
      const reaction = current.messages?.music || "狗狗正在聽你演奏。";
      const noteSign = noteDelta > 0 ? "+" : "";
      const bonusText = bonusDelta !== 0 ? `｜旋律 bonus：${bonusDelta > 0 ? "+" : ""}${bonusDelta}` : "";
      const totalSign = musicTotalDelta > 0 ? "+" : "";

      if (!note) {
        updateFeedback("點琴鍵或按 A S D F G H J。\n彈音符才會影響好感度，彈滿 8 個音符會結算一段旋律 bonus。");
        return;
      }

      updateFeedback(`你彈了 ${note}：好感度 ${noteSign}${noteDelta}${bonusText}\n本次音樂合計：${totalSign}${musicTotalDelta}\n${reaction}`);
    }

    function showScoreNotation(song) {
      if (!scoreSheetContent) return;
      scoreSheetContent.textContent = scoreNotations[song] || "目前尚無簡譜資料。";
      const songName = song === "mary" ? "瑪莉有隻小綿羊" : song === "twinkle" ? "小星星" : "小蜜蜂";
      updateFeedback(`已顯示 ${songName}。\n照著彈，滿 8 個音符會有一段旋律 bonus。`);
    }

    function playOscillator(note) {
      const freq = noteFreqs[note];
      if (!freq) return;

      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      activeOscillators.push({ osc, gain });
      osc.onended = () => {
        const index = activeOscillators.findIndex((item) => item.osc === osc);
        if (index !== -1) activeOscillators.splice(index, 1);
      };

      osc.start(now);
      osc.stop(now + 0.38);
    }

    function playQuickRiff() {
      const riff = ["G", "E", "E", null, "F", "D", "D", null, "C", "D", "E", "F", "G", "G", "G"];
      clearScheduled();

      riff.forEach((note, index) => {
        const id = setTimeout(() => {
          if (note) {
            handleKeyPress(note);
            triggerVisualEffect(note);
          } else if (overlay) {
            overlay.querySelectorAll(".piano-key").forEach((key) => key.classList.remove("active"));
          }
        }, index * 280);
        scheduledIds.push(id);
      });

      updateFeedback("你按下空白鍵，狗狗聽到一小段旋律。");
    }

    function clearScheduled() {
      scheduledIds.forEach((id) => clearTimeout(id));
      scheduledIds = [];
    }

    function stopAllPlayback() {
      clearScheduled();

      activeOscillators.forEach(({ osc, gain }) => {
        try { osc.stop?.(0); } catch (error) {}
        try { osc.disconnect?.(); } catch (error) {}
        try { gain.disconnect?.(); } catch (error) {}
      });
      activeOscillators = [];

      overlay?.querySelectorAll(".piano-key").forEach((key) => key.classList.remove("active"));
    }

    function updateFeedback(text) {
      if (feedback) feedback.textContent = text;
    }

    return { init, open };
  })();

  function init(domElements) {
    elements = domElements;
    PianoMode.init(domElements);
    bindActionButtons();
    resetGame();
  }

  function resetGame() {
    dogState = {
      affection: getRandomInt(20, 35),
      satiety: getRandomInt(35, 55),
      energy: getRandomInt(65, 90),
      visualState: pickInitialVisualState(),
      adopted: false,
      failed: false,
      endingType: null,
    };

    setGameCardMode("playing");
    hideEndPanel();
    enableButtons();
    hideAdoptionToast();
    setStatus("觀察小狗的狀態，再選擇下一步互動。");
    updateUI();
  }

  function bindActionButtons() {
    document.querySelectorAll(".game-btn").forEach((button) => {
      button.addEventListener("click", () => interact(button.dataset.action));
    });
  }

  function pickInitialVisualState() {
    const pool = ["curious", "alert", "bored", "tired"];
    return pool[getRandomInt(0, pool.length - 1)];
  }

  function interact(action) {
    if (isGameEnded()) return;

    if (action === "music") {
      PianoMode.open();
      return;
    }

    applyActionEffect(action);
  }

  function applyActionEffect(action) {
    if (isGameEnded()) return;

    const current = DOG_STATES[dogState.visualState] || DOG_STATES.curious;
    const delta = current.deltas[action] ?? 0;
    const satietyDelta = current.satiety[action] ?? 0;
    const energyDelta = current.energy[action] ?? 0;

    dogState.affection = clamp(dogState.affection + delta, 0, 100);
    dogState.satiety = clamp(dogState.satiety + satietyDelta, 0, 120);
    dogState.energy = clamp(dogState.energy + energyDelta, 0, 100);

    setStatus(current.messages?.[action] || "小狗有了新的反應。");
    playActionAnimation(action);

    if (checkEnding()) {
      updateUI();
      return;
    }

    updateVisualStateAfterAction(action, delta);
    updateUI();
  }

  function playActionAnimation(action) {
    const stage = document.querySelector(".dog-visual-stack");
    if (!stage) return;

    stage.querySelectorAll(".action-animation").forEach((el) => el.remove());

    const layer = document.createElement("div");
    layer.className = `action-animation ${action}-animation`;

    const animationMap = {
      feed: `
        <span class="food food-1">🍖</span>
        <span class="food food-2">🍗</span>
        <span class="food food-3">🦴</span>
      `,
      music: `
        <span class="note note-1">♪</span>
        <span class="note note-2">♫</span>
        <span class="note note-3">♬</span>
      `,
      pet: `
        <span class="pet-hand">🤚</span>
        <span class="pet-spark pet-spark-1">♡</span>
        <span class="pet-spark pet-spark-2">♡</span>
      `,
      play: `
        <span class="play-ball">🥎</span>
        <span class="play-line play-line-1"></span>
        <span class="play-line play-line-2"></span>
      `,
    };

    layer.innerHTML = animationMap[action] || `<span class="reaction-pop">✨</span>`;
    stage.appendChild(layer);

    window.setTimeout(() => {
      layer.remove();
    }, 1300);
  }

  function updateVisualStateAfterAction(action, delta) {
    const current = DOG_STATES[dogState.visualState] || DOG_STATES.curious;

    if (dogState.satiety >= 88) {
      dogState.visualState = "full";
      return;
    }

    if (dogState.energy <= 20) {
      dogState.visualState = "tired";
      return;
    }

    if (dogState.affection >= 88) {
      dogState.visualState = "trust";
      return;
    }

    if (dogState.affection <= 15) {
      dogState.visualState = "angry";
      return;
    }

    if (current.next && current.next[action]) {
      dogState.visualState = current.next[action];
      return;
    }

    dogState.visualState = delta >= 10 ? "happy" : delta < 0 ? "alert" : "curious";
  }

  function checkEnding() {
    if (dogState.affection >= 100) {
      endGame("adopted", "狗狗願意跟你回家！", "你成功讀懂牠的狀態，牠決定跟你回家。", false);
      return true;
    }

    if (dogState.affection <= 0) {
      endGame("bitten", "狗狗咬你一口！", "牠已經太不安了。這輪結束，必須重新偵測新的狗狗。", true);
      return true;
    }

    if (dogState.satiety >= 115) {
      endGame("overeating", "狗狗吃太飽了！", "牠撐到不想理你。這輪結束，必須重新偵測新的狗狗。", true);
      return true;
    }

    if (dogState.energy <= 0) {
      endGame("exhaustion", "狗狗累壞了！", "牠累到趴下不想動了。這輪結束，必須重新偵測新的狗狗。", true);
      return true;
    }

    return false;
  }

  function endGame(type, title, detail, isFailure) {
    dogState.endingType = type;
    dogState.adopted = type === "adopted";
    dogState.failed = !dogState.adopted;

    disableButtons();
    setGameCardMode(isFailure ? "failed" : "success");
    setStatus(title);

    if (type === "adopted") {
      const dogImage = capturedRealDogImage || elements.capturedDog?.src;
      if (dogImage) DogAdoptionHouse.addAdoptedDog(dogImage, DOG_STATE_IMAGES[dogState.visualState] || DOG_STATE_IMAGES.trust);
      showAdoptionToast();
    }

    try {
      StatsPanel.addRecord(type, detail);
    } catch (error) {
      try { StatsPanel.incrementEnding(type); } catch (e) {}
    }

    showEndPanel(type, title, detail);
  }

  function showEndPanel(type, title, detail) {
    const card = document.querySelector("#gameOverlay .game-card");
    if (!card) return;

    hideEndPanel();

    const panel = document.createElement("div");
    panel.id = "gameEndPanel";
    panel.className = `game-end-panel ${type === "adopted" ? "success" : "failed"}`;

    if (type === "adopted") {
      panel.innerHTML = `
        <h3>🏠 把小狗帶回家</h3>
        <p>${detail}</p>
        <button id="goHomeBtn" class="home-check-btn" type="button">回家看看</button>
      `;
    } else {
      panel.innerHTML = `
        <h3>這輪結束了</h3>
        <p>${detail}</p>
        <p class="small-note">請關閉視窗，重新讓系統偵測狗狗後才能開始下一輪。</p>
      `;
    }

    card.appendChild(panel);

    document.getElementById("goHomeBtn")?.addEventListener("click", () => {
      try { DogAdoptionHouse.open(); } catch (error) { console.error(error); }
    });
  }

  function hideEndPanel() {
    document.getElementById("gameEndPanel")?.remove();
  }

  function setGameCardMode(mode) {
    const card = document.querySelector("#gameOverlay .game-card");
    if (!card) return;
    card.classList.remove("is-failed", "is-success", "is-playing");
    card.classList.add(`is-${mode}`);
  }

  function isGameEnded() {
    return Boolean(dogState.endingType);
  }

  function updateUI() {
    const clampedAffection = clamp(dogState.affection, 0, 100);
    const clampedSatiety = clamp(dogState.satiety, 0, 100);
    const clampedEnergy = clamp(dogState.energy, 0, 100);
    const stateConfig = DOG_STATES[dogState.visualState] || DOG_STATES.curious;

    updateBar(elements.progressFill, clampedAffection, clampedAffection < 40 ? "#ff6b6b" : "linear-gradient(90deg, #ff9f43 0%, #4fd56f 100%)");
    updateBar(elements.satietyFill, clampedSatiety, clampedSatiety > 90 ? "#ff6b6b" : clampedSatiety < 25 ? "#ff9f43" : "#4fd56f");
    updateBar(elements.energyFill, clampedEnergy, clampedEnergy < 25 ? "#ff6b6b" : clampedEnergy < 45 ? "#ff9f43" : "#4fd56f");

    if (elements.affectionValue) elements.affectionValue.textContent = `${clampedAffection}%`;
    if (elements.satietyValue) elements.satietyValue.textContent = `${clampedSatiety}%`;
    if (elements.energyValue) elements.energyValue.textContent = `${clampedEnergy}%`;

    if (elements.realDogPhoto && capturedRealDogImage) {
      elements.realDogPhoto.src = capturedRealDogImage;
      elements.realDogPhoto.classList.add("has-image");
    }

    if (elements.capturedDog) {
      elements.capturedDog.removeAttribute("src");
      elements.capturedDog.classList.remove("has-image", "state-dog-image");
      elements.capturedDog.alt = "";
    }

    if (elements.dogEmoji) {
      elements.dogEmoji.textContent = dogState.adopted ? "🥰" : dogState.failed ? "😵" : (DOG_MOOD_EMOJIS[dogState.visualState] || "🐶");
      elements.dogEmoji.setAttribute("title", stateConfig.label);
    }

    updateStateHint(stateConfig);
  }

  function updateStateHint(stateConfig) {
    const card = document.querySelector("#gameOverlay .game-card");
    if (!card) return;

    let hint = document.getElementById("dogStateHint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "dogStateHint";
      hint.className = "dog-state-hint";
      const wrap = card.querySelector(".dog-visual-stack");
      wrap?.insertAdjacentElement("afterend", hint);
    }

    hint.innerHTML = `
      <strong>${stateConfig.label}</strong>
      <span>觀察牠的表情，選擇下一步互動。</span>
    `;
  }

  function updateBar(el, value, background) {
    if (!el) return;
    el.style.width = `${clamp(value, 0, 100)}%`;
    el.style.background = background;
  }

  function setCapturedDogImage(imageDataURL) {
    capturedRealDogImage = imageDataURL || capturedRealDogImage;
    updateUI();
  }

  function clearCapturedDogImage() {
    capturedRealDogImage = null;
    if (elements.realDogPhoto) {
      elements.realDogPhoto.removeAttribute("src");
      elements.realDogPhoto.classList.remove("has-image");
    }

    if (elements.capturedDog) {
      elements.capturedDog.removeAttribute("src");
      elements.capturedDog.classList.remove("has-image", "state-dog-image");
    }
  }

  function openGame() {
    elements.gameOverlay?.classList.add("is-open");
    elements.gameOverlay?.setAttribute("aria-hidden", "false");
  }

  function closeGame() {
    elements.gameOverlay?.classList.remove("is-open");
    elements.gameOverlay?.setAttribute("aria-hidden", "true");
  }

  function setStatus(text) {
    if (elements.gameStatus) elements.gameStatus.textContent = text;
  }

  function displayAffectionDelta(delta) {
    const wrap = document.querySelector(".dog-visual-stack");
    if (!wrap || delta === 0) return;

    const el = document.createElement("div");
    el.className = `affection-delta ${delta > 0 ? "positive" : "negative"}`;
    el.textContent = `${delta > 0 ? "+" : ""}${delta}`;
    wrap.appendChild(el);
    void el.offsetWidth;
    el.classList.add("animate");
    setTimeout(() => el.remove(), 1200);
  }

  function showAdoptionToast() {
    if (!elements.adoptionToast) return;
    if (elements.adoptionToastMessage) {
      elements.adoptionToastMessage.textContent = "恭喜！狗狗已加入收養紀錄";
    }
    elements.adoptionToast.classList.add("visible");
    clearTimeout(toastTimerId);
    toastTimerId = setTimeout(hideAdoptionToast, 2400);
  }

  function hideAdoptionToast() {
    clearTimeout(toastTimerId);
    elements.adoptionToast?.classList.remove("visible");
  }

  function disableButtons() {
    document.querySelectorAll(".game-btn").forEach((button) => button.disabled = true);
  }

  function enableButtons() {
    document.querySelectorAll(".game-btn").forEach((button) => button.disabled = false);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
