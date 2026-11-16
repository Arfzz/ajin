import { useState, useEffect, useRef } from "react";
import { Check, Sparkles, Hand, Zap, ShieldCheck } from "lucide-react";

const SHUFFLE_LETTERS = ["A", "J", "I", "N"];

const CHECKPOINTS = [
  { id: 1, label: "Model SIBI (EfficientNet-B0)", pct: 30 },
  { id: 2, label: "Pelacak 21 Keypoints MediaPipe", pct: 65 },
  { id: 3, label: "Jembatan Visi & Sintesis Suara", pct: 90 },
];

export const KineticPreloader = ({ onFinish, forceShow = false }) => {
  const [progress, setProgress] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef(null);

  // Cek apakah sudah pernah dimuat di sesi ini
  const [shouldShow, setShouldShow] = useState(() => {
    if (forceShow) return true;
    try {
      return !sessionStorage.getItem("ajin_preloader_seen");
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!shouldShow) {
      if (onFinish) onFinish();
      return;
    }

    // Efek shuffle huruf A-J-I-N
    const letterInterval = setInterval(() => {
      setLetterIndex((prev) => (prev + 1) % SHUFFLE_LETTERS.length);
    }, 280);

    // Hitungan kemajuan 0 ke 100%
    const startTime = performance.now();
    const duration = 1800; // 1.8 detik durasi masuk yang dinamis

    const updateProgress = () => {
      const elapsed = performance.now() - startTime;
      const currentPct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(currentPct);

      if (currentPct < 100) {
        timerRef.current = requestAnimationFrame(updateProgress);
      } else {
        clearInterval(letterInterval);
        // Jeda sejenak di 100% lalu mulai animasi tirai shutter
        setTimeout(() => {
          setIsExiting(true);
          try {
            sessionStorage.setItem("ajin_preloader_seen", "true");
          } catch {}

          // Selesaikan transisi keluar
          setTimeout(() => {
            setIsFinished(true);
            if (onFinish) onFinish();
          }, 650);
        }, 300);
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      clearInterval(letterInterval);
    };
  }, [shouldShow, onFinish]);

  // Tombol pintasan lewati (Esc)
  const handleSkip = () => {
    setIsExiting(true);
    try {
      sessionStorage.setItem("ajin_preloader_seen", "true");
    } catch {}
    setTimeout(() => {
      setIsFinished(true);
      if (onFinish) onFinish();
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!shouldShow || isFinished) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col pointer-events-auto transition-transform duration-700 ease-in-out ${
        isExiting ? "-translate-y-full" : "translate-y-0"
      }`}
      aria-label="Layar Inisialisasi AJIN SIBI"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Panel Atas Shutter */}
      <div className="relative flex-1 bg-paper border-b-[4px] border-ink flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-yellow border-2 border-ink shadow-[2px_2px_0_#111] flex items-center justify-center font-mono font-black text-sm text-ink">
              A
            </span>
            <div>
              <span className="font-display font-black text-lg text-ink tracking-tight block leading-none">
                AJIN
              </span>
              <span className="font-mono text-[9px] uppercase text-ink/60 font-bold">
                Sistem Isyarat Bahasa Indonesia
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="tag tag-yellow text-[10px] font-mono">
              INIT V2.0
            </span>
            <button
              onClick={handleSkip}
              className="btn bg-paper-2 hover:bg-paper-3 text-[10px] font-mono py-1 px-2.5 border border-ink shadow-[1px_1px_0_#111]"
              title="Lewati inisialisasi"
            >
              Lewati [Esc]
            </button>
          </div>
        </div>

        {/* Hero Shuffle Display */}
        <div className="max-w-xl mx-auto w-full my-auto py-6 flex flex-col items-center text-center">
          {/* Kinetic Letter Box */}
          <div className="relative mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-yellow border-[3px] border-ink shadow-[6px_6px_0_#111] flex items-center justify-center transition-all duration-150 transform hover:scale-105">
              <span className="font-display font-black text-5xl sm:text-6xl text-ink">
                {SHUFFLE_LETTERS[letterIndex]}
              </span>
            </div>
            <div className="absolute -top-3 -right-3 w-7 h-7 bg-coral border-2 border-ink shadow-[2px_2px_0_#111] flex items-center justify-center text-white text-[10px] font-mono font-black">
              {letterIndex + 1}
            </div>
          </div>

          <h2 className="font-display font-black text-2xl sm:text-3xl text-ink tracking-tight mb-2">
            Menyiapkan Studio Isyarat
          </h2>
          <p className="font-sans text-xs sm:text-sm text-ink/70 max-w-sm font-medium mb-6">
            Menghubungkan pipeline visi komputer dan model klasifikasi gestur secara lokal di perambanmu.
          </p>

          {/* Chunky Percentage Counter */}
          <div className="flex items-baseline gap-2 font-mono mb-4">
            <span className="text-4xl sm:text-5xl font-black text-ink tracking-tight">
              {progress}
            </span>
            <span className="text-lg sm:text-xl font-bold text-coral">
              %
            </span>
          </div>

          {/* Chunky Neobrutalist Progress Bar */}
          <div className="w-full h-5 sm:h-6 border-[3px] border-ink bg-paper-2 p-0.5 shadow-[3px_3px_0_#111] mb-6 overflow-hidden">
            <div
              className="h-full bg-yellow transition-all duration-75 border-r-2 border-ink flex items-center justify-end pr-1"
              style={{ width: `${progress}%` }}
            >
              <div className="w-1.5 h-full bg-ink/30" />
            </div>
          </div>

          {/* Checkpoint Statuses */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full text-left font-mono text-[11px]">
            {CHECKPOINTS.map((cp) => {
              const isDone = progress >= cp.pct;
              return (
                <div
                  key={cp.id}
                  className={`p-2 border border-ink flex items-center gap-2 transition-colors ${
                    isDone
                      ? "bg-mint/30 border-ink text-ink font-bold"
                      : "bg-paper-2 text-ink/40 border-dashed"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-none border border-ink flex items-center justify-center text-[9px] flex-shrink-0 ${
                      isDone ? "bg-mint text-ink font-black" : "bg-paper text-ink/30"
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : cp.id}
                  </span>
                  <span className="truncate">{cp.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Ribbon */}
        <div className="border-t-2 border-ink pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-ink/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <span>26 Alfabet SIBI • MediaPipe Tasks Vision • ONNX WebAssembly</span>
          </div>
          <span className="font-bold">
            AJIN Visi Komputer 2026
          </span>
        </div>
      </div>
    </div>
  );
};

