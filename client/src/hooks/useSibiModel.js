import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";

const DEFAULT_LABELS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

export const useSibiModel = (options = {}) => {
  const {
    modelPath = "/model/model.json",
    labelsPath = "/model/labels.json",
    imgSize = 150,
    defaultChannelMode = "grayscale", // "grayscale" (1 channel) atau "rgb" (3 channel)
    confidenceThreshold = 70,
    holdDurationMs = 1500,
  } = options;

  const [model, setModel] = useState(null);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [channelMode, setChannelMode] = useState(defaultChannelMode); // "rgb" | "grayscale"
  const [activeImgSize, setActiveImgSize] = useState(imgSize);
  const [useRoiCrop, setUseRoiCrop] = useState(true);

  // Telemetri Real-Time
  const [telemetry, setTelemetry] = useState({
    fps: 0,
    latencyMs: 0,
    confidence: 0,
    predictedLetter: "-",
    isHolding: false,
    holdProgress: 0, // 0 sampai 1
    isLocked: false,
  });

  // State untuk kontrol simulasi
  const [simulatedLetter, setSimulatedLetter] = useState("A");

  // Buffer temporal smoothing
  const frameHistoryRef = useRef([]);
  const holdStartTimeRef = useRef(null);
  const lastActiveLetterRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsWindowRef = useRef(performance.now());

  // Muat model dan labels
  useEffect(() => {
    let isMounted = true;

    const initModel = async () => {
      setIsLoading(true);
      try {
        // 1. Muat labels.json
        try {
          const labelsRes = await fetch(labelsPath);
          if (labelsRes.ok) {
            const labelsData = await labelsRes.json();
            if (Array.isArray(labelsData) && labelsData.length > 0 && isMounted) {
              setLabels(labelsData);
            }
          }
        } catch {
          // Tetap gunakan DEFAULT_LABELS
        }

        // 2. Cek ketersediaan model.json
        const headCheck = await fetch(modelPath, { method: "HEAD" }).catch(() => null);
        if (!headCheck || !headCheck.ok) {
          console.info("[AJIN TFJS] File model.json belum ditemukan di /public/model/. Mengaktifkan Mode Simulasi Interaktif.");
          if (isMounted) {
            setIsSimulationMode(true);
            setIsLoading(false);
          }
          return;
        }

        // 3. Muat model via tfjs
        await tf.ready();
        let loadedModel = null;
        try {
          // Coba loadLayersModel terlebih dahulu untuk Keras Sequential layers-model
          loadedModel = await tf.loadLayersModel(modelPath);
        } catch (layerErr) {
          console.info("[AJIN TFJS] loadLayersModel dialihkan ke loadGraphModel:", layerErr.message);
          try {
            loadedModel = await tf.loadGraphModel(modelPath);
          } catch (graphErr) {
            throw new Error(`Gagal memuat model: ${graphErr.message}`);
          }
        }

        // 4. Deteksi resolusi input dan channel dari arsitektur model
        let detectedSize = imgSize;
        let detectedChannels = defaultChannelMode === "grayscale" ? 1 : 3;

        if (loadedModel && loadedModel.inputs && loadedModel.inputs[0] && Array.isArray(loadedModel.inputs[0].shape)) {
          const inShape = loadedModel.inputs[0].shape; // contoh: [null, 150, 150, 1]
          if (inShape.length === 4) {
            if (inShape[1] && inShape[1] > 0) detectedSize = inShape[1];
            if (inShape[3] === 1) {
              detectedChannels = 1;
              if (isMounted) setChannelMode("grayscale");
            } else if (inShape[3] === 3) {
              detectedChannels = 3;
              if (isMounted) setChannelMode("rgb");
            }
          }
        }

        if (isMounted) {
          setActiveImgSize(detectedSize);
        }

        // 5. GPU warm-up
        if (loadedModel) {
          tf.tidy(() => {
            const dummy = tf.zeros([1, detectedSize, detectedSize, detectedChannels]);
            loadedModel.predict(dummy);
          });

          if (isMounted) {
            setModel(loadedModel);
            setIsSimulationMode(false);
            console.log(`[AJIN TFJS] Model berhasil dimuat: ${detectedSize}x${detectedSize}, ${detectedChannels} channel, WebGL siap.`);
          }
        }
      } catch (err) {
        console.warn("[AJIN TFJS] Inisialisasi model beralih ke Mode Simulasi:", err.message);
        if (isMounted) {
          setIsSimulationMode(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initModel();

    return () => {
      isMounted = false;
    };
  }, [modelPath, labelsPath, imgSize, defaultChannelMode]);

  // Fungsi inferensi per frame
  const predictFrame = useCallback(
    async (videoElement, roiBox) => {
      if (!videoElement || videoElement.readyState < 2) return null;

      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Hitung FPS
      frameCountRef.current += 1;
      let currentFps = telemetry.fps;
      if (now - fpsWindowRef.current >= 500) {
        currentFps = Math.round((frameCountRef.current * 1000) / (now - fpsWindowRef.current));
        frameCountRef.current = 0;
        fpsWindowRef.current = now;
      }

      // Mode Simulasi jika model belum ada
      if (isSimulationMode || !model) {
        const simConfidence = 85 + Math.floor(Math.sin(now / 400) * 8);
        const letter = simulatedLetter;

        // Temporal smoothing simulasi
        handleTemporalSmoothing(letter, simConfidence, 24, currentFps);
        return {
          letter,
          confidence: simConfidence,
          latencyMs: 24,
          fps: currentFps || 30,
        };
      }

      // Mode Inferensi TensorFlow.js Asli
      const startTime = performance.now();
      let prediction = null;

      try {
        const tensorResult = tf.tidy(() => {
          let imageTensor = tf.browser.fromPixels(videoElement);

          // ROI Cropping
          if (useRoiCrop && roiBox && videoElement.videoWidth && videoElement.videoHeight) {
            const { x, y, width, height } = roiBox;
            const vw = videoElement.videoWidth;
            const vh = videoElement.videoHeight;

            // Normalisasi koordinat [y1, x1, y2, x2]
            const y1 = Math.max(0, y / vh);
            const x1 = Math.max(0, x / vw);
            const y2 = Math.min(1, (y + height) / vh);
            const x2 = Math.min(1, (x + width) / vw);

            const boxes = tf.tensor2d([[y1, x1, y2, x2]]);
            const boxInd = tf.tensor1d([0], "int32");

            const cropped = tf.image.cropAndResize(
              imageTensor.expandDims(0),
              boxes,
              boxInd,
              [activeImgSize, activeImgSize]
            );
            imageTensor = cropped.squeeze(0);
          } else {
            imageTensor = tf.image.resizeBilinear(imageTensor, [activeImgSize, activeImgSize]);
          }

          // Channel Mode: Grayscale (1 channel) atau RGB (3 channel)
          if (channelMode === "grayscale") {
            const gray = tf.image.rgbToGrayscale(imageTensor);
            return gray.expandDims(0).toFloat().div(tf.scalar(255.0));
          } else {
            return imageTensor.expandDims(0).toFloat().div(tf.scalar(255.0));
          }
        });

        const output = model.predict(tensorResult);
        const probabilities = await output.data();
        tensorResult.dispose();
        if (output !== tensorResult) output.dispose();

        // Cari probabilitas tertinggi
        let maxProb = 0;
        let maxIndex = 0;
        for (let i = 0; i < probabilities.length; i++) {
          if (probabilities[i] > maxProb) {
            maxProb = probabilities[i];
            maxIndex = i;
          }
        }

        const predictedLetter = labels[maxIndex] || "?";
        const confidencePct = Math.round(maxProb * 100);
        const latency = Math.round(performance.now() - startTime);

        handleTemporalSmoothing(predictedLetter, confidencePct, latency, currentFps);

        prediction = {
          letter: predictedLetter,
          confidence: confidencePct,
          latencyMs: latency,
          fps: currentFps,
        };
      } catch (err) {
        console.error("[AJIN TFJS] Kesalahan inferensi frame:", err);
      }

      return prediction;
    },
    [model, isSimulationMode, simulatedLetter, labels, channelMode, useRoiCrop, activeImgSize, telemetry.fps]
  );

  // Logika temporal smoothing dan hold-to-type
  const handleTemporalSmoothing = (letter, confidence, latencyMs, fps) => {
    // Sliding buffer 15 frame
    frameHistoryRef.current.push({ letter, confidence });
    if (frameHistoryRef.current.length > 15) {
      frameHistoryRef.current.shift();
    }

    // Filter noise: huruf harus konsisten di mayoritas frame buffer
    const letterCounts = {};
    for (const item of frameHistoryRef.current) {
      if (item.confidence >= confidenceThreshold) {
        letterCounts[item.letter] = (letterCounts[item.letter] || 0) + 1;
      }
    }

    let dominantLetter = null;
    let dominantCount = 0;
    for (const [char, count] of Object.entries(letterCounts)) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantLetter = char;
      }
    }

    const isStable = dominantCount >= 8 && confidence >= confidenceThreshold;
    const now = performance.now();

    let isHolding = false;
    let holdProgress = 0;
    let isLocked = false;

    if (isStable && dominantLetter) {
      if (lastActiveLetterRef.current !== dominantLetter) {
        lastActiveLetterRef.current = dominantLetter;
        holdStartTimeRef.current = now;
      }

      const elapsed = now - (holdStartTimeRef.current || now);
      holdProgress = Math.min(1, elapsed / holdDurationMs);
      isHolding = true;

      if (holdProgress >= 1) {
        isLocked = true;
      }
    } else {
      lastActiveLetterRef.current = null;
      holdStartTimeRef.current = null;
      isHolding = false;
      holdProgress = 0;
      isLocked = false;
    }

    setTelemetry({
      fps,
      latencyMs,
      confidence,
      predictedLetter: isStable ? dominantLetter : letter,
      isHolding,
      holdProgress,
      isLocked,
    });
  };

  // Reset lock state setelah huruf dikonsumsi oleh NarrativePage / Quiz
  const consumeLockedLetter = useCallback(() => {
    holdStartTimeRef.current = performance.now();
    setTelemetry((prev) => ({
      ...prev,
      isLocked: false,
      holdProgress: 0,
    }));
  }, []);

  return {
    model,
    labels,
    isLoading,
    isSimulationMode,
    channelMode,
    setChannelMode,
    useRoiCrop,
    setUseRoiCrop,
    telemetry,
    predictFrame,
    simulatedLetter,
    setSimulatedLetter,
    consumeLockedLetter,
  };
};
