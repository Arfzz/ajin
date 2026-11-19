import { useState, useEffect, useRef, useCallback } from "react";
import * as ort from "onnxruntime-web";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const DEFAULT_LABELS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

// Konfigurasi koneksi tulang tangan (21 landmark MediaPipe)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // Ibu jari (Thumb)
  [0, 5], [5, 6], [6, 7], [7, 8],         // Telunjuk (Index)
  [5, 9], [9, 10], [10, 11], [11, 12],    // Jari tengah (Middle)
  [9, 13], [13, 14], [14, 15], [15, 16],  // Jari manis (Ring)
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // Kelingking (Pinky)
];

// Warna segmen jari persis sesuai fungsi render() pada notebook Python
// (Di Python menggunakan BGR, diubah ke RGB sebelum masuk ke tensor EfficientNet)
const FINGER_RGB = {
  0: "rgb(255, 255, 255)", // Wrist (Putih)
  1: "rgb(255, 0, 0)",     // Ibu jari (Merah)
  2: "rgb(255, 165, 0)",   // Telunjuk (Oranye)
  3: "rgb(255, 255, 0)",   // Tengah (Kuning)
  4: "rgb(0, 255, 0)",     // Manis (Hijau)
  5: "rgb(0, 0, 255)",     // Kelingking (Biru)
};

const getFingerIndex = (i) => (i === 0 ? 0 : Math.floor((i - 1) / 4) + 1);

// Normalisasi wrist-relative + scale-invariant persis fungsi Python _normalize()
function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const wrist = landmarks[0];
  const pts = landmarks.map((p) => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: (p.z || 0) - (wrist.z || 0),
  }));

  let maxNorm = 0;
  for (const p of pts) {
    const norm = Math.hypot(p.x, p.y);
    if (norm > maxNorm) maxNorm = norm;
  }

  if (maxNorm > 0) {
    return pts.map((p) => ({
      x: p.x / maxNorm,
      y: p.y / maxNorm,
      z: p.z / maxNorm,
    }));
  }
  return pts;
}

// Render skeleton ke canvas 128x128 persis fungsi Python render()
function renderSkeletonToCanvas(normalizedPts, canvas, ctx) {
  const size = 128;
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(0, 0, size, size);

  // Proyeksi koordinat: px = pts * (size * 0.42) + size / 2
  const px = normalizedPts.map((p) => ({
    x: Math.round(p.x * (size * 0.42) + size / 2),
    y: Math.round(p.y * (size * 0.42) + size / 2),
  }));

  // Gambar garis tulang
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.strokeStyle = FINGER_RGB[getFingerIndex(b)];
    ctx.beginPath();
    ctx.moveTo(px[a].x, px[a].y);
    ctx.lineTo(px[b].x, px[b].y);
    ctx.stroke();
  }

  // Gambar titik sendi
  for (let i = 0; i < px.length; i++) {
    ctx.fillStyle = FINGER_RGB[getFingerIndex(i)];
    ctx.beginPath();
    ctx.arc(px[i].x, px[i].y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// ImageNet Normalization: MEAN=[0.485, 0.456, 0.406], STD=[0.229, 0.224, 0.225]
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

function canvasToFloatTensor(ctx, size = 128) {
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data; // RGBA
  const totalPixels = size * size;
  const float32Data = new Float32Array(3 * totalPixels);

  // Format tensor: Channels-first [1, 3, 128, 128]
  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    float32Data[i] = (r / 255.0 - MEAN[0]) / STD[0];                 // Red channel
    float32Data[totalPixels + i] = (g / 255.0 - MEAN[1]) / STD[1];   // Green channel
    float32Data[2 * totalPixels + i] = (b / 255.0 - MEAN[2]) / STD[2];// Blue channel
  }

  return new ort.Tensor("float32", float32Data, [1, 3, size, size]);
}

function softmax(logits) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - max);
    sum += exps[i];
  }
  for (let i = 0; i < logits.length; i++) {
    exps[i] /= sum;
  }
  return exps;
}

// Module-level singleton cache agar tidak diinisialisasi ganda oleh React StrictMode atau multiple re-renders
let globalPipelinePromise = null;
let globalPipelineData = null;

async function getOrInitPipeline({ modelPath, handLandmarkerPath, labelsPath }) {
  if (globalPipelineData) {
    return globalPipelineData;
  }
  if (globalPipelinePromise) {
    return globalPipelinePromise;
  }

  globalPipelinePromise = (async () => {
    // 1. Muat labels.json
    let labels = DEFAULT_LABELS;
    try {
      const labelsRes = await fetch(labelsPath);
      if (labelsRes.ok) {
        const labelsData = await labelsRes.json();
        if (Array.isArray(labelsData) && labelsData.length > 0) {
          labels = labelsData;
          console.log(`[AJIN Model] Berhasil memuat ${labelsData.length} kelas label.`);
        }
      }
    } catch (e) {
      console.warn("[AJIN Model] Menggunakan label default:", e.message);
    }

    // 2. Unduh aset model sebagai buffer biner langsung di browser
    console.log("[AJIN Model] Mengunduh aset model SIBI...");
    let hlBuffer = null;
    let onnxBuffer = null;

    try {
      const cacheBuster = `?t=${Date.now()}`;
      const [mpRes, onnxRes] = await Promise.all([
        fetch(handLandmarkerPath + cacheBuster),
        fetch(modelPath + cacheBuster),
      ]);
      if (mpRes.ok) {
        const mpAb = await mpRes.arrayBuffer();
        hlBuffer = new Uint8Array(mpAb);
        console.log(`[AJIN Model] hand_landmarker.task siap (${hlBuffer.byteLength} bytes)`);
      }
      if (onnxRes.ok) {
        const onnxAb = await onnxRes.arrayBuffer();
        onnxBuffer = new Uint8Array(onnxAb);
        console.log(`[AJIN Model] effnet_b0_sibi.onnx siap (${onnxBuffer.byteLength} bytes)`);
      }
    } catch (fetchErr) {
      console.warn("[AJIN Model] Gagal mengunduh buffer model langsung:", fetchErr.message);
    }

    // 3. Inisialisasi MediaPipe Tasks-Vision
    console.log("[AJIN Model] Menginisialisasi MediaPipe HandLandmarker...");
    let hlInstance = null;

    const wasmResolvers = [
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      "https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm",
    ];

    for (const resolverUrl of wasmResolvers) {
      try {
        console.log(`[AJIN MediaPipe] Mencoba FilesetResolver: ${resolverUrl}`);
        const vision = await FilesetResolver.forVisionTasks(resolverUrl);

        const baseOptions = hlBuffer
          ? { modelAssetBuffer: hlBuffer }
          : { modelAssetPath: handLandmarkerPath };

        // Coba dengan GPU delegate
        try {
          hlInstance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { ...baseOptions, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.3,
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3,
          });
          console.log("[AJIN MediaPipe] Berhasil dibuat dengan GPU delegate!");
          break;
        } catch (gpuErr) {
          console.warn("[AJIN MediaPipe] GPU delegate tidak tersedia, beralih ke CPU:", gpuErr.message);
          hlInstance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { ...baseOptions, delegate: "CPU" },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.3,
            minHandPresenceConfidence: 0.3,
            minTrackingConfidence: 0.3,
          });
          console.log("[AJIN MediaPipe] Berhasil dibuat dengan CPU delegate!");
          break;
        }
      } catch (resErr) {
        console.warn(`[AJIN MediaPipe] Resolver ${resolverUrl} gagal:`, resErr.message);
      }
    }

    if (!hlInstance) {
      throw new Error("Gagal menginisialisasi MediaPipe HandLandmarker dari semua resolver.");
    }

    // 4. Inisialisasi ONNX Runtime Web (WASM)
    console.log("[AJIN Model] Memuat sesi ONNX EfficientNet-B0 SIBI...");
    try {
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
      ort.env.wasm.numThreads = 1;
    } catch {}

    const dummyInput = new ort.Tensor("float32", new Float32Array(1 * 3 * 128 * 128), [1, 3, 128, 128]);
    let sessionInstance = null;

    if (onnxBuffer) {
      try {
        const bufferCopy = onnxBuffer.slice(0);
        sessionInstance = await ort.InferenceSession.create(bufferCopy, {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });
        await sessionInstance.run({ input: dummyInput });
        console.log("[AJIN Model] ONNX Session terverifikasi aktif via WASM (Buffer).");
      } catch (bufErr) {
        console.warn("[AJIN Model] Sesi buffer gagal, mencoba via URL:", bufErr.message);
      }
    }

    if (!sessionInstance) {
      sessionInstance = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      await sessionInstance.run({ input: dummyInput });
      console.log("[AJIN Model] ONNX Session terverifikasi aktif via WASM (URL).");
    }

    globalPipelineData = {
      landmarker: hlInstance,
      onnxSession: sessionInstance,
      labels,
    };

    return globalPipelineData;
  })();

  try {
    return await globalPipelinePromise;
  } catch (err) {
    globalPipelinePromise = null;
    throw err;
  }
}

export const useSibiModel = (options = {}) => {
  const {
    modelPath = "/model/effnet_b0_sibi.onnx",
    handLandmarkerPath = "/model/hand_landmarker.task",
    labelsPath = "/model/labels.json",
    confidenceThreshold = 65,
    holdDurationMs = 1000,
  } = options;

  const [onnxSession, setOnnxSession] = useState(() => globalPipelineData?.onnxSession || null);
  const [landmarker, setLandmarker] = useState(() => globalPipelineData?.landmarker || null);
  const [labels, setLabels] = useState(() => globalPipelineData?.labels || DEFAULT_LABELS);
  const [isLoading, setIsLoading] = useState(() => !globalPipelineData);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [useRoiCrop, setUseRoiCrop] = useState(true);

  // Telemetri Real-Time
  const [telemetry, setTelemetry] = useState({
    fps: 0,
    latencyMs: 0,
    confidence: 0,
    predictedLetter: "-",
    rawLetter: "-",
    isHolding: false,
    holdProgress: 0, // 0 sampai 1
    isLocked: false,
    hasHand: false,
    landmarks: null, // 21 koordinat mentah untuk overlay visual
    topPredictions: [],
  });

  // State untuk kontrol simulasi
  const [simulatedLetter, setSimulatedLetter] = useState("A");

  // Buffer temporal smoothing & canvases
  const frameHistoryRef = useRef([]);
  const holdStartTimeRef = useRef(null);
  const lastActiveLetterRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsWindowRef = useRef(performance.now());
  const fpsRef = useRef(30);
  const skeletonCanvasRef = useRef(null);
  const skeletonCtxRef = useRef(null);
  const lastTimestampRef = useRef(0);
  const isBusyRef = useRef(false);

  // Inisialisasi canvas memori offscreen
  useEffect(() => {
    if (!skeletonCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      skeletonCanvasRef.current = canvas;
      skeletonCtxRef.current = canvas.getContext("2d", { willReadFrequently: true });
    }
  }, []);

  // Muat MediaPipe HandLandmarker + ONNX Model secara singleton
  useEffect(() => {
    let isMounted = true;

    if (globalPipelineData) {
      setLandmarker(globalPipelineData.landmarker);
      setOnnxSession(globalPipelineData.onnxSession);
      setLabels(globalPipelineData.labels);
      setIsSimulationMode(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getOrInitPipeline({ modelPath, handLandmarkerPath, labelsPath })
      .then((data) => {
        if (!isMounted) return;
        setLandmarker(data.landmarker);
        setOnnxSession(data.onnxSession);
        setLabels(data.labels);
        setIsSimulationMode(false);
        console.log("[AJIN Model] Pipeline MediaPipe + EfficientNet-B0 ONNX siap dan aktif 100%!");
      })
      .catch((err) => {
        console.error("[AJIN Model] Kesalahan inisialisasi pipeline:", err);
        if (isMounted) {
          setIsSimulationMode(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [modelPath, handLandmarkerPath, labelsPath]);

  // Logika temporal smoothing dan hold-to-type (1.5 detik)
  const handleTemporalSmoothing = (letter, confidence, latencyMs, fps, hasHand, rawLandmarks, topPredictions = []) => {
    // Sliding buffer 12 frame
    frameHistoryRef.current.push({ letter, confidence, hasHand });
    if (frameHistoryRef.current.length > 12) {
      frameHistoryRef.current.shift();
    }

    if (!hasHand) {
      lastActiveLetterRef.current = null;
      holdStartTimeRef.current = null;
      setTelemetry((prev) => ({
        ...prev,
        fps,
        latencyMs,
        confidence: 0,
        predictedLetter: "-",
        rawLetter: "-",
        isHolding: false,
        holdProgress: 0,
        isLocked: false,
        hasHand: false,
        landmarks: null,
        topPredictions: [],
      }));
      return;
    }

    // Filter noise: konsistensi mayoritas frame
    const letterCounts = {};
    for (const item of frameHistoryRef.current) {
      if (item.hasHand && item.confidence >= confidenceThreshold) {
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

    const isStable = dominantCount >= 5 && confidence >= confidenceThreshold;
    const now = performance.now();

    let isHolding = false;
    let holdProgress = 0;
    let isLocked = false;

    if (isStable && dominantLetter && dominantLetter !== "-") {
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
      rawLetter: letter,
      isHolding,
      holdProgress,
      isLocked,
      hasHand: true,
      landmarks: rawLandmarks,
      topPredictions,
    });
  };

  // Fungsi inferensi per frame
  const predictFrame = useCallback(
    async (videoElement) => {
      if (isBusyRef.current) return null;
      isBusyRef.current = true;

      try {
        const now = performance.now();
        lastFrameTimeRef.current = now;

        // Hitung FPS
        frameCountRef.current += 1;
        if (now - fpsWindowRef.current >= 500) {
          fpsRef.current = Math.round((frameCountRef.current * 1000) / (now - fpsWindowRef.current));
          frameCountRef.current = 0;
          fpsWindowRef.current = now;
        }
        const currentFps = fpsRef.current || 30;

        // Mode Simulasi jika model belum aktif atau video belum siap
        if (isSimulationMode || !onnxSession || !landmarker || !videoElement || videoElement.readyState < 2) {
          if (isSimulationMode || !onnxSession || !landmarker) {
            const simConfidence = 85 + Math.floor(Math.sin(now / 400) * 8);
            const letter = simulatedLetter;
            handleTemporalSmoothing(letter, simConfidence, 15, currentFps, true, null);
            return {
              letter,
              confidence: simConfidence,
              latencyMs: 15,
              fps: currentFps,
            };
          }
          return null;
        }

        // Pastikan video element telah merender frame aktual dengan dimensi positif
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          return null;
        }

        // Pipeline Asli: MediaPipe HandLandmarker + EfficientNet-B0 ONNX
        const startTime = performance.now();
        let prediction = null;

        // Timestamp MediaPipe wajib strictly monotonically increasing
        let safeTimestamp = Math.round(now);
        if (safeTimestamp <= lastTimestampRef.current) {
          safeTimestamp = lastTimestampRef.current + 1;
        }
        lastTimestampRef.current = safeTimestamp;

        // 1. Deteksi MediaPipe Hand Landmarks
        const mpResult = landmarker.detectForVideo(videoElement, safeTimestamp);

        if (!mpResult.landmarks || mpResult.landmarks.length === 0) {
          const latency = Math.round(performance.now() - startTime);
          handleTemporalSmoothing("-", 0, latency, currentFps, false, null);
          return null;
        }

        // Ambil tangan pertama (confidence tertinggi)
        const rawLandmarks = mpResult.landmarks[0];

        // 2. Normalisasi 21 koordinat wrist-relative & scale-invariant
        const normalized = normalizeLandmarks(rawLandmarks);
        if (!normalized) {
          const latency = Math.round(performance.now() - startTime);
          handleTemporalSmoothing("-", 0, latency, currentFps, false, null);
          return null;
        }

        // 3. Render gambar skeleton 128x128
        const canvas = skeletonCanvasRef.current;
        const ctx = skeletonCtxRef.current;
        if (canvas && ctx) {
          renderSkeletonToCanvas(normalized, canvas, ctx);

          // 4. Konversi canvas ke Float32 ImageNet Tensor
          const inputTensor = canvasToFloatTensor(ctx, 128);

          // 5. Jalankan inferensi ONNX
          const outputMap = await onnxSession.run({ input: inputTensor });
          const logits = outputMap.output.data;
          const probs = softmax(logits);

          // Cari probabilitas tertinggi
          let maxProb = 0;
          let maxIdx = 0;
          for (let i = 0; i < probs.length; i++) {
            if (probs[i] > maxProb) {
              maxProb = probs[i];
              maxIdx = i;
            }
          }

          const predictedLetter = labels[maxIdx] || "?";
          const confidencePct = Math.round(maxProb * 100);
          const latency = Math.round(performance.now() - startTime);

          // Susun top-3 prediksi untuk telemetry
          const indexed = Array.from(probs).map((p, i) => ({ label: labels[i] || `${i}`, confidence: Math.round(p * 100) }));
          indexed.sort((a, b) => b.confidence - a.confidence);
          const topPredictions = indexed.slice(0, 3);

          handleTemporalSmoothing(
            predictedLetter,
            confidencePct,
            latency,
            currentFps,
            true,
            rawLandmarks,
            topPredictions
          );

          prediction = {
            letter: predictedLetter,
            confidence: confidencePct,
            latencyMs: latency,
            fps: currentFps,
            landmarks: rawLandmarks,
            topPredictions,
          };
        }

        return prediction;
      } catch (err) {
        console.error("[AJIN Model] Kesalahan inferensi frame:", err);
        return null;
      } finally {
        isBusyRef.current = false;
      }
    },
    [onnxSession, landmarker, isSimulationMode, simulatedLetter, labels, confidenceThreshold]
  );

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
    model: onnxSession,
    landmarker,
    labels,
    isLoading,
    isSimulationMode,
    useRoiCrop,
    setUseRoiCrop,
    telemetry,
    predictFrame,
    simulatedLetter,
    setSimulatedLetter,
    consumeLockedLetter,
    skeletonCanvas: skeletonCanvasRef.current,
  };
};
