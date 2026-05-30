const AIController = (() => {
  const modelCandidates = [
    {
      name: "Dog",
      modelURL: "./Dog/model.json",
      metadataURL: "./Dog/metadata.json",
    },
  ];

  const dogLabels = new Set(["狗狗", "dog", "Dog", "小狗", "puppy", "Puppy", "犬", "doggo"]);

  let model = null;
  let modelReady = false;
  let loadedModelName = null;
  let loadError = null;
  let predictionTimer = null;

  async function loadModel() {
    if (modelReady) {
      return true;
    }

    for (const candidate of modelCandidates) {
      try {
        console.log(`嘗試載入模型：${candidate.name}`, candidate.modelURL, candidate.metadataURL);
        model = await tmImage.load(candidate.modelURL, candidate.metadataURL);
        modelReady = true;
        loadedModelName = candidate.name;
        loadError = null;
        console.log(`已成功載入 Teachable Machine 模型：${candidate.name}`);
        return true;
      } catch (error) {
        loadError = `無法載入 ${candidate.name}：${candidate.modelURL} / ${candidate.metadataURL} -> ${error.message || error}`;
        console.warn("無法載入 Teachable Machine 模型（路徑嘗試失敗）：", candidate.name, candidate.modelURL, error);
      }
    }

    const modelNames = modelCandidates.map((candidate) => candidate.name).join(", ");
    loadError = `無法載入 Teachable Machine 模型：未找到可用模型資料夾或檔案。候選項目：${modelNames}`;
    console.error(`無法載入 Teachable Machine 模型：未找到可用模型資料夾或檔案。候選項目：${modelNames}`);
    modelReady = false;
    loadedModelName = null;
    return false;
  }

  async function predict(videoElement) {
    if (!modelReady || !model || !videoElement) {
      return null;
    }

    const predictions = await model.predict(videoElement);
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return null;
    }

    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    const topPrediction = sorted[0];
    if (!topPrediction || typeof topPrediction.className !== "string") {
      return null;
    }

    const normalizedLabel = isDogLabel(topPrediction.className) ? "dog" : "not_dog";

    return {
      label: normalizedLabel,
      originalLabel: topPrediction.className,
      confidence: topPrediction.probability,
      predictions,
    };
  }

  function isDogLabel(label) {
    if (!label || typeof label !== "string") {
      return false;
    }

    const normalized = label.trim().toLowerCase();
    return (
      dogLabels.has(label) ||
      dogLabels.has(normalized) ||
      /dog|狗|puppy|犬|doggo/.test(normalized)
    );
  }

  function startPredictionLoop(videoElement, onResult, interval = 300) {
    stopPredictionLoop();

    async function loop() {
      try {
        const result = await predict(videoElement);
        if (result && typeof onResult === "function") {
          onResult(result);
        }
      } catch (error) {
        console.error("偵測失敗：", error);
        if (typeof onResult === "function") {
          onResult(null, error);
        }
      }

      predictionTimer = window.setTimeout(loop, interval);
    }

    loop();
  }

  function stopPredictionLoop() {
    if (predictionTimer) {
      clearTimeout(predictionTimer);
      predictionTimer = null;
    }
  }

  return {
    loadModel,
    startPredictionLoop,
    stopPredictionLoop,
    get modelReady() {
      return modelReady;
    },
    get loadedModelName() {
      return loadedModelName;
    },
    get loadError() {
      return loadError;
    },
  };
})();
