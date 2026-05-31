const cameraToggle = document.getElementById("cameraToggle");
const previewBox = document.getElementById("previewBox");
const cameraFeed = document.getElementById("cameraFeed");
const cameraFlipBtn = document.getElementById("cameraFlipBtn");
const resultLabel = document.getElementById("resultLabel");
const resultConfidence = document.getElementById("resultConfidence");
const statusText = document.getElementById("statusText");
const triggerBadge = document.getElementById("triggerBadge");
const gameOverlay = document.getElementById("gameOverlay");
const gameClose = document.getElementById("gameClose");
const pianoOverlay = document.getElementById("pianoOverlay");
const pianoClose = document.getElementById("pianoClose");
const pianoDone = document.getElementById("pianoDone");
const pianoKeys = document.querySelectorAll(".piano-key");
const pianoFeedback = document.getElementById("pianoFeedback");
const progressFill = document.getElementById("progressFill");
const affectionValue = document.getElementById("affectionValue");
const satietyFill = document.getElementById("satietyFill");
const satietyValue = document.getElementById("satietyValue");
const energyFill = document.getElementById("energyFill");
const energyValue = document.getElementById("energyValue");
const gameStatus = document.getElementById("gameStatus");
const dogEmoji = document.getElementById("dogEmoji");
const capturedDog = document.getElementById("capturedDog");
const realDogPhoto = document.getElementById("realDogPhoto");
const adoptionHouseBtn = document.getElementById("adoptionHouseBtn");
const adoptionHouseOverlay = document.getElementById("adoptionHouseOverlay");
const adoptionClose = document.getElementById("adoptionClose");
const adoptedDogsContainer = document.getElementById("adoptedDogsContainer");
const adoptionToast = document.getElementById("adoptionToast");
const adoptionToastMessage = document.getElementById("adoptionToastMessage");
const statsBtn = document.getElementById("statsBtn");
const statsOverlay = document.getElementById("statsOverlay");
const statsClose = document.getElementById("statsClose");
const statsCanvas = document.getElementById("statsCanvas");
const statsCounts = document.getElementById("statsCounts");

let currentStream = null;
let dogDetected = false;
let capturedDogImage = null;
let cameraFacingMode = "user"; // "user" = 前鏡頭，"environment" = 後鏡頭

DogAdoptionHouse.init({
  adoptionHouseOverlay,
  adoptionClose,
  adoptedDogsContainer,
  adoptionPagination: document.getElementById("adoptionPagination"),
});

GameController.init({
  gameOverlay,
  pianoOverlay,
  pianoClose,
  pianoDone,
  pianoKeys,
  pianoFeedback,
  scoreSheetButtons: document.querySelectorAll(".score-sheet-btn"),
  scoreSheetContent: document.getElementById("scoreSheetContent"),
  progressFill,
  affectionValue,
  satietyFill,
  satietyValue,
  energyFill,
  energyValue,
  gameStatus,
  dogEmoji,
  capturedDog,
  realDogPhoto,
  adoptionToast,
  adoptionToastMessage,
});

async function initPage() {
  statusText.textContent = "模型載入中...";

  const loaded = await AIController.loadModel();

  if (loaded) {
    statusText.textContent = "模型已就緒，開啟鏡頭後會自動偵測";
  } else {
    statusText.textContent = `模型載入失敗：${AIController.loadError || '請檢查 Dog 資料夾路徑'}`;
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("此瀏覽器不支援鏡頭功能。");
    return;
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: cameraFacingMode,
      },
      audio: false,
    });

    cameraFeed.srcObject = currentStream;
    await cameraFeed.play();

    previewBox.classList.add("is-active");
    cameraToggle.textContent = "關閉鏡頭";

    if (!AIController.modelReady) {
      statusText.textContent = "模型載入中...";
      const loaded = await AIController.loadModel();

      if (!loaded) {
        statusText.textContent = `模型載入失敗：${AIController.loadError || '請檢查 Dog 資料夾路徑'}`;
        return;
      }
    }

    statusText.textContent = "偵測中...";
    AIController.startPredictionLoop(cameraFeed, handlePredictionResult, 300);
  } catch (error) {
    console.error("無法開啟鏡頭：", error);
    alert("無法取得鏡頭畫面，請確認瀏覽器權限或裝置是否可用。");
  }
}

function stopCamera() {
  AIController.stopPredictionLoop();

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }

  cameraFeed.srcObject = null;
  previewBox.classList.remove("is-active");
  cameraToggle.textContent = "開啟鏡頭";

  resetDetectionState();
}

function handlePredictionResult(result, error) {
  if (error || !result) {
    statusText.textContent = "偵測中斷，請重新開啟鏡頭";
    return;
  }

  setResult(result.label, result.originalLabel, result.confidence, "偵測中");

  if (result.label === "dog" && result.confidence > 0.8) {
    handleDogDetected(result.confidence);
  }
}

function handleDogDetected(confidence) {
  const shouldUpdateImage = !dogDetected || confidence > 0.8;

  if (shouldUpdateImage) {
    dogDetected = true;
    capturedDogImage = captureCurrentVideoFrame();

    if (capturedDogImage) {
      GameController.setCapturedDogImage(capturedDogImage);
    }
  }

  statusText.textContent = `已捕捉狗狗畫面，可開始互動（信心值 ${(confidence * 100).toFixed(2)}%）`;

  // 重點修正 1：只要曾經偵測到狗，互動按鈕就會一直停留。
  triggerBadge.classList.add("is-visible");
}

function setResult(label, originalLabel, confidence, message) {
  resultLabel.textContent = label;
  resultConfidence.textContent = `${(confidence * 100).toFixed(2)}%`;

  if (!dogDetected) {
    statusText.textContent = message;
  }
}

function resetDetectionState() {
  dogDetected = false;
  capturedDogImage = null;

  resultLabel.textContent = "not_dog";
  resultConfidence.textContent = "0%";
  statusText.textContent = currentStream ? "偵測中..." : "等待開啟鏡頭";
  triggerBadge.classList.remove("is-visible");

  GameController.closeGame();
  GameController.resetGame();
  GameController.clearCapturedDogImage();
}

function captureCurrentVideoFrame() {
  if (!cameraFeed || cameraFeed.readyState < 2) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const size = 320;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const videoWidth = cameraFeed.videoWidth;
  const videoHeight = cameraFeed.videoHeight;

  if (!videoWidth || !videoHeight) {
    return null;
  }

  // 這裡是置中裁切成正方形，讓畫面變成虛擬狗頭像。
  const sourceSize = Math.min(videoWidth, videoHeight);
  const sourceX = (videoWidth - sourceSize) / 2;
  const sourceY = (videoHeight - sourceSize) / 2;

  ctx.drawImage(
    cameraFeed,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL("image/png");
}

cameraToggle.addEventListener("click", () => {
  if (currentStream) {
    stopCamera();
  } else {
    startCamera();
  }
});

cameraFlipBtn.addEventListener("click", () => {
  if (currentStream) {
    // 切換鏡頭模式
    cameraFacingMode = cameraFacingMode === "user" ? "environment" : "user";
    // 停止當前相機並重新啟動
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 200);
  }
});

triggerBadge.addEventListener("click", () => {
  if (triggerBadge.classList.contains("is-visible")) {
    GameController.openGame();
  }
});

gameClose.addEventListener("click", () => {
  resetDetectionState();
});

gameOverlay.addEventListener("click", (event) => {
  if (event.target === gameOverlay) {
    resetDetectionState();
  }
});

adoptionHouseBtn.addEventListener("click", () => {
  DogAdoptionHouse.open();
});

// 初始化統計面板（由 game.js 中的 StatsPanel 提供）
try {
  if (typeof StatsPanel !== 'undefined') {
    StatsPanel.init({ statsOverlay, statsClose, statsCanvas, statsCounts, resetStatsBtn: document.getElementById('statsReset') });
  }
} catch (e) { console.error(e); }

statsBtn?.addEventListener('click', () => {
  try { StatsPanel.open(); } catch (e) { console.error(e); }
});

initPage();
initializeBackgroundEmojis();

// 初始化背景裝飾符號
function initializeBackgroundEmojis() {
  const emojis = ["❤️", "🐶", "🦴", "🐾"];
  const container = document.querySelector(".emoji-background");
  if (!container) return;
  // 清空容器（避免重複初始化導致重疊）
  container.innerHTML = "";

  const gridCols = 5;
  const gridRows = 5;
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;
  const emojiGrid = [];

  function pickEmojiForPosition(row, col, rowItems) {
    // 使用加權隨機：若鄰近（上下左右）已有相同圖案，該圖案權重為 0.1；否則為 1
    const isStaggeredRow = row % 2 === 1; // 偶數列視覺右移（row index 1,3）
    const displayedCol = (col + (isStaggeredRow ? 0.5 : 0)) % gridCols;

    // 收集所有鄰近位置的圖案（視覺位置）
    const neighborEmojis = new Set();

    // 同列左側
    if (col > 0) {
      const leftEl = rowItems[col - 1];
      if (leftEl) {
        neighborEmojis.add(leftEl.textContent);
      }
    }

    // 上一列的上下左右鄰近（視覺位置）
    if (row > 0) {
      const prevRow = emojiGrid[row - 1];
      const isPrevStaggered = (row - 1) % 2 === 1;

      for (let j = 0; j < prevRow.length; j++) {
        const prevEl = prevRow[j];
        const prevDisplayed = (j + (isPrevStaggered ? 1 : 0)) % gridCols;
        const delta = (prevDisplayed - displayedCol + gridCols) % gridCols;
        // 若為視覺相鄰（含回繞），加入鄰近集合
        if (delta === 0 || delta === 1 || delta === gridCols - 1) {
          neighborEmojis.add(prevEl.textContent);
        }
      }
    }

    // 初始化每個 emoji 的權重：鄰近出現的為 0.1，否則為 1
    const weights = {};
    emojis.forEach((e) => {
      weights[e] = neighborEmojis.has(e) ? 0.1 : 1;
    });

    // 加權隨機選取
    const entries = Object.entries(weights);
    const sum = entries.reduce((s, [, w]) => s + w, 0);
    if (sum === 0) {
      return emojis[Math.floor(Math.random() * emojis.length)];
    }
    let r = Math.random() * sum;
    for (const [emoji, w] of entries) {
      r -= w;
      if (r <= 0) return emoji;
    }
    return entries[entries.length - 1][0];
  }

  // 建立格線：把每個圖案放在格子中心，避免左右上下重疊
  for (let row = 0; row < gridRows; row++) {
    const rowItems = [];

    for (let col = 0; col < gridCols; col++) {
      const emoji = pickEmojiForPosition(row, col, rowItems);
      const el = document.createElement("div");
      el.className = "emoji-item";
      el.textContent = emoji;
      el.dataset.row = String(row);
      el.dataset.col = String(col); // logical column index
      // 計算顯示欄位並儲存（避免重複宣告）
      const isStaggeredRowDisplay = row % 2 === 1;
      const displayedCol = (col + (isStaggeredRowDisplay ? 0.5 : 0)) % gridCols;
      el.dataset.displayed = String(displayedCol);

      // 顯示位置（格子中心）
      const x = (displayedCol + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;

      el.style.left = x + "%";
      el.style.top = y + "%";
      el.style.transform = `translate(-50%, -50%)`;

      container.appendChild(el);
      rowItems.push(el);
    }

    emojiGrid.push(rowItems);
  }

  function shiftBackgroundRows() {
    // 以映射方式計算下一個欄位，確保同一列內元素一一對應不會發生重複
    emojiGrid.forEach((rowItems, row) => {
      const direction = row % 2 === 0 ? -1 : 1;
      const isStaggeredRow = row % 2 === 1;
      const nextCols = rowItems.map((el) => {
        const currentCol = Number(el.dataset.col);
        return (currentCol + direction + gridCols) % gridCols;
      });

      rowItems.forEach((el, idx) => {
        const nextCol = nextCols[idx];
        el.dataset.col = String(nextCol);
        const displayedNext = (nextCol + (isStaggeredRow ? 0.5 : 0)) % gridCols;
        el.dataset.displayed = String(displayedNext);
        const x = (displayedNext + 0.5) * cellWidth;
        el.style.left = x + "%";
      });
    });
  }

  setInterval(shiftBackgroundRows, 3000);
}

