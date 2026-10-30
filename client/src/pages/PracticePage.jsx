import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, Award, Lightbulb, Flame, Zap, Camera } from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { GuidePlayer } from "../components/remotion/GuidePlayer";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import { saveProgress, sendTelemetry } from "../services/api";

export const PracticePage = ({ modelHook }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLetter = searchParams.get("letter") || "A";

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = SIBI_ALPHABETS_FALLBACK.findIndex((a) => a.letter === urlLetter.toUpperCase());
    return idx >= 0 ? idx : 0;
  });

  const [successCount, setSuccessCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [lastSuccessTime, setLastSuccessTime] = useState(null);

  const currentAlphabet = SIBI_ALPHABETS_FALLBACK[currentIndex];

  // Sinkronisasi URL query param saat index berubah
  useEffect(() => {
    setSearchParams({ letter: currentAlphabet.letter }, { replace: true });
  }, [currentIndex, currentAlphabet.letter, setSearchParams]);

  // Navigasi huruf sebelumnya / berikutnya
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : SIBI_ALPHABETS_FALLBACK.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < SIBI_ALPHABETS_FALLBACK.length - 1 ? prev + 1 : 0));
  };

  // Tangani saat isyarat terkunci dan cocok dengan huruf target
  const handleLetterLocked = (detectedLetter) => {
    const isMatch = detectedLetter.toUpperCase() === currentAlphabet.letter;

    // Catat telemetri
    sendTelemetry({
      sessionType: "practice",
      targetLabel: currentAlphabet.letter,
      predictedLabel: detectedLetter,
      confidence: modelHook.telemetry.confidence,
      latencyMs: modelHook.telemetry.latencyMs,
      fps: modelHook.telemetry.fps,
      isSuccess: isMatch,
    });

    if (isMatch) {
      setSuccessCount((prev) => prev + 1);
      setStreakCount((prev) => prev + 1);
      setTotalXp((prev) => prev + 25);
      setLastSuccessTime(new Date().toLocaleTimeString());

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ["#FFD000", "#FF4D4D", "#0055FF", "#00C68E"],
      });

      // Simpan progres ke backend / local storage
      saveProgress({
        letter: currentAlphabet.letter,
        alphabetId: currentAlphabet.id,
        isMastered: true,
        confidence: modelHook.telemetry.confidence,
      });
    } else {
      // Salah huruf, reset streak
      setStreakCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="sticker sticker-yellow px-2.5 py-0.5 text-xs font-mono uppercase rotated-label">
                🥋 Dojo Latihan SIBI
              </span>
              <span className="sticker sticker-cobalt px-2.5 py-0.5 text-xs font-mono uppercase">
                ⚡ Umpan Balik Kamera Langsung
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Latihan Mandiri: <span className="highlight">Huruf {currentAlphabet.letter}</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Posisikan tangan di depan kamera sesuai panduan visual. Tahan gestur stabil selama 1,5 detik hingga indikator hijau terkunci.
            </p>
          </div>

          {/* Gamified Stat Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="border-2 border-ink bg-yellow px-4 py-2 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Flame className="w-5 h-5 text-coral fill-coral" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/60 block leading-none">Streak</span>
                <span className="text-lg font-black text-ink leading-tight">{streakCount}x</span>
              </div>
            </div>

            <div className="border-2 border-ink bg-mint px-4 py-2 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Award className="w-5 h-5 text-ink" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/60 block leading-none">Total EXP</span>
                <span className="text-lg font-black text-ink leading-tight">+{totalXp} XP</span>
              </div>
            </div>

            <div className="border-2 border-ink bg-paper px-4 py-2 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-5 h-5 text-cobalt" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/60 block leading-none">Selesai</span>
                <span className="text-lg font-black text-ink leading-tight">{successCount}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* 26-Letter Quick Switcher Rail */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t-2 border-ink/15 overflow-x-auto pb-2 flex items-center gap-1.5 scrollbar-thin">
          <span className="text-xs font-mono font-bold uppercase text-ink/40 mr-2 whitespace-nowrap">
            Pilih Huruf:
          </span>
          {SIBI_ALPHABETS_FALLBACK.map((item, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={item.letter}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 shrink-0 border-2 border-ink font-display font-black text-sm transition-all ${
                  isSelected
                    ? "bg-yellow text-ink shadow-[2px_2px_0_#111] -translate-y-0.5 scale-105"
                    : "bg-paper text-ink/70 hover:bg-paper-3 hover:text-ink shadow-[1px_1px_0_#111]"
                }`}
                aria-label={`Pilih huruf ${item.letter}`}
                aria-pressed={isSelected}
              >
                {item.letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri (5 Kolom): Target Card & Remotion Guide */}
          <div className="lg:col-span-5 space-y-6">
            {/* Target Letter Card */}
            <div className="card p-6 bg-paper relative overflow-hidden nb-thick">
              <div className="flex items-start justify-between mb-4 border-b-2 border-ink pb-3">
                <div>
                  <span className="tag tag-yellow text-[10px] mb-1">
                    TARGET LATIHAN AKTIF
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display font-black text-7xl text-ink leading-none">
                      {currentAlphabet.letter}
                    </span>
                    <span className="font-mono text-xs font-bold uppercase text-ink/60">
                      {currentAlphabet.gestureType === "dynamic" ? "💫 Gerak Dinamis" : "✋ Gestur Statis"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="tag tag-mint text-[10px]">
                    Tingkat: {currentAlphabet.difficulty}
                  </span>
                  <div className="flex items-center gap-1 mt-3">
                    <button
                      onClick={handlePrev}
                      className="p-1.5 border border-ink bg-paper-2 hover:bg-yellow shadow-[2px_2px_0_#111]"
                      title="Huruf Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-1.5 border border-ink bg-paper-2 hover:bg-yellow shadow-[2px_2px_0_#111]"
                      title="Huruf Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Finger Instruction */}
              <div className="mb-4">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                  Cara Membentuk Jari:
                </h4>
                <p className="font-sans text-sm font-medium text-ink leading-relaxed p-3 bg-paper-2 border border-ink">
                  {currentAlphabet.description}
                </p>
              </div>

              {/* Tips Box */}
              {currentAlphabet.tips && (
                <div className="p-3 bg-yellow/20 border border-ink flex items-start gap-2.5 text-xs text-ink mb-4">
                  <Lightbulb className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">{currentAlphabet.tips}</p>
                </div>
              )}

              {/* Procedural Hand Animation Preview */}
              <div className="border-2 border-ink bg-paper-2 p-3 shadow-[3px_3px_0_#111]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink/60">
                    Simulasi Gerakan Tangan:
                  </span>
                  <span className="text-[10px] font-mono text-cobalt font-bold">
                    Putar Ulang ↺
                  </span>
                </div>
                <GuidePlayer
                  letter={currentAlphabet.letter}
                  isDynamic={currentAlphabet.gestureType === "dynamic"}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan (7 Kolom): Live Webcam & Tactical HUD */}
          <div className="lg:col-span-7 space-y-4">
            <WebcamCanvas
              modelHook={modelHook}
              onLetterLocked={handleLetterLocked}
              className="w-full"
            />

            <TelemetryBar
              fps={modelHook.telemetry.fps}
              latencyMs={modelHook.telemetry.latencyMs}
              confidence={modelHook.telemetry.confidence}
              predictedLetter={modelHook.telemetry.predictedLetter}
              isHolding={modelHook.telemetry.isHolding}
              isLocked={modelHook.telemetry.isLocked}
              isSimulationMode={modelHook.isSimulationMode}
            />

            {/* Live Coaching Bar */}
            <div className="card p-4 bg-paper-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="tag tag-ink text-[10px]">STATUS:</span>
                {modelHook.telemetry.predictedLetter === currentAlphabet.letter ? (
                  <span className="font-bold text-mint flex items-center gap-1 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Gestur cocok! Tahan posisi stabil untuk mengunci huruf.
                  </span>
                ) : (
                  <span className="text-ink/80 font-bold">
                    Bentuk huruf <strong className="text-coral underline font-black">{currentAlphabet.letter}</strong> di dalam kotak panduan kamera.
                  </span>
                )}
              </div>

              {lastSuccessTime && (
                <span className="text-[10px] text-ink/50 bg-paper px-2 py-1 border border-ink/20">
                  Terakhir cocok: {lastSuccessTime}
                </span>
              )}
            </div>

            {/* Quick Next Huruf CTA */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to="/kamus"
                className="btn bg-paper hover:bg-paper-3 text-xs font-mono py-2.5 px-4"
              >
                ← Kembali ke Kamus
              </Link>

              <button
                onClick={handleNext}
                className="btn btn-yellow text-xs font-mono py-2.5 px-5 flex items-center gap-2 shadow-[4px_4px_0_#111]"
              >
                <span>Lanjut ke Huruf Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
