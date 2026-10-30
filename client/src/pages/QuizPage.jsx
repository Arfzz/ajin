import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { Award, Timer, RotateCcw, CheckCircle2, Flame, HelpCircle, ArrowRight, Zap, Trophy } from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { GuidePlayer } from "../components/remotion/GuidePlayer";
import { sendTelemetry } from "../services/api";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";

const QUIZ_WORDS = ["BUKU", "SAYA", "KITA", "AJIN", "BAIK", "HARI"];

export const QuizPage = ({ modelHook }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentWord = QUIZ_WORDS[wordIndex];
  const targetLetter = currentWord[letterIndex];

  // Ambil panduan huruf saat ini untuk hint drawer
  const targetAlphabetInfo = SIBI_ALPHABETS_FALLBACK.find(
    (a) => a.letter === targetLetter
  );

  // Timer stopwatch
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  // Tangani huruf yang terkunci dari kamera
  const handleLetterLocked = useCallback(
    (detectedLetter) => {
      if (isCompleted) return;

      const isMatch = detectedLetter.toUpperCase() === targetLetter;

      sendTelemetry({
        sessionType: "quiz",
        targetLabel: targetLetter,
        predictedLabel: detectedLetter,
        confidence: modelHook.telemetry.confidence,
        latencyMs: modelHook.telemetry.latencyMs,
        fps: modelHook.telemetry.fps,
        isSuccess: isMatch,
      });

      if (isMatch) {
        setScore((prev) => prev + 50);
        setStreak((prev) => prev + 1);
        setShowHint(false);

        // Jika masih ada huruf dalam kata ini
        if (letterIndex < currentWord.length - 1) {
          setLetterIndex((prev) => prev + 1);
        } else {
          // Kata selesai dieja!
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#FFD000", "#FF4D4D", "#0055FF", "#00C68E"],
          });

          // Pindah ke kata berikutnya jika masih ada
          if (wordIndex < QUIZ_WORDS.length - 1) {
            setWordIndex((prev) => prev + 1);
            setLetterIndex(0);
          } else {
            setIsCompleted(true);
          }
        }
      } else {
        // Salah huruf
        setStreak(0);
      }
    },
    [isCompleted, targetLetter, letterIndex, currentWord.length, wordIndex, modelHook.telemetry]
  );

  const handleRestart = () => {
    setWordIndex(0);
    setLetterIndex(0);
    setScore(0);
    setStreak(0);
    setTimerSeconds(0);
    setIsCompleted(false);
    setShowHint(false);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="sticker sticker-coral px-2.5 py-0.5 text-xs font-mono uppercase rotated-label">
                🎯 Mode Tantangan
              </span>
              <span className="sticker sticker-yellow px-2.5 py-0.5 text-xs font-mono uppercase">
                ⚡ Eja Kosakata SIBI
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Arena Kuis: <span className="highlight">Eja Kata SIBI</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Bentuk setiap huruf sesuai urutan kata target di depan kamera. Selesaikan seluruh kata secepat dan seakurat mungkin!
            </p>
          </div>

          {/* Gamified Stat Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="border-2 border-ink bg-paper px-4 py-2 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Timer className="w-5 h-5 text-cobalt" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/60 block leading-none">Waktu</span>
                <span className="text-lg font-black text-ink leading-tight">{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            <div className="border-2 border-ink bg-yellow px-4 py-2 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Flame className="w-5 h-5 text-coral fill-coral" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/60 block leading-none">Streak</span>
                <span className="text-lg font-black text-ink leading-tight">{streak}x</span>
              </div>
            </div>

            <div className="border-2 border-ink bg-mint px-4 py-2 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Award className="w-5 h-5 text-ink" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/60 block leading-none">Skor EXP</span>
                <span className="text-lg font-black text-ink leading-tight">+{score} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t-2 border-ink/15">
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase mb-2">
            <span>Kata {wordIndex + 1} dari {QUIZ_WORDS.length}</span>
            <span>{Math.round(((wordIndex) / QUIZ_WORDS.length) * 100)}% Selesai</span>
          </div>
          <div className="w-full h-4 border-2 border-ink bg-paper p-0.5 shadow-[2px_2px_0_#111]">
            <div
              className="h-full bg-yellow transition-all duration-300 border border-ink"
              style={{ width: `${((wordIndex + (letterIndex / currentWord.length)) / QUIZ_WORDS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Quiz Arena */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri (5 Kolom): Kata Target & Papan Huruf */}
          <div className="lg:col-span-5 space-y-6">
            {!isCompleted ? (
              <div className="card p-6 bg-paper relative nb-thick">
                <div className="flex items-center justify-between mb-4 border-b-2 border-ink pb-3">
                  <span className="tag tag-yellow text-[10px]">
                    TANTANGAN #{wordIndex + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-coral">
                    Huruf Target: [{targetLetter}]
                  </span>
                </div>

                {/* Big Word Display with Chunky Letter Blocks */}
                <div className="py-6">
                  <span className="text-xs font-mono font-bold uppercase text-ink/40 text-center block mb-4">
                    Eja Kata Ini:
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {currentWord.split("").map((char, idx) => {
                      const isCurrent = idx === letterIndex;
                      const isPassed = idx < letterIndex;

                      return (
                        <div
                          key={idx}
                          className={`w-14 h-18 sm:w-16 sm:h-20 border-[3px] border-ink flex flex-col items-center justify-center font-display font-black text-2xl sm:text-3xl transition-all shadow-[4px_4px_0_#111] ${
                            isCurrent
                              ? "bg-yellow text-ink scale-110 -translate-y-1 z-10 animate-wiggle"
                              : isPassed
                              ? "bg-mint text-ink"
                              : "bg-paper-2 text-ink/40 border-dashed"
                          }`}
                        >
                          <span>{char}</span>
                          {isPassed && <CheckCircle2 className="w-4 h-4 text-ink mt-1" />}
                          {isCurrent && (
                            <span className="text-[9px] font-mono font-bold uppercase mt-1 px-1 bg-ink text-paper">
                              TARGET
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Instructions */}
                <div className="text-center p-3.5 bg-paper-2 border border-ink text-xs font-medium text-ink/80 mb-4">
                  Bentuk huruf <strong className="font-black text-coral text-sm underline">{targetLetter}</strong> di depan kamera dan tahan 1,5 detik sampai kotak terisi!
                </div>

                {/* Hint Toggle Button */}
                <div className="flex items-center justify-between border-t-2 border-ink pt-3">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="btn bg-paper-2 hover:bg-yellow text-xs font-mono py-2 px-3 flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showHint ? "Tutup Petunjuk" : `Petunjuk Bentuk Huruf [${targetLetter}]`}</span>
                  </button>

                  <button
                    onClick={handleRestart}
                    className="text-xs font-mono font-bold text-ink/50 hover:text-ink flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ulangi
                  </button>
                </div>

                {/* Hint Drawer */}
                {showHint && targetAlphabetInfo && (
                  <div className="mt-4 p-4 bg-yellow/20 border-2 border-ink animate-fadeIn">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/70 block mb-1.5">
                      Bantuan Isyarat Huruf {targetLetter}:
                    </span>
                    <p className="text-xs font-sans font-medium text-ink leading-relaxed mb-3">
                      {targetAlphabetInfo.description}
                    </p>
                    <div className="border border-ink bg-paper p-1">
                      <GuidePlayer
                        letter={targetLetter}
                        isDynamic={targetAlphabetInfo.gestureType === "dynamic"}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Completion Victory Card */
              <div className="card p-8 bg-paper text-center nb-xl relative overflow-hidden">
                <div className="w-20 h-20 bg-yellow border-[3px] border-ink shadow-[4px_4px_0_#111] mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-ink" />
                </div>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="sticker sticker-yellow px-2 py-0.5 text-xs font-mono uppercase">
                    🎉 SEMUA KATA BERHASIL DIEJA!
                  </span>
                </div>

                <h3 className="font-display font-black text-3xl text-ink mb-2">
                  Selamat, Tantangan Eja Berhasil!
                </h3>
                <p className="font-sans text-xs text-ink/70 font-medium max-w-sm mx-auto mb-6">
                  Kamu telah menyelesaikan seluruh {QUIZ_WORDS.length} kata tantangan SIBI dalam waktu {formatTimer(timerSeconds)}.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-left">
                  <div className="border-2 border-ink p-3 bg-paper-2">
                    <span className="text-[10px] uppercase text-ink/60 font-bold block">Skor Akhir</span>
                    <span className="text-2xl font-black text-ink">+{score} XP</span>
                  </div>
                  <div className="border-2 border-ink p-3 bg-paper-2">
                    <span className="text-[10px] uppercase text-ink/60 font-bold block">Total Waktu</span>
                    <span className="text-2xl font-black text-ink">{formatTimer(timerSeconds)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                  <button
                    onClick={handleRestart}
                    className="btn btn-yellow w-full sm:w-auto text-xs font-mono py-3 px-6 flex items-center justify-center gap-2 shadow-[4px_4px_0_#111]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Ulangi Tantangan
                  </button>
                  <Link
                    to="/latihan"
                    className="btn bg-paper hover:bg-paper-3 w-full sm:w-auto text-xs font-mono py-3 px-6 text-center"
                  >
                    Lanjut ke Studio Latihan →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan (7 Kolom): Webcam & HUD */}
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

            {/* Quick Helper Banner */}
            <div className="p-3 bg-paper-2 border border-ink flex items-center justify-between text-xs font-mono text-ink/70">
              <span>Tips: Pastikan tangan berada di dalam kotak tengah agar kamera mendeteksi dengan cepat.</span>
              <span className="font-bold text-ink">Ambang Penguncian: 75%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
