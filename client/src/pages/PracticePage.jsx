import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Award,
  Lightbulb,
  Flame,
} from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import { saveProgress, sendTelemetry } from "../services/api";
import {
  HAND_CONNECTIONS,
  GROUP_COLORS,
  NODE_COLORS,
  getSibiHandPose3D,
} from "../components/creative/Hero3DSibiStage";

/**
 * Diagram Vektor SVG 21-Landmark Tangan SIBI yang ringan (0 loop rAF)
 * sehingga 100% beban GPU didedikasikan untuk inferensi kamera real-time.
 */
const TargetHandDiagramSvg = ({ letter }) => {
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
      className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 border-[2.5px] border-ink bg-paper-2 shadow-[3px_3px_0_#111]"
      aria-label={`Diagram bentuk tangan huruf ${letter}`}
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
          r={j.isWrist ? 3.8 : j.isTip ? 3.5 : 2.5}
          fill={j.isTip ? j.color : "#ffffff"}
          stroke="#111111"
          strokeWidth="1.6"
        />
      ))}
    </svg>
  );
};

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
  const [saveNotification, setSaveNotification] = useState(null);

  const currentAlphabet = SIBI_ALPHABETS_FALLBACK[currentIndex];
  const isDynamic = currentAlphabet.gestureType === "dynamic";
  const difficultyLabel =
    currentAlphabet.difficulty === "easy"
      ? "Mudah"
      : currentAlphabet.difficulty === "medium"
      ? "Sedang"
      : "Sulit";

  // Auto-clear notification setelah 4 detik
  useEffect(() => {
    if (saveNotification) {
      const t = setTimeout(() => setSaveNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [saveNotification]);

  // Sinkronisasi URL query param saat index berubah
  useEffect(() => {
    setSearchParams({ letter: currentAlphabet.letter }, { replace: true });
  }, [currentIndex, currentAlphabet.letter, setSearchParams]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : SIBI_ALPHABETS_FALLBACK.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < SIBI_ALPHABETS_FALLBACK.length - 1 ? prev + 1 : 0));
  };

  const handleLetterLocked = (detectedLetter) => {
    const isMatch = detectedLetter.toUpperCase() === currentAlphabet.letter;
    const conf = modelHook.telemetry.confidence || 85;

    sendTelemetry({
      sessionType: "practice",
      targetLabel: currentAlphabet.letter,
      predictedLabel: detectedLetter,
      confidence: conf,
      latencyMs: modelHook.telemetry.latencyMs || 25,
      fps: modelHook.telemetry.fps || 30,
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

      saveProgress({
        letter: currentAlphabet.letter,
        alphabetId: currentAlphabet.id,
        isMastered: true,
        isSuccess: true,
        confidence: conf,
      });

      setSaveNotification({
        isSuccess: true,
        message: `Bagus! Huruf ${currentAlphabet.letter} berhasil dikunci dan dicatat ke Rapor Belajar (+25 XP).`,
      });
    } else {
      setStreakCount(0);
      saveProgress({
        letter: currentAlphabet.letter,
        alphabetId: currentAlphabet.id,
        isMastered: false,
        isSuccess: false,
        confidence: conf,
      });
      setSaveNotification({
        isSuccess: false,
        message: `Terdeteksi huruf ${detectedLetter}, target latihan adalah ${currentAlphabet.letter}.`,
      });
    }
  };

  const handleManualRecord = () => {
    const detected =
      modelHook.telemetry.predictedLetter !== "-"
        ? modelHook.telemetry.predictedLetter
        : currentAlphabet.letter;
    const isMatch = detected.toUpperCase() === currentAlphabet.letter;
    const conf = modelHook.telemetry.confidence > 0 ? modelHook.telemetry.confidence : 85;

    sendTelemetry({
      sessionType: "practice",
      targetLabel: currentAlphabet.letter,
      predictedLabel: detected,
      confidence: conf,
      latencyMs: modelHook.telemetry.latencyMs || 25,
      fps: modelHook.telemetry.fps || 30,
      isSuccess: isMatch,
    });

    saveProgress({
      letter: currentAlphabet.letter,
      alphabetId: currentAlphabet.id,
      isMastered: isMatch,
      isSuccess: isMatch,
      confidence: conf,
    });

    if (isMatch) {
      setSuccessCount((prev) => prev + 1);
      setStreakCount((prev) => prev + 1);
      setTotalXp((prev) => prev + 25);
      setLastSuccessTime(new Date().toLocaleTimeString());
      confetti({ particleCount: 35, spread: 50 });
    }

    setSaveNotification({
      isSuccess: isMatch,
      message: isMatch
        ? `Sesi latihan huruf ${currentAlphabet.letter} berhasil disimpan ke Analitik!`
        : `Latihan huruf ${currentAlphabet.letter} tercatat (terdeteksi ${detected}). Terus berlatih!`,
    });
  };

  const predicted = modelHook.telemetry.predictedLetter || "-";
  const isMatchingLive = predicted === currentAlphabet.letter;

  return (
    <div className="min-h-screen bg-paper text-ink pt-16 pb-16">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-4xl text-ink tracking-tight">
              Latihan Mandiri: <span className="highlight">Huruf {currentAlphabet.letter}</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/80 font-medium mt-1">
              Tiru bentuk tangan pada kartu referensi, lalu tahan posisi stabil selama 1 detik di dalam kotak kamera.
            </p>
          </div>

          {/* Gamified Stat Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="border-2 border-ink bg-yellow px-3.5 py-1.5 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Flame className="w-4 h-4 text-coral fill-coral" aria-hidden="true" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/75 block leading-none">
                  Streak
                </span>
                <span className="text-base font-black text-ink leading-tight tabular-nums">
                  {streakCount}x
                </span>
              </div>
            </div>

            <div className="border-2 border-ink bg-mint px-3.5 py-1.5 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <Award className="w-4 h-4 text-ink" aria-hidden="true" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/75 block leading-none">
                  Total EXP
                </span>
                <span className="text-base font-black text-ink leading-tight tabular-nums">
                  +{totalXp} XP
                </span>
              </div>
            </div>

            <div className="border-2 border-ink bg-paper px-3.5 py-1.5 shadow-[3px_3px_0_#111] flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-cobalt" aria-hidden="true" />
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/75 block leading-none">
                  Selesai
                </span>
                <span className="text-base font-black text-ink leading-tight tabular-nums">
                  {successCount}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 26-Letter Quick Switcher Rail */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t-2 border-ink/15 overflow-x-auto pb-1 flex items-center gap-1.5 scrollbar-thin">
          <span className="text-xs font-mono font-black uppercase text-ink mr-1.5 whitespace-nowrap">
            Pilih Huruf:
          </span>
          {SIBI_ALPHABETS_FALLBACK.map((item, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={item.letter}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 shrink-0 border-2 border-ink font-display font-black text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-yellow text-ink shadow-[2px_2px_0_#111] -translate-y-0.5"
                    : "bg-paper text-ink hover:bg-paper-3 shadow-[1px_1px_0_#111]"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri (4 Kolom): Kartu Referensi Ringkas & To-The-Point */}
          <div className="lg:col-span-4">
            <div className="bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111]">
              {/* Header Bar Ringkas */}
              <div className="bg-yellow border-b-[3px] border-ink px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-ink text-yellow font-mono font-black text-xs">
                    #{String(currentAlphabet.id).padStart(2, "0")}/26
                  </span>
                  <span className="font-mono text-xs font-black uppercase text-ink">
                    {isDynamic ? "Gerak Dinamis" : "Gestur Statis"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="w-8 h-8 border-2 border-ink bg-paper hover:bg-paper-2 flex items-center justify-center shadow-[2px_2px_0_#111] cursor-pointer"
                    title="Huruf Sebelumnya"
                    aria-label="Huruf Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-8 h-8 border-2 border-ink bg-paper hover:bg-paper-2 flex items-center justify-center shadow-[2px_2px_0_#111] cursor-pointer"
                    title="Huruf Berikutnya"
                    aria-label="Huruf Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Baris Utama: Huruf Target + Diagram 21-Landmark Side-by-Side */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-ink/15">
                  <div>
                    <span className="font-display font-black text-7xl sm:text-8xl text-ink leading-none tracking-tight block">
                      {currentAlphabet.letter}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span
                        className={`tag text-[10px] ${
                          currentAlphabet.difficulty === "easy"
                            ? "tag-mint"
                            : currentAlphabet.difficulty === "medium"
                            ? "tag-yellow"
                            : "tag-coral"
                        }`}
                      >
                        {difficultyLabel}
                      </span>
                      <Link
                        to={`/kamus?letter=${currentAlphabet.letter}`}
                        className="font-mono text-[11px] font-bold text-cobalt hover:underline"
                      >
                        Lihat 3D di Kamus
                      </Link>
                    </div>
                  </div>

                  {/* Diagram Anatomi 21 Titik Tangan */}
                  <TargetHandDiagramSvg letter={currentAlphabet.letter} />
                </div>

                {/* Instruksi Langsung (Tanpa Kotak Berlapis-lapis) */}
                <div>
                  <span className="font-mono text-[11px] font-black uppercase tracking-wider text-ink block mb-1">
                    Posisi Jari:
                  </span>
                  <p className="font-sans text-xs sm:text-sm font-semibold text-ink leading-relaxed">
                    {currentAlphabet.description}
                  </p>
                </div>

                {/* Tips Singkat Satu Baris */}
                {currentAlphabet.tips && (
                  <div className="p-3 bg-yellow/25 border-2 border-ink flex items-start gap-2.5 text-xs text-ink">
                    <Lightbulb className="w-4 h-4 text-ink shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="font-medium leading-relaxed">{currentAlphabet.tips}</p>
                  </div>
                )}

                {/* Komparator Live Target vs Prediksi Kamera */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-paper-2 border-2 border-ink text-center">
                    <span className="font-mono text-[10px] font-bold uppercase text-ink/75 block">
                      Target
                    </span>
                    <span className="font-display font-black text-2xl text-ink leading-tight">
                      {currentAlphabet.letter}
                    </span>
                  </div>
                  <div
                    className={`p-2.5 border-2 border-ink text-center transition-colors ${
                      isMatchingLive ? "bg-mint text-ink" : "bg-paper-2 text-ink"
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold uppercase text-ink/75 block">
                      Terdeteksi
                    </span>
                    <span className="font-display font-black text-2xl leading-tight">
                      {predicted}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan (8 Kolom): Live Webcam & Tactical HUD */}
          <div className="lg:col-span-8 space-y-4">
            {/* Notifikasi Hasil Simpan Telemetri */}
            {saveNotification && (
              <div
                className={`p-3 border-[2.5px] border-ink shadow-[4px_4px_0_#111] flex items-center justify-between gap-3 text-xs font-mono font-bold ${
                  saveNotification.isSuccess ? "bg-mint text-ink" : "bg-yellow text-ink"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-ink" />
                  <span>{saveNotification.message}</span>
                </div>
                <Link
                  to="/analitik"
                  className="shrink-0 bg-ink text-paper px-2.5 py-1 text-[10px] font-mono hover:bg-paper hover:text-ink border border-ink transition-colors"
                >
                  Lihat Analitik →
                </Link>
              </div>
            )}

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

            {/* Live Coaching & Quick Actions Bar */}
            <div className="p-3.5 bg-paper-2 border-[2.5px] border-ink shadow-[4px_4px_0_#111] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="tag tag-ink text-[10px]">STATUS:</span>
                {isMatchingLive ? (
                  <span className="font-bold text-ink bg-mint px-2 py-0.5 border border-ink flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Gestur cocok! Tahan 1 detik untuk mengunci.
                  </span>
                ) : (
                  <span className="text-ink font-bold">
                    Bentuk huruf <strong className="text-coral underline font-black">{currentAlphabet.letter}</strong> di dalam kotak kamera.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {lastSuccessTime && (
                  <span className="text-[10px] font-bold text-ink/75 bg-paper px-2 py-1 border border-ink">
                    Terkunci: {lastSuccessTime}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleManualRecord}
                  className="btn bg-mint hover:bg-mint/80 text-ink text-xs font-mono py-2 px-3 flex items-center gap-1.5 shadow-[2px_2px_0_#111]"
                  title="Simpan sesi latihan huruf ini langsung ke Analitik"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Catat Selesai</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-yellow text-xs font-mono py-2 px-3.5 flex items-center gap-1.5 shadow-[2px_2px_0_#111]"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
