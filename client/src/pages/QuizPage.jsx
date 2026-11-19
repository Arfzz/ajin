import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Trophy,
  Loader2,
  RefreshCw,
  SkipForward,
  Keyboard,
  Camera,
  ArrowUpRight,
} from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { sendTelemetry, saveProgress, fetchAiQuizWords } from "../services/api";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import {
  HAND_CONNECTIONS,
  GROUP_COLORS,
  NODE_COLORS,
  getSibiHandPose3D,
} from "../components/creative/Hero3DSibiStage";

const DEFAULT_QUIZ_WORDS = ["BUKU", "SAYA", "KITA", "AJIN", "BAIK"];

const CATEGORIES = [
  { id: "umum", label: "Umum" },
  { id: "hewan", label: "Hewan" },
  { id: "makanan", label: "Makanan" },
  { id: "benda", label: "Benda" },
  { id: "alam", label: "Alam" },
  { id: "keluarga", label: "Keluarga" },
];

const DIFFICULTIES = [
  { id: "easy", label: "3-4 Huruf", desc: "Kata pendek 3 sampai 4 huruf" },
  { id: "medium", label: "5-6 Huruf", desc: "Kata menengah 5 sampai 6 huruf" },
  { id: "hard", label: "7+ Huruf", desc: "Kata panjang 7 huruf atau lebih" },
];

/**
 * Diagram Vektor SVG 21-Landmark Tangan SIBI untuk panel contekan kuis.
 * Berjalan tanpa loop animasi tambahan agar kamera tetap responsif pada 30 FPS.
 */
const QuizHandDiagramSvg = ({ letter }) => {
  const geometry = useMemo(() => {
    const pose = getSibiHandPose3D(letter);
    const rotX = 0.14 + (pose.viewPitch || 0);
    const rotY = -0.22 + (pose.viewYaw || 0);

    const projectPt = ([vx, vy, vz]) => {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const x1 = vx * cy + vz * sy;
      const z1 = -vx * sy + vz * cy;

      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const y2 = vy * cx - z1 * sx;
      const z2 = vy * sx + z1 * cx;

      const cameraDist = 2.8;
      const scale = cameraDist / (cameraDist - z2);
      return {
        x: 60 + x1 * 50 * scale,
        y: 66 - y2 * 50 * scale,
        z: z2,
      };
    };

    const pts = pose.points.map(projectPt);

    const bones = HAND_CONNECTIONS.map((conn, idx) => {
      const a = pts[conn.from];
      const b = pts[conn.to];
      return {
        id: `b-${idx}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        z: (a.z + b.z) / 2,
        color: GROUP_COLORS[conn.group],
        width: conn.group === "palm" ? 4.4 : 5.0,
      };
    }).sort((u, v) => u.z - v.z);

    const joints = pts
      .map((node, idx) => ({
        id: `j-${idx}`,
        x: node.x,
        y: node.y,
        z: node.z,
        color: NODE_COLORS[idx],
        isTip: idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20,
        isWrist: idx === 0,
      }))
      .sort((u, v) => u.z - v.z);

    return { bones, joints, dynamic: pose.dynamic };
  }, [letter]);

  return (
    <svg
      viewBox="0 0 120 120"
      className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_#111]"
      aria-label={`Diagram 21 titik sendi tangan huruf ${letter}`}
    >
      <line x1="14" y1="102" x2="106" y2="102" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="60" y1="12" x2="60" y2="108" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 2" />

      {geometry.dynamic === "J" && (
        <path
          d="M 84 28 L 84 66 Q 84 86 62 86 Q 45 86 48 68"
          fill="none"
          stroke="#FF4D4D"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}
      {geometry.dynamic === "Z" && (
        <path
          d="M 38 28 L 82 28 L 38 64 L 84 64"
          fill="none"
          stroke="#111111"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}

      {geometry.bones.map((b) => (
        <g key={b.id}>
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke="#111111"
            strokeWidth={b.width + 2.4}
            strokeLinecap="round"
          />
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={b.color}
            strokeWidth={b.width}
            strokeLinecap="round"
          />
        </g>
      ))}

      {geometry.joints.map((j) => (
        <circle
          key={j.id}
          cx={j.x}
          cy={j.y}
          r={j.isWrist ? 4.8 : j.isTip ? 4.3 : 3.2}
          fill={j.isTip ? "#FFD000" : j.color}
          stroke="#111111"
          strokeWidth="1.8"
        />
      ))}

      <rect x="6" y="6" width="24" height="18" fill="#111111" />
      <text
        x="18"
        y="19"
        textAnchor="middle"
        fill="#FFD000"
        fontSize="11"
        fontWeight="900"
        fontFamily="JetBrains Mono, monospace"
      >
        {letter}
      </text>
    </svg>
  );
};

export const QuizPage = ({ modelHook }) => {
  const [quizWords, setQuizWords] = useState(DEFAULT_QUIZ_WORDS);
  const [selectedCategory, setSelectedCategory] = useState("umum");
  const [selectedDifficulty, setSelectedDifficulty] = useState("easy");
  const [isLoadingWords, setIsLoadingWords] = useState(false);

  // Input kata kustom agar pengguna bisa menguji ejaan nama atau kata pilihan sendiri
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customWordText, setCustomWordText] = useState("");
  const [customInputError, setCustomInputError] = useState("");

  // State progres permainan
  const [wordIndex, setWordIndex] = useState(0);
  const [letterIndex, setLetterIndex] = useState(0);
  const [lockedLettersCount, setLockedLettersCount] = useState(0);
  const [skippedLettersCount, setSkippedLettersCount] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentWord = quizWords[wordIndex] || "BUKU";
  const targetLetter = currentWord[letterIndex] || currentWord[0];

  const totalLettersInSet = useMemo(
    () => quizWords.reduce((acc, w) => acc + w.length, 0),
    [quizWords]
  );

  const completedLettersBeforeCurrentWord = useMemo(
    () => quizWords.slice(0, wordIndex).reduce((acc, w) => acc + w.length, 0),
    [quizWords, wordIndex]
  );

  const currentProgressLetters = isCompleted
    ? totalLettersInSet
    : completedLettersBeforeCurrentWord + letterIndex;

  const targetAlphabetInfo = useMemo(
    () => SIBI_ALPHABETS_FALLBACK.find((a) => a.letter === targetLetter),
    [targetLetter]
  );

  const predictedLetter = (modelHook?.telemetry?.predictedLetter || "").toUpperCase();
  const confidencePct = Math.round((modelHook?.telemetry?.confidence || 0) * 100);
  const isDetectingTarget = predictedLetter === targetLetter;

  // Stopwatch waktu sesi aktif
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  // Fungsi memajukan kursor huruf ke huruf atau kata berikutnya
  const advanceToNextLetter = useCallback(
    (wasSkipped = false) => {
      if (wasSkipped) {
        setSkippedLettersCount((prev) => prev + 1);
      } else {
        setLockedLettersCount((prev) => prev + 1);
      }
      setShowHint(false);

      if (letterIndex < currentWord.length - 1) {
        setLetterIndex((prev) => prev + 1);
      } else {
        confetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#FFD000", "#FF4D4D", "#0055FF", "#00C68E"],
        });

        if (wordIndex < quizWords.length - 1) {
          setWordIndex((prev) => prev + 1);
          setLetterIndex(0);
        } else {
          setIsCompleted(true);
        }
      }
    },
    [letterIndex, currentWord.length, wordIndex, quizWords.length]
  );

  // Muat paket kata baru sesuai tema dan panjang kata
  const handleGenerateNewWords = async (
    category = selectedCategory,
    difficulty = selectedDifficulty
  ) => {
    setIsLoadingWords(true);
    const result = await fetchAiQuizWords(category, difficulty, 5);
    setIsLoadingWords(false);

    if (result && Array.isArray(result.words) && result.words.length > 0) {
      setQuizWords(result.words);
      setWordIndex(0);
      setLetterIndex(0);
      setLockedLettersCount(0);
      setSkippedLettersCount(0);
      setIsCompleted(false);
      setShowHint(false);
      setTimerSeconds(0);
    }
  };

  // Tambah atau mulai dengan kata kustom
  const handleApplyCustomWord = (e) => {
    e.preventDefault();
    const cleaned = customWordText.toUpperCase().replace(/[^A-Z]/g, "");
    if (cleaned.length < 2 || cleaned.length > 12) {
      setCustomInputError("Masukkan 2 sampai 12 huruf alfabet (A-Z) tanpa angka.");
      return;
    }
    setCustomInputError("");
    setQuizWords([cleaned, ...quizWords.filter((w) => w !== cleaned).slice(0, 4)]);
    setWordIndex(0);
    setLetterIndex(0);
    setLockedLettersCount(0);
    setSkippedLettersCount(0);
    setIsCompleted(false);
    setShowHint(false);
    setTimerSeconds(0);
    setCustomWordText("");
    setShowCustomInput(false);
  };

  // Handler saat kamera berhasil mengunci huruf selama 1 detik
  const handleLetterLocked = useCallback(
    (detectedLetter) => {
      if (isCompleted) return;

      const isMatch = detectedLetter.toUpperCase() === targetLetter;
      const conf = Number(modelHook.telemetry.confidence || 0);

      sendTelemetry({
        sessionType: "quiz",
        targetLabel: targetLetter,
        predictedLabel: detectedLetter,
        confidence: conf,
        latencyMs: modelHook.telemetry.latencyMs,
        fps: modelHook.telemetry.fps,
        isSuccess: isMatch,
      });

      saveProgress({
        letter: targetLetter,
        isMastered: isMatch && conf >= 75,
        isSuccess: isMatch,
        confidence: conf,
      });

      if (isMatch) {
        advanceToNextLetter(false);
      }
    },
    [isCompleted, targetLetter, modelHook.telemetry, advanceToNextLetter]
  );

  const handleRestart = () => {
    setWordIndex(0);
    setLetterIndex(0);
    setLockedLettersCount(0);
    setSkippedLettersCount(0);
    setTimerSeconds(0);
    setIsCompleted(false);
    setShowHint(false);
  };

  const handleSelectWordTab = (idx) => {
    if (idx === wordIndex && !isCompleted) return;
    setWordIndex(idx);
    setLetterIndex(0);
    setIsCompleted(false);
    setShowHint(false);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const avgSecondsPerLetter =
    lockedLettersCount > 0 ? (timerSeconds / lockedLettersCount).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Header Editorial & Papan Skor Ringkas */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-7 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-wider text-cobalt mb-1.5">
              KUIS EJA KATA // KAMERA LANGSUNG
            </p>
            <h1 className="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-[0.95]">
              EJA KATA TANPA CONTEKAN.
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/75 font-medium mt-2 max-w-2xl">
              Peragakan setiap huruf secara berurutan di depan kamera. Tahan posisi jari selama 1 detik hingga kotak huruf terkunci dan berpindah ke huruf berikutnya.
            </p>
          </div>

          {/* Papan Skor Brutalist 3 Sel (Fakta Sesi Nyata) */}
          <div className="grid grid-cols-3 border-[2.5px] border-ink bg-paper shadow-[4px_4px_0_#111] font-mono shrink-0">
            <div className="px-4 py-2.5 bg-yellow border-r-2 border-ink">
              <span className="text-[10px] font-black uppercase text-ink/70 block leading-none mb-1">
                KATA AKTIF
              </span>
              <span className="text-lg sm:text-xl font-black text-ink tabular-nums leading-none">
                {wordIndex + 1} / {quizWords.length}
              </span>
            </div>

            <div className="px-4 py-2.5 bg-mint border-r-2 border-ink">
              <span className="text-[10px] font-black uppercase text-ink/70 block leading-none mb-1">
                TERKUNCI
              </span>
              <span className="text-lg sm:text-xl font-black text-ink tabular-nums leading-none">
                {currentProgressLetters} / {totalLettersInSet}
              </span>
            </div>

            <div className="px-4 py-2.5 bg-paper">
              <span className="text-[10px] font-black uppercase text-ink/60 block leading-none mb-1">
                DURASI
              </span>
              <span className="text-lg sm:text-xl font-black text-ink tabular-nums leading-none">
                {formatTimer(timerSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bilah Pengaturan Paket Kata & Input Kata Sendiri */}
      <div className="border-b-[3px] border-ink bg-paper py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              {/* Pilihan Tema Kosakata */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-black text-ink uppercase text-[10px] mr-1">
                  TEMA:
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleGenerateNewWords(cat.id, selectedDifficulty);
                    }}
                    className={`px-2.5 py-1 border-2 border-ink text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-cobalt text-white shadow-[2px_2px_0_#111]"
                        : "bg-paper-2 text-ink hover:bg-yellow"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Pilihan Panjang Kata */}
              <div className="flex items-center gap-1 sm:pl-2 sm:border-l-2 sm:border-ink/20">
                <span className="font-black text-ink uppercase text-[10px] mr-1">
                  PANJANG:
                </span>
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => {
                      setSelectedDifficulty(diff.id);
                      handleGenerateNewWords(selectedCategory, diff.id);
                    }}
                    title={diff.desc}
                    className={`px-2.5 py-1 border-2 border-ink text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      selectedDifficulty === diff.id
                        ? "bg-yellow text-ink font-black shadow-[2px_2px_0_#111]"
                        : "bg-paper-2 text-ink hover:bg-paper-3"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aksi Paket Kata & Kata Sendiri */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomInput((prev) => !prev)}
                className={`px-3 py-1.5 border-2 border-ink text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0_#111] ${
                  showCustomInput
                    ? "bg-ink text-yellow"
                    : "bg-paper-2 text-ink hover:bg-yellow"
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{showCustomInput ? "Tutup Input Kata" : "Tulis Kata Sendiri"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerateNewWords(selectedCategory, selectedDifficulty)}
                disabled={isLoadingWords}
                className="px-3.5 py-1.5 border-2 border-ink bg-yellow hover:bg-ink hover:text-yellow text-ink text-xs font-mono font-black flex items-center gap-1.5 shadow-[2px_2px_0_#111] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingWords ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{isLoadingWords ? "Memuat Paket..." : "Ganti 5 Kata"}</span>
              </button>
            </div>
          </div>

          {/* Form Input Kata Sendiri */}
          {showCustomInput && (
            <form
              onSubmit={handleApplyCustomWord}
              className="p-3 bg-paper-2 border-2 border-ink shadow-[3px_3px_0_#111] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
            >
              <div className="flex-1">
                <label
                  htmlFor="custom-quiz-word"
                  className="font-mono text-[10px] font-black uppercase text-ink block mb-1"
                >
                  UJI EJA NAMA ATAU KATA PILIHAN ANDA (2-12 HURUF A-Z):
                </label>
                <input
                  id="custom-quiz-word"
                  type="text"
                  value={customWordText}
                  onChange={(e) => setCustomWordText(e.target.value)}
                  placeholder="Contoh: MERDEKA atau NAMA ANDA"
                  maxLength={12}
                  className="w-full px-3 py-1.5 border-2 border-ink bg-paper font-mono text-xs font-bold uppercase text-ink focus:outline-none focus:bg-yellow/20"
                />
                {customInputError && (
                  <p className="font-mono text-[11px] font-bold text-coral mt-1">
                    {customInputError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 border-2 border-ink bg-mint text-ink font-mono text-xs font-black uppercase shadow-[2px_2px_0_#111] hover:bg-ink hover:text-white transition-colors cursor-pointer shrink-0 self-end"
              >
                Mulai Eja Kata Ini
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Arena Kuis Utama */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri (5 Kolom): Panggung Eja Kata & Komparator */}
          <div className="lg:col-span-5 space-y-5">
            {/* Pita Urutan 5 Kata dalam Paket */}
            <div className="border-[2.5px] border-ink bg-paper p-3 shadow-[4px_4px_0_#111]">
              <div className="flex items-center justify-between font-mono text-[10px] font-black uppercase text-ink/70 mb-2">
                <span>DAFTAR KATA DALAM SESI INI</span>
                <span>KLIK UNTUK PINDAH KATA</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {quizWords.map((word, idx) => {
                  const isCurrentWord = idx === wordIndex && !isCompleted;
                  const isDoneWord = idx < wordIndex || isCompleted;
                  return (
                    <button
                      key={`${word}-${idx}`}
                      type="button"
                      onClick={() => handleSelectWordTab(idx)}
                      className={`p-2 border-2 border-ink text-left font-mono transition-all cursor-pointer ${
                        isCurrentWord
                          ? "bg-yellow text-ink shadow-[2px_2px_0_#111] -translate-y-0.5 font-black"
                          : isDoneWord
                          ? "bg-mint text-ink font-bold"
                          : "bg-paper-2 text-ink/60 hover:bg-paper-3"
                      }`}
                    >
                      <span className="text-[9px] font-black block leading-none mb-1">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-black block truncate leading-tight">
                        {word}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!isCompleted ? (
              <div className="border-[3px] border-ink bg-paper p-5 sm:p-6 shadow-[6px_6px_0_#111]">
                {/* Header Kartu Kata Aktif */}
                <div className="flex items-center justify-between pb-3 mb-5 border-b-2 border-ink">
                  <div>
                    <span className="font-mono text-[10px] font-black uppercase text-ink/60 block">
                      KATA KE-{wordIndex + 1} ({currentWord.length} HURUF)
                    </span>
                    <h2 className="font-display font-black text-2xl text-ink tracking-tight">
                      EJA: {currentWord}
                    </h2>
                  </div>

                  <div className="px-3 py-1.5 bg-ink text-yellow border-2 border-ink font-mono text-xs font-black">
                    HURUF TARGET: [{targetLetter}]
                  </div>
                </div>

                {/* Kotak Ejaan Huruf demi Huruf */}
                <div className="py-3 mb-5">
                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                    {currentWord.split("").map((char, idx) => {
                      const isCurrent = idx === letterIndex;
                      const isPassed = idx < letterIndex;

                      return (
                        <div
                          key={`${char}-${idx}`}
                          className={`w-14 h-20 sm:w-16 sm:h-22 border-[3px] border-ink flex flex-col items-center justify-between py-2 font-display font-black transition-all ${
                            isCurrent
                              ? "bg-yellow text-ink scale-105 -translate-y-1 shadow-[5px_5px_0_#111] z-10"
                              : isPassed
                              ? "bg-mint text-ink shadow-[3px_3px_0_#111]"
                              : "bg-paper-2 text-ink/40 border-dashed"
                          }`}
                        >
                          <span className="font-mono text-[9px] font-black uppercase tracking-wider">
                            {isPassed ? "OK" : `#0${idx + 1}`}
                          </span>
                          <span className="text-2xl sm:text-3xl leading-none">
                            {char}
                          </span>
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-ink" />
                          ) : isCurrent ? (
                            <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 bg-ink text-yellow">
                              AKTIF
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono font-bold uppercase text-ink/40">
                              ANTRE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Komparator Langsung Target vs Terdeteksi Kamera */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-3 border-2 border-ink bg-paper-2">
                    <span className="font-mono text-[10px] font-black uppercase text-ink/60 block mb-1">
                      HURUF TARGET
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display font-black text-3xl text-ink">
                        {targetLetter}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-ink/70">
                        {targetAlphabetInfo?.gestureType === "dynamic"
                          ? "Gerak Dinamis"
                          : "Posisi Statis"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 border-2 border-ink transition-colors ${
                      isDetectingTarget
                        ? "bg-mint text-ink"
                        : predictedLetter
                        ? "bg-yellow/40 text-ink"
                        : "bg-paper-2 text-ink"
                    }`}
                  >
                    <span className="font-mono text-[10px] font-black uppercase text-ink/70 block mb-1">
                      TERDETEKSI KAMERA
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display font-black text-3xl text-ink">
                        {predictedLetter || "-"}
                      </span>
                      <span className="font-mono text-[10px] font-black uppercase">
                        {isDetectingTarget
                          ? "COCOK (TAHAN 1D)"
                          : predictedLetter
                          ? `KEYAKINAN ${confidencePct}%`
                          : "MENUNGGU TANGAN"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Baris Kontrol Bantuan & Lewati Huruf */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t-2 border-ink">
                  <button
                    type="button"
                    onClick={() => setShowHint((prev) => !prev)}
                    className={`px-3 py-2 border-2 border-ink text-xs font-mono font-black flex items-center gap-1.5 shadow-[2px_2px_0_#111] transition-colors cursor-pointer ${
                      showHint
                        ? "bg-ink text-yellow"
                        : "bg-yellow text-ink hover:bg-ink hover:text-yellow"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {showHint
                        ? `Tutup Contekan [${targetLetter}]`
                        : `Lihat Contekan Huruf [${targetLetter}]`}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => advanceToNextLetter(true)}
                      className="px-2.5 py-2 border-2 border-ink bg-paper-2 hover:bg-coral hover:text-white text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title={`Lewati huruf ${targetLetter} jika kamera sulit mendeteksi`}
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Lewati Huruf</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRestart}
                      className="px-2.5 py-2 border-2 border-ink bg-paper hover:bg-paper-3 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Ulangi paket kata dari awal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ulangi</span>
                    </button>
                  </div>
                </div>

                {/* Laci Contekan Diagram 21 Titik Sendi (Instan & Ringan) */}
                {showHint && targetAlphabetInfo && (
                  <div className="mt-4 p-4 bg-paper-2 border-2 border-ink shadow-[3px_3px_0_#111]">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <QuizHandDiagramSvg letter={targetLetter} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 bg-yellow border border-ink text-ink">
                            CONTEKAN HURUF {targetLetter}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-ink/60">
                            Kesulitan: {targetAlphabetInfo.difficulty}
                          </span>
                        </div>

                        <p className="font-sans text-xs font-bold text-ink leading-relaxed mb-2">
                          {targetAlphabetInfo.description}
                        </p>

                        {targetAlphabetInfo.tip && (
                          <p className="font-mono text-[11px] text-ink/75 bg-paper p-2 border border-ink mb-2.5">
                            <strong>Tips Kamera:</strong> {targetAlphabetInfo.tip}
                          </p>
                        )}

                        <Link
                          to={`/kamus`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-black text-cobalt hover:underline"
                        >
                          <span>Putar Model 3D Huruf {targetLetter} di Kamus</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Kartu Selesai Eja Seluruh Kata */
              <div className="border-[3px] border-ink bg-paper p-6 sm:p-8 shadow-[6px_6px_0_#111]">
                <div className="flex items-center justify-between border-b-2 border-ink pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow border-2 border-ink shadow-[3px_3px_0_#111] flex items-center justify-center shrink-0">
                      <Trophy className="w-6 h-6 text-ink" />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 bg-mint border border-ink text-ink">
                        SESI EJA SELESAI
                      </span>
                      <h3 className="font-display font-black text-2xl sm:text-3xl text-ink mt-1">
                        {quizWords.length} KATA TUNTAS DIEJA.
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Daftar Kata yang Diselesaikan */}
                <div className="mb-5">
                  <span className="font-mono text-[10px] font-black uppercase text-ink/60 block mb-2">
                    KATA YANG BERHASIL DIRANGKAI:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {quizWords.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className="px-3 py-1.5 bg-mint border-2 border-ink font-mono text-xs font-black text-ink shadow-[2px_2px_0_#111] flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{w}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bukti Metrik Sesi Nyata */}
                <div className="grid grid-cols-3 gap-2.5 mb-6 font-mono">
                  <div className="border-2 border-ink p-3 bg-paper-2">
                    <span className="text-[10px] uppercase text-ink/60 font-bold block">
                      Terkunci Kamera
                    </span>
                    <span className="text-xl font-black text-ink tabular-nums">
                      {lockedLettersCount} Huruf
                    </span>
                  </div>
                  <div className="border-2 border-ink p-3 bg-paper-2">
                    <span className="text-[10px] uppercase text-ink/60 font-bold block">
                      Total Durasi
                    </span>
                    <span className="text-xl font-black text-ink tabular-nums">
                      {formatTimer(timerSeconds)}
                    </span>
                  </div>
                  <div className="border-2 border-ink p-3 bg-paper-2">
                    <span className="text-[10px] uppercase text-ink/60 font-bold block">
                      Kecepatan Rata-Rata
                    </span>
                    <span className="text-xl font-black text-ink tabular-nums">
                      {avgSecondsPerLetter} d/hrf
                    </span>
                  </div>
                </div>

                {skippedLettersCount > 0 && (
                  <p className="font-mono text-xs text-ink/70 bg-yellow/30 border border-ink p-2.5 mb-5">
                    Catatan: Ada <strong>{skippedLettersCount} huruf</strong> yang dilewati manual pada sesi ini. Anda dapat mengulangi paket kata ini untuk mengunci seluruh huruf lewat kamera.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleGenerateNewWords(selectedCategory, selectedDifficulty)}
                    disabled={isLoadingWords}
                    className="btn btn-yellow flex-1 text-xs font-mono font-black py-3 px-4 flex items-center justify-center gap-2 shadow-[3px_3px_0_#111] cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Mainkan 5 Kata Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestart}
                    className="btn bg-paper-2 hover:bg-paper-3 text-xs font-mono font-bold py-3 px-4 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Ulangi Paket Ini</span>
                  </button>

                  <Link
                    to="/analitik"
                    className="btn bg-ink text-yellow hover:bg-cobalt hover:text-white text-xs font-mono font-black py-3 px-4 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Lihat Rapor</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan (7 Kolom): Panggung Kamera & Telemetri */}
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

            {/* Baris Panduan Teknis Kamera */}
            <div className="p-3.5 bg-paper-2 border-2 border-ink shadow-[3px_3px_0_#111] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-ink/80">
                <Camera className="w-4 h-4 text-cobalt shrink-0" />
                <span>
                  Posisikan telapak tangan di tengah bingkai kamera. Huruf terkunci otomatis saat keyakinan di atas <strong>75%</strong> selama <strong>1 detik</strong>.
                </span>
              </div>
              <Link
                to={`/latihan?letter=${targetLetter}`}
                className="font-black text-cobalt hover:underline shrink-0"
              >
                Latih Huruf {targetLetter} Saja
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
