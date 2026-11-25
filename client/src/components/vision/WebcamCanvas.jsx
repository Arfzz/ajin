import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, CameraOff, RefreshCw, Layers, Sliders, CheckCircle2 } from "lucide-react";

// Koneksi 21 titik sendi tangan
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // Ibu jari
  [0, 5], [5, 6], [6, 7], [7, 8],         // Telunjuk
  [5, 9], [9, 10], [10, 11], [11, 12],    // Jari tengah
  [9, 13], [13, 14], [14, 15], [15, 16],  // Jari manis
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // Kelingking
];

const FINGER_RGB = {
  0: "rgb(255, 255, 255)",
  1: "rgb(255, 0, 0)",
  2: "rgb(255, 165, 0)",
  3: "rgb(255, 255, 0)",
  4: "rgb(0, 255, 0)",
  5: "rgb(0, 0, 255)",
};

const getFingerIndex = (i) => (i === 0 ? 0 : Math.floor((i - 1) / 4) + 1);

export const WebcamCanvas = ({
  modelHook,
  onLetterLocked,
  className = "",
  showControls = true,
}) => {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const animFrameIdRef = useRef(null);

  const {
    telemetry,
    predictFrame,
    isSimulationMode,
    simulatedLetter,
    setSimulatedLetter,
    consumeLockedLetter,
    useRoiCrop,
    setUseRoiCrop,
    labels,
  } = modelHook;

  // Handler saat video siap dimainkan
  const handleVideoReady = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
    } catch (e) {
      console.warn("[AJIN Camera] Autoplay dicegah / video play tertunda:", e.message);
    }
    setCameraActive(true);
  }, []);

  // Mulai aliran video webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perangkat atau peramban tidak mendukung akses webcam.");
      }

      // Hentikan track lama jika masih berjalan
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = handleVideoReady;
        videoRef.current.onloadeddata = handleVideoReady;
        videoRef.current.oncanplay = handleVideoReady;

        if (videoRef.current.readyState >= 1) {
          handleVideoReady();
        }
      }
    } catch (err) {
      console.warn("[AJIN Camera] Akses kamera tidak dapat diaktifkan:", err.message);
      setCameraError(err.message || "Gagal membuka webcam.");
      setCameraActive(false);
    }
  }, [handleVideoReady]);

  // Hentikan webcam
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Inisialisasi kamera saat mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [startCamera, stopCamera]);

  // Loop inferensi per frame
  useEffect(() => {
    let isRunning = true;

    const runInferenceLoop = async () => {
      if (!isRunning) return;

      if (
        videoRef.current &&
        cameraActive &&
        videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        await predictFrame(videoRef.current);
      } else if (isSimulationMode) {
        // Tetap jalankan loop telemetri simulasi jika webcam mati
        await predictFrame(null);
      }

      if (isRunning) {
        animFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(runInferenceLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraActive, predictFrame, isSimulationMode]);

  // Tangani saat isyarat berhasil terkunci
  useEffect(() => {
    if (telemetry.isLocked && telemetry.predictedLetter && telemetry.predictedLetter !== "-") {
      if (onLetterLocked) {
        onLetterLocked(telemetry.predictedLetter);
      }
      consumeLockedLetter();
    }
  }, [telemetry.isLocked, telemetry.predictedLetter, onLetterLocked, consumeLockedLetter]);

  // Gambar visualisasi 21 landmark MediaPipe di atas video
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!telemetry.landmarks || telemetry.landmarks.length === 0 || !cameraActive) return;

    // Sinkronkan resolusi canvas dengan video aktual jika tersedia
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      if (canvas.width !== videoRef.current.videoWidth || canvas.height !== videoRef.current.videoHeight) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
      }
    }

    const w = canvas.width;
    const h = canvas.height;
    const pts = telemetry.landmarks.map((p) => ({
      x: isMirrored ? (1 - p.x) * w : p.x * w,
      y: p.y * h,
    }));

    // Gambar garis tulang
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.strokeStyle = FINGER_RGB[getFingerIndex(b)];
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    }

    // Gambar titik sendi
    for (let i = 0; i < pts.length; i++) {
      ctx.fillStyle = FINGER_RGB[getFingerIndex(i)];
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [telemetry.landmarks, cameraActive, isMirrored]);

  return (
    <div
      ref={containerRef}
      className={`relative border-[3px] border-ink bg-ink shadow-[6px_6px_0_#111] overflow-hidden flex flex-col ${className}`}
    >
      {/* Viewfinder Area */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-ink flex items-center justify-center overflow-hidden">
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoReady}
          onLoadedData={handleVideoReady}
          onCanPlay={handleVideoReady}
          className={`w-full h-full object-cover transition-transform ${
            isMirrored ? "-scale-x-100" : ""
          } ${!cameraActive ? "hidden" : "block"}`}
        />

        {/* Landmark Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          width={640}
          height={480}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${
            !cameraActive ? "hidden" : "block"
          }`}
        />

        {/* Fallback View jika kamera tidak aktif */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-paper-2 border-[2px] border-ink text-ink z-10 m-3">
            <div className="w-16 h-16 border-[2.5px] border-ink bg-coral flex items-center justify-center text-white mb-3 shadow-[3px_3px_0_#111]">
              <CameraOff className="w-8 h-8" />
            </div>
            <h4 className="font-display font-black text-ink text-lg">
              {cameraError ? "Webcam Belum Terhubung" : "Kamera Belum Aktif"}
            </h4>
            <p className="text-xs font-sans text-ink/70 max-w-sm mt-1.5 mb-5 font-medium leading-relaxed">
              {cameraError ||
                "Izinkan akses webcam pada browsermu untuk mendeteksi posisi jemari secara langsung, atau pilih Mode Simulasi di bawah."}
            </p>
            <button
              onClick={startCamera}
              className="btn btn-yellow text-xs font-mono py-2.5 px-4 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Aktifkan Kamera
            </button>
          </div>
        )}

        {/* Region of Interest (ROI) Guide Box */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div
              className={`relative w-48 h-48 sm:w-64 sm:h-64 border-[3px] transition-all duration-150 ${
                telemetry.isLocked
                  ? "border-mint shadow-[0_0_0_4px_#00C68E]"
                  : telemetry.isHolding
                  ? "border-yellow shadow-[0_0_0_4px_#FFD000]"
                  : "border-white/80"
              }`}
            >
              {/* Corner Accents */}
              <div className="absolute -top-2 -left-2 w-5 h-5 bg-yellow border-2 border-ink" />
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow border-2 border-ink" />
              <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-yellow border-2 border-ink" />
              <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-yellow border-2 border-ink" />

              {/* Scanning Sweep */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="w-full h-1 bg-yellow/80 shadow-[0_0_8px_#FFD000] animate-radar-sweep" />
              </div>

              {/* HUD Label Kotak */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 border border-ink bg-yellow text-[10px] font-mono font-black text-ink uppercase tracking-wider shadow-[2px_2px_0_#111]">
                Area Deteksi SIBI
              </div>

              {/* Circular Hold Progress Ring */}
              {telemetry.isHolding && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/50 backdrop-blur-[2px]">
                  <div className="relative flex flex-col items-center justify-center">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="#222"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke={telemetry.holdProgress >= 1 ? "#00C68E" : "#FFD000"}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={238}
                        strokeDashoffset={238 - 238 * telemetry.holdProgress}
                        strokeLinecap="square"
                        className="transition-all duration-75"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-display font-black text-yellow leading-none">
                        {telemetry.predictedLetter}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white mt-0.5">
                        {Math.round(telemetry.holdProgress * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prediction Box Top Right */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <div className="border-2 border-ink bg-paper px-3 py-1 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-ink/70">Terbaca:</span>
            <span className="font-display font-black text-base text-ink bg-yellow px-1.5 border border-ink">
              {telemetry.predictedLetter || "-"}
            </span>
            <span className="text-[11px] font-bold text-ink/60 font-mono">
              {telemetry.confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* Kontrol Kalibrasi Cepat & Mode Simulasi */}
      {showControls && (
        <div className="p-3 bg-paper border-t-[2.5px] border-ink flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className="btn bg-paper-2 hover:bg-paper-3 text-[11px] font-mono py-1.5 px-3"
            >
              Cermin: {isMirrored ? "AKTIF" : "NONAKTIF"}
            </button>

            <button
              onClick={() => setUseRoiCrop(!useRoiCrop)}
              title="Pilih apakah kamera membaca tangan hanya di dalam kotak tengah atau seluruh layar"
              className={`btn text-[11px] font-mono py-1.5 px-3 ${
                useRoiCrop ? "btn-cobalt" : "bg-paper-2 hover:bg-paper-3"
              }`}
            >
              {useRoiCrop ? "Deteksi di Dalam Kotak Saja" : "Deteksi di Seluruh Layar"}
            </button>
          </div>

          {/* Selector Mode Simulasi jika model belum dimuat */}
          {isSimulationMode && (
            <div className="flex items-center gap-2">
              <span className="tag tag-yellow text-[10px]">
                Simulasi Huruf:
              </span>
              <select
                value={simulatedLetter}
                onChange={(e) => setSimulatedLetter(e.target.value)}
                className="border-2 border-ink bg-paper text-ink px-2 py-1 text-xs font-mono font-black shadow-[2px_2px_0_#111] focus:outline-none"
              >
                {labels.map((char) => (
                  <option key={char} value={char}>
                    Huruf {char}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
