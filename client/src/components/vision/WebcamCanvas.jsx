import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, CameraOff, RefreshCw, Layers, Sliders, CheckCircle2 } from "lucide-react";

export const WebcamCanvas = ({
  modelHook,
  onLetterLocked,
  className = "",
  showControls = true,
}) => {
  const videoRef = useRef(null);
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
    channelMode,
    setChannelMode,
    useRoiCrop,
    setUseRoiCrop,
    labels,
  } = modelHook;

  // Mulai aliran video webcam
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perangkat atau peramban tidak mendukung akses webcam.");
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
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
        };
      }
    } catch (err) {
      console.warn("[AJIN Camera] Akses kamera tidak dapat diaktifkan:", err.message);
      setCameraError(err.message || "Gagal membuka webcam.");
      setCameraActive(false);
    }
  }, []);

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

      if (videoRef.current && cameraActive && videoRef.current.readyState >= 2) {
        // Tentukan kotak ROI di tengah video (260x260 px)
        const vw = videoRef.current.videoWidth || 640;
        const vh = videoRef.current.videoHeight || 480;
        const roiSize = Math.min(260, Math.min(vw, vh) * 0.7);
        const roiBox = {
          x: (vw - roiSize) / 2,
          y: (vh - roiSize) / 2,
          width: roiSize,
          height: roiSize,
        };

        await predictFrame(videoRef.current, roiBox);
      } else if (isSimulationMode) {
        // Tetap jalankan loop telemetri simulasi jika webcam mati
        await predictFrame(null, null);
      }

      animFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
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
          className={`w-full h-full object-cover transition-transform ${
            isMirrored ? "-scale-x-100" : ""
          } ${!cameraActive ? "hidden" : "block"} ${
            channelMode === "grayscale" ? "grayscale contrast-125" : ""
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

        {/* Live Indicator Top Left */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <span className="sticker sticker-mint text-[10px] font-mono px-2 py-0.5 shadow-[2px_2px_0_#111]">
            <span className="w-2 h-2 rounded-full bg-ink inline-block mr-1.5 animate-pulse" />
            {cameraActive ? "KAMERA AKTIF (640x480)" : "KAMERA NONAKTIF"}
          </span>
        </div>

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
              onClick={() =>
                setChannelMode(channelMode === "rgb" ? "grayscale" : "rgb")
              }
              className={`btn text-[11px] font-mono py-1.5 px-3 ${
                channelMode === "grayscale" ? "btn-yellow" : "bg-paper-2 hover:bg-paper-3"
              }`}
              title="Sesuaikan channel warna dengan dataset latih"
            >
              Warna: {channelMode.toUpperCase()}
            </button>

            <button
              onClick={() => setUseRoiCrop(!useRoiCrop)}
              className={`btn text-[11px] font-mono py-1.5 px-3 ${
                useRoiCrop ? "btn-cobalt" : "bg-paper-2 hover:bg-paper-3"
              }`}
            >
              Area ROI: {useRoiCrop ? "AKTIF" : "NONAKTIF"}
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
