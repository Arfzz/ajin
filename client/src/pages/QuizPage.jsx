import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Award, Timer, RotateCcw, CheckCircle2, Flame, HelpCircle,
  Trophy, Sparkles, Loader2, Sliders, RefreshCw, Layers
} from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { GuidePlayer } from "../components/remotion/GuidePlayer";
import { sendTelemetry, fetchAiQuizWords } from "../services/api";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";

const DEFAULT_QUIZ_WORDS = ["BUKU", "SAYA", "KITA", "AJIN", "BAIK"];

const CATEGORIES = [
  { id: "umum", label: "Umum", icon: "🌐" },
  { id: "hewan", label: "Hewan", icon: "🐾" },
  { id: "makanan", label: "Makanan", icon: "🍎" },
  { id: "benda", label: "Benda", icon: "📦" },
  { id: "alam", label: "Alam", icon: "🌿" },
  { id: "keluarga", label: "Keluarga", icon: "👨‍👩‍👧" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Mudah", desc: "3-4 Huruf" },
  { id: "medium", label: "Sedang", desc: "5-6 Huruf" },
  { id: "hard", label: "Tantangan", desc: "7+ Huruf" },
];

export const QuizPage = ({ modelHook }) => {
  // State Bank Kata Kuis
  const [quizWords, setQuizWords] = useState(DEFAULT_QUIZ_WORDS);
  const [selectedCategory, setSelectedCategory] = useState("umum");
  const [selectedDifficulty, setSelectedDifficulty] = useState("easy");
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  // State Progres Permainan
  const [wordIndex, setWordIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentWord = quizWords[wordIndex] || "BUKU";
  const targetLetter = currentWord[letterIndex] || currentWord[0];

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

  // Fungsi muat kata baru dari Gemini AI
  const handleGenerateNewWords = async (category = selectedCategory, difficulty = selectedDifficulty) => {
    setIsLoadingWords(true);
    const result = await fetchAiQuizWords(category, difficulty, 5);
    setIsLoadingWords(false);

    if (result && Array.isArray(result.words) && result.words.length > 0) {
      setQuizWords(result.words);
      setIsAiGenerated(result.isAiGenerated !== false);
      setWordIndex(0);
      setLetterIndex(0);
      setIsCompleted(false);
      setShowHint(false);
      setTimerSeconds(0);
    }
  };

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
          if (wordIndex < quizWords.length - 1) {
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
    [isCompleted, targetLetter, letterIndex, currentWord.length, wordIndex, quizWords.length, modelHook.telemetry]
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
              {isAiGenerated ? (
                <span className="sticker sticker-cobalt px-2.5 py-0.5 text-xs font-mono uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow" />
                  Gemini AI
                </span>
              ) : (
                <span className="sticker sticker-mint px-2.5 py-0.5 text-xs font-mono uppercase">
                  Bank Kata Standar
                </span>
              )}
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

        {/* Panel Kontrol Generator AI Kuis */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t-2 border-ink/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Pilihan Tema */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-ink/60 uppercase text-[10px]">Tema:</span>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleGenerateNewWords(cat.id, selectedDifficulty);
                    }}
                    className={`btn text-[10px] font-mono py-1 px-2 ${
                      selectedCategory === cat.id
                        ? "btn-cobalt"
                        : "bg-paper hover:bg-paper-3"
                    }`}
                  >
                    <span>{cat.icon} {cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Kesulitan */}
            <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
              <span className="font-bold text-ink/60 uppercase text-[10px]">Tingkat:</span>
              <div className="flex gap-1">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => {
                      setSelectedDifficulty(diff.id);
                      handleGenerateNewWords(selectedCategory, diff.id);
                    }}
                    title={diff.desc}
                    className={`btn text-[10px] font-mono py-1 px-2.5 ${
                      selectedDifficulty === diff.id
                        ? "btn-yellow font-black"
                        : "bg-paper hover:bg-paper-3"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tombol Buat Kata Baru dengan AI */}
          <button
            onClick={() => handleGenerateNewWords(selectedCategory, selectedDifficulty)}
            disabled={isLoadingWords}
            className="btn btn-yellow text-xs font-mono py-1.5 px-3 flex items-center gap-2 shadow-[2px_2px_0_#111] disabled:opacity-50"
          >
            {isLoadingWords ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cobalt" />
            )}
            <span>{isLoadingWords ? "Membuat Kata..." : "Acak Kata AI"}</span>
          </button>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-ink/10">
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase mb-2">
            <span>Kata {wordIndex + 1} dari {quizWords.length}</span>
            <span>{Math.round((wordIndex / quizWords.length) * 100)}% Selesai</span>
          </div>
          <div className="w-full h-4 border-2 border-ink bg-paper p-0.5 shadow-[2px_2px_0_#111]">
            <div
              className="h-full bg-yellow transition-all duration-300 border border-ink"
              style={{ width: `${((wordIndex + (letterIndex / currentWord.length)) / quizWords.length) * 100}%` }}
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
                  <div className="flex items-center gap-2">
                    <span className="tag tag-yellow text-[10px]">
                      TANTANGAN #{wordIndex + 1}
                    </span>
                    {isAiGenerated && (
                      <span className="tag tag-cobalt text-[9px] flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>
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
                  Kamu telah menyelesaikan seluruh {quizWords.length} kata tantangan SIBI dalam waktu {formatTimer(timerSeconds)}.
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
                    onClick={() => handleGenerateNewWords(selectedCategory, selectedDifficulty)}
                    disabled={isLoadingWords}
                    className="btn btn-yellow w-full sm:w-auto text-xs font-mono py-3 px-6 flex items-center justify-center gap-2 shadow-[4px_4px_0_#111]"
                  >
                    <Sparkles className="w-4 h-4 text-cobalt" />
                    <span>Tantangan AI Baru</span>
                  </button>

                  <button
                    onClick={handleRestart}
                    className="btn bg-paper-2 hover:bg-paper-3 w-full sm:w-auto text-xs font-mono py-3 px-6 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Ulangi Kata Ini
                  </button>

                  <Link
                    to="/latihan"
                    className="btn bg-paper hover:bg-paper-3 w-full sm:w-auto text-xs font-mono py-3 px-6 text-center"
                  >
                    Studio Latihan →
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
