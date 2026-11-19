import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Volume2,
  Delete,
  RotateCcw,
  CornerDownLeft,
  Wand2,
  Mic,
  MicOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Move3d,
  Camera,
  Hand,
  CheckCircle2,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import {
  sendTelemetry,
  interpretSigns,
  expandTextVariations,
} from "../services/api";
import {
  HAND_CONNECTIONS,
  GROUP_COLORS,
  NODE_COLORS,
  NEUTRAL_OPEN_POSE,
  rotatePoint3D,
  getSibiHandPose3D,
} from "../components/creative/Hero3DSibiStage";

const PRESET_SENTENCES = [
  "HALO APA KABAR",
  "TERIMA KASIH BANYAK",
  "SAYA BELAJAR SIBI",
  "SENANG BERTEMU DENGANMU",
  "TOLONG BANTU SAYA",
];

const SPEED_OPTIONS = [
  { label: "0.75x Lambat", ms: 1650 },
  { label: "1.0x Normal", ms: 1150 },
  { label: "1.5x Cepat", ms: 760 },
];

// Kamus prediksi kata Bahasa Indonesia real-time saat mengeja lewat kamera
const INDONESIAN_LEXICON = [
  "HALO", "HAI", "HARI", "HARAPAN", "HATI", "HAUS",
  "SAYA", "SALAM", "SAMPAI", "SAMA", "SAKIT", "SAHABAT", "SEHAT", "SELAMAT", "SEMANGAT", "SENANG", "SIANG", "SORE", "SUDAH", "SUKA",
  "TERIMA", "KASIH", "TOLONG", "TEMAN", "TANGAN", "TANYA", "TAHU", "TIDAK", "TINGGAL",
  "MAKAN", "MINUM", "MAAF", "MALAM", "MARI", "MAU", "MULAI", "MUDAH",
  "BELAJAR", "BISA", "BAIK", "BANTU", "BARU", "BUKU", "BICARA", "BERANI",
  "KAMU", "KITA", "KAMI", "KABAR", "KAMPUS", "KELUARGA", "KERJA",
  "NAMA", "NANTI", "NYAMAN",
  "PAGI", "PERKENALKAN", "PERLU", "PULANG", "PINTAR",
  "AJIN", "ISYARAT", "INDONESIA", "INGIN", "INI", "ITU",
  "JUMPA", "JALAN", "JANGAN",
  "DIMANA", "DARI", "DENGAN", "DATANG",
  "APA", "ADA", "AYO", "AMAN",
];

// Prediksi kata berikutnya (next-word) berdasarkan kata terakhir yang selesai dieja
const NEXT_WORD_MAP = {
  HALO: ["TEMAN", "APA", "SELAMAT", "SAYA"],
  SELAMAT: ["PAGI", "SIANG", "SORE", "MALAM"],
  TERIMA: ["KASIH"],
  KASIH: ["BANYAK", "TEMAN"],
  SAYA: ["BELAJAR", "MAU", "INGIN", "SENANG", "PERLU"],
  APA: ["KABAR", "INI"],
  TOLONG: ["BANTU", "SAYA"],
  BANTU: ["SAYA", "KAMI"],
  NAMA: ["SAYA", "KAMU"],
  SAMPAI: ["JUMPA", "NANTI"],
  SENANG: ["BERTEMU", "BELAJAR"],
};

const EXPAND_MODES = [
  { id: "casual", label: "Santai" },
  { id: "formal", label: "Formal" },
  { id: "question", label: "Pertanyaan" },
];

/**
 * Kanvas 3D Koreografer Kalimat SIBI.
 * Memperagakan urutan huruf dalam kalimat satu per satu dengan transisi biomekanik 2 tahap.
 */
const SignChoreographer3DCanvas = ({ activeLetter }) => {
  const canvasRef = useRef(null);
  const DEFAULT_ROT = { x: 0.16, y: -0.24 };
  const rotationRef = useRef({ x: DEFAULT_ROT.x, y: DEFAULT_ROT.y });
  const showcaseRotRef = useRef({ x: 0, y: 0.06 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [isRotated, setIsRotated] = useState(false);

  const safeLetter = /^[A-Z]$/.test(activeLetter) ? activeLetter : "A";
  const initialPose = useMemo(() => getSibiHandPose3D(safeLetter), []);
  const currentLandmarksRef = useRef(initialPose.points.map((p) => [...p]));
  const prevLandmarksRef = useRef(initialPose.points.map((p) => [...p]));
  const midOpenLandmarksRef = useRef(initialPose.points.map((p) => [...p]));
  const targetPoseRef = useRef(initialPose);
  const transitionStartRef = useRef(0);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!/^[A-Z]$/.test(activeLetter)) return;
    prevLandmarksRef.current = currentLandmarksRef.current.map((p) => [...p]);
    const nextPose = getSibiHandPose3D(activeLetter);
    targetPoseRef.current = nextPose;

    midOpenLandmarksRef.current = prevLandmarksRef.current.map((prevPt, idx) => {
      const openPt = NEUTRAL_OPEN_POSE[idx];
      const tgtPt = nextPose.points[idx];
      return [
        openPt[0] * 0.55 + prevPt[0] * 0.25 + tgtPt[0] * 0.20,
        openPt[1] * 0.55 + prevPt[1] * 0.25 + tgtPt[1] * 0.20,
        openPt[2] * 0.55 + prevPt[2] * 0.25 + tgtPt[2] * 0.20,
      ];
    });

    transitionStartRef.current = performance.now();
  }, [activeLetter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let time = 0;
    let lastTime = performance.now();

    const project = ([vx, vy, vz], width, height, rotX, rotY) => {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const x1 = vx * cy + vz * sy;
      const z1 = -vx * sy + vz * cy;

      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const y2 = vy * cx - z1 * sx;
      const z2 = vy * sx + z1 * cx;

      const cameraDist = 2.85;
      const scale = cameraDist / (cameraDist - z2);
      const unit = Math.min(width, height) * 0.44;

      return {
        x: width / 2 + x1 * unit * scale,
        y: height / 2 - y2 * unit * scale + height * 0.06,
        z: z2,
        scale,
      };
    };

    const render = (now) => {
      const dt = Math.min(100, Math.max(0, now - lastTime));
      lastTime = now;
      time += dt * 0.0015;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(240, Math.floor(rect.width));
      const height = Math.max(220, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const targetPts = targetPoseRef.current.points;
      const prevPts = prevLandmarksRef.current;
      const midPts = midOpenLandmarksRef.current;
      const currPts = currentLandmarksRef.current;

      const tRaw = prefersReducedMotion
        ? 1
        : Math.min(1, Math.max(0, (now - transitionStartRef.current) / 560));

      let waveLiftY = 0;
      let waveRoll = 0;
      let waveYaw = 0;

      if (tRaw < 1 && !prefersReducedMotion) {
        const arc = Math.sin(tRaw * Math.PI);
        waveLiftY = arc * 0.08;
        waveYaw = arc * 0.26;
        waveRoll = Math.sin(tRaw * Math.PI * 2) * 0.08;
      }

      for (let i = 0; i < 21; i++) {
        if (tRaw >= 1) {
          currPts[i][0] = targetPts[i][0];
          currPts[i][1] = targetPts[i][1];
          currPts[i][2] = targetPts[i][2];
        } else if (tRaw < 0.38) {
          const u1 = tRaw / 0.38;
          const e1 = 1 - Math.pow(1 - u1, 2);
          currPts[i][0] = prevPts[i][0] + (midPts[i][0] - prevPts[i][0]) * e1;
          currPts[i][1] = prevPts[i][1] + (midPts[i][1] - prevPts[i][1]) * e1;
          currPts[i][2] = prevPts[i][2] + (midPts[i][2] - prevPts[i][2]) * e1;
        } else {
          const u2 = (tRaw - 0.38) / 0.62;
          const e2 = 1 - Math.pow(1 - u2, 3);
          currPts[i][0] = midPts[i][0] + (targetPts[i][0] - midPts[i][0]) * e2;
          currPts[i][1] = midPts[i][1] + (targetPts[i][1] - midPts[i][1]) * e2;
          currPts[i][2] = midPts[i][2] + (targetPts[i][2] - midPts[i][2]) * e2;
        }
      }

      const showcaseSpeed = prefersReducedMotion ? 1 : 0.12;
      showcaseRotRef.current.y += (targetPoseRef.current.viewYaw - showcaseRotRef.current.y) * showcaseSpeed;
      showcaseRotRef.current.x += (targetPoseRef.current.viewPitch - showcaseRotRef.current.x) * showcaseSpeed;

      const idleY = !isDraggingRef.current && !prefersReducedMotion ? Math.sin(time * 0.85) * 0.08 : 0;
      const gridRotX = rotationRef.current.x;
      const gridRotY = rotationRef.current.y + idleY;
      const handRotX = gridRotX + showcaseRotRef.current.x;
      const handRotY = gridRotY + showcaseRotRef.current.y + waveYaw;

      // Grid lantai 3D
      ctx.save();
      ctx.strokeStyle = "rgba(17, 17, 17, 0.14)";
      ctx.lineWidth = 1;
      const floorY = -0.82;
      const gridSize = 1.05;
      const steps = 4;
      for (let i = -steps; i <= steps; i++) {
        const offset = (i / steps) * gridSize;
        const a1 = project([-gridSize, floorY, offset], width, height, gridRotX, gridRotY);
        const a2 = project([gridSize, floorY, offset], width, height, gridRotX, gridRotY);
        ctx.beginPath();
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(a2.x, a2.y);
        ctx.stroke();

        const b1 = project([offset, floorY, -gridSize], width, height, gridRotX, gridRotY);
        const b2 = project([offset, floorY, gridSize], width, height, gridRotX, gridRotY);
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.stroke();
      }
      ctx.restore();

      const animatedPts = currPts.map((pt) => {
        const [rx, ry, rz] = waveRoll !== 0 ? rotatePoint3D(pt, 0, 0, waveRoll) : pt;
        return [rx, ry + waveLiftY, rz];
      });
      const projected = animatedPts.map((pt) => project(pt, width, height, handRotX, handRotY));

      // Bayangan lantai
      ctx.save();
      ctx.fillStyle = "rgba(17, 17, 17, 0.11)";
      const shadowCenter = project([0, floorY, 0], width, height, gridRotX, gridRotY);
      ctx.beginPath();
      ctx.ellipse(shadowCenter.x, shadowCenter.y, 46 * shadowCenter.scale, 14 * shadowCenter.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Lintasan dinamis J & Z
      const dyn = targetPoseRef.current.dynamic;
      if (dyn === "J" || dyn === "Z") {
        const pathPts = dyn === "J"
          ? [
              [0.36, 0.56 + waveLiftY, 0.08],
              [0.36, 0.25 + waveLiftY, 0.08],
              [0.34, -0.04 + waveLiftY, 0.12],
              [0.14, -0.14 + waveLiftY, 0.18],
              [-0.04, -0.02 + waveLiftY, 0.16],
            ]
          : [
              [-0.32, 0.62 + waveLiftY, 0.16],
              [0.24, 0.62 + waveLiftY, 0.16],
              [-0.30, 0.14 + waveLiftY, 0.18],
              [0.28, 0.14 + waveLiftY, 0.18],
            ];

        const projPath = pathPts.map((pt) => project(pt, width, height, handRotX, handRotY));
        ctx.save();
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        projPath.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        const tCycle = (time * 0.7) % 1;
        const segFloat = tCycle * (projPath.length - 1);
        const segIdx = Math.min(projPath.length - 2, Math.floor(segFloat));
        const localT = segFloat - segIdx;
        const pStart = projPath[segIdx];
        const pEnd = projPath[segIdx + 1];
        const mx = pStart.x + (pEnd.x - pStart.x) * localT;
        const my = pStart.y + (pEnd.y - pStart.y) * localT;

        ctx.fillStyle = dyn === "J" ? "#FF4D4D" : "#FFD000";
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      const drawQueue = [];
      HAND_CONNECTIONS.forEach((conn) => {
        const a = projected[conn.from];
        const b = projected[conn.to];
        drawQueue.push({
          type: "bone",
          depth: (a.z + b.z) / 2,
          a,
          b,
          color: GROUP_COLORS[conn.group],
          isPalm: conn.group === "palm",
        });
      });

      projected.forEach((node, idx) => {
        drawQueue.push({
          type: "joint",
          depth: node.z + 0.002,
          node,
          idx,
          color: NODE_COLORS[idx],
          isTip: idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20,
          isWrist: idx === 0,
        });
      });

      drawQueue.sort((u, v) => u.depth - v.depth);

      drawQueue.forEach((item) => {
        if (item.type === "bone") {
          const avgScale = (item.a.scale + item.b.scale) / 2;
          const baseWidth = (item.isPalm ? 7.5 : 8.5) * avgScale;

          ctx.strokeStyle = "#111111";
          ctx.lineCap = "round";
          ctx.lineWidth = baseWidth + 3.5;
          ctx.beginPath();
          ctx.moveTo(item.a.x, item.a.y);
          ctx.lineTo(item.b.x, item.b.y);
          ctx.stroke();

          ctx.strokeStyle = item.color;
          ctx.lineWidth = baseWidth;
          ctx.beginPath();
          ctx.moveTo(item.a.x, item.a.y);
          ctx.lineTo(item.b.x, item.b.y);
          ctx.stroke();
        } else {
          const r = (item.isWrist ? 7.2 : item.isTip ? 6.4 : 4.6) * item.node.scale;
          ctx.fillStyle = item.isTip ? item.color : "#ffffff";
          ctx.strokeStyle = "#111111";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(item.node.x, item.node.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [prefersReducedMotion]);

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    rotationRef.current.y += dx * 0.012;
    rotationRef.current.x = Math.max(-1.15, Math.min(1.15, rotationRef.current.x + dy * 0.012));

    const moved =
      Math.abs(rotationRef.current.x - DEFAULT_ROT.x) > 0.06 ||
      Math.abs(rotationRef.current.y - DEFAULT_ROT.y) > 0.06;
    if (moved && !isRotated) setIsRotated(true);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleReset = () => {
    rotationRef.current = { x: DEFAULT_ROT.x, y: DEFAULT_ROT.y };
    setIsRotated(false);
  };

  return (
    <div className="relative bg-paper-2 border-[2.5px] border-ink shadow-[4px_4px_0_#111] overflow-hidden">
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper border-[1.5px] border-ink shadow-[2px_2px_0_#111] font-mono text-[10px] font-bold text-ink">
          <Move3d className="w-3.5 h-3.5 text-cobalt" aria-hidden="true" />
          <span>Putar 360 Derajat</span>
        </span>

        {isRotated && (
          <button
            type="button"
            onClick={handleReset}
            className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 bg-yellow hover:bg-yellow-dark border-[1.5px] border-ink shadow-[2px_2px_0_#111] font-mono text-[10px] font-black text-ink cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span>Reset Sudut</span>
          </button>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={`Peraga 3D isyarat tangan SIBI huruf ${safeLetter}`}
        className="w-full h-64 sm:h-72 block cursor-grab active:cursor-grabbing touch-none"
      />
    </div>
  );
};

export const AiCompanionPage = ({ modelHook }) => {
  // Mode Jembatan: 'text-to-sign' (Teks/Suara ke Peraga 3D) | 'sign-to-voice' (Kamera Isyarat ke Kata & Suara)
  const [bridgeMode, setBridgeMode] = useState("text-to-sign");

  // =========================================================================
  // ARAH 1: TEKS / SUARA KE PERAGA ISYARAT 3D
  // =========================================================================
  const [inputSentence, setInputSentence] = useState("HALO TEMAN");
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [isPlayingSign, setIsPlayingSign] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1); // 1.0x Normal
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isSimplifyingAi, setIsSimplifyingAi] = useState(false);
  const recognitionRef = useRef(null);

  // Daftar karakter valid (A-Z dan spasi tunggal)
  const normalizedSentence = useMemo(() => {
    const cleaned = inputSentence
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || "HALO";
  }, [inputSentence]);

  const charTokens = useMemo(() => normalizedSentence.split(""), [normalizedSentence]);
  const safeCharIdx = Math.min(activeCharIdx, Math.max(0, charTokens.length - 1));
  const currentSignChar = charTokens[safeCharIdx] || "H";

  // Cari huruf A-Z aktif (jika token saat ini spasi, tampilkan huruf terdekat untuk pose tangan)
  const activeAlphabetObj = useMemo(() => {
    const targetChar = /^[A-Z]$/.test(currentSignChar)
      ? currentSignChar
      : charTokens.find((c) => /^[A-Z]$/.test(c)) || "A";
    return (
      SIBI_ALPHABETS_FALLBACK.find((a) => a.letter === targetChar) ||
      SIBI_ALPHABETS_FALLBACK[0]
    );
  }, [currentSignChar, charTokens]);

  // Loop otomatis peraga kalimat 3D huruf demi huruf
  useEffect(() => {
    if (bridgeMode !== "text-to-sign" || !isPlayingSign || charTokens.length <= 1) return;
    const intervalMs = SPEED_OPTIONS[speedIdx]?.ms || 1150;
    const timer = setInterval(() => {
      setActiveCharIdx((prev) => (prev + 1) % charTokens.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [bridgeMode, isPlayingSign, charTokens.length, speedIdx]);

  // Speech-to-Text Bahasa Indonesia (Mic Input)
  const handleToggleMic = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert("Peramban ini belum mendukung pengenalan suara Web Speech API. Gunakan Google Chrome atau Microsoft Edge.");
      return;
    }

    if (isListeningMic && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "id-ID";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setIsListeningMic(true);
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          const formatted = transcript
            .toUpperCase()
            .replace(/[^A-Z\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (formatted) {
            setInputSentence(formatted);
            setActiveCharIdx(0);
            setIsPlayingSign(true);
          }
        }
      };
      rec.onerror = () => setIsListeningMic(false);
      rec.onend = () => setIsListeningMic(false);

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  // Ringkas kalimat panjang menjadi frasa ejaan SIBI inti dengan AI
  const handleAiSimplifyToSibi = async () => {
    if (!inputSentence.trim() || isSimplifyingAi) return;
    setIsSimplifyingAi(true);
    try {
      const letters = normalizedSentence.split("");
      const res = await interpretSigns(letters, "umum");
      if (res?.corrected) {
        const cleanCorrected = res.corrected
          .toUpperCase()
          .replace(/[^A-Z\s]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (cleanCorrected) {
          setInputSentence(cleanCorrected);
          setActiveCharIdx(0);
          setIsPlayingSign(true);
        }
      }
    } finally {
      setIsSimplifyingAi(false);
    }
  };

  // =========================================================================
  // ARAH 2: KAMERA ISYARAT KE PREDIKSI KATA & SUARA INSTAN
  // =========================================================================
  const [signedText, setSignedText] = useState("");
  const [lastLockedChar, setLastLockedChar] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPolishingAi, setIsPolishingAi] = useState(false);
  const [expandMode, setExpandMode] = useState("casual");
  const [aiPolishedSentence, setAiPolishedSentence] = useState("");
  const [aiVariations, setAiVariations] = useState([]);

  // Analisis kata yang sedang diketik untuk Autocomplete & Next-Word Prediction
  const { currentPartialWord, completedWords, wordPredictions, nextWordPredictions } = useMemo(() => {
    const endsWithSpace = signedText.endsWith(" ");
    const tokens = signedText.trim().split(/\s+/).filter(Boolean);
    const partial = endsWithSpace ? "" : (tokens[tokens.length - 1] || "").toUpperCase();
    const lastCompleted = endsWithSpace
      ? (tokens[tokens.length - 1] || "").toUpperCase()
      : (tokens[tokens.length - 2] || "").toUpperCase();

    const prefixMatches =
      partial.length >= 1
        ? INDONESIAN_LEXICON.filter(
            (w) => w.startsWith(partial) && w !== partial
          ).slice(0, 5)
        : [];

    const nextMatches =
      partial.length === 0 && lastCompleted && NEXT_WORD_MAP[lastCompleted]
        ? NEXT_WORD_MAP[lastCompleted]
        : partial.length === 0 && tokens.length === 0
        ? ["HALO", "SAYA", "TERIMA", "SELAMAT", "TOLONG"]
        : [];

    return {
      currentPartialWord: partial,
      completedWords: tokens,
      wordPredictions: prefixMatches,
      nextWordPredictions: nextMatches,
    };
  }, [signedText]);

  // Text-to-Speech Bahasa Indonesia
  const speakIndonesian = useCallback((textToRead) => {
    const clean = (textToRead || "").trim();
    if (!clean || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().includes("id"));
    if (idVoice) utterance.voice = idVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleCameraLetterLocked = useCallback(
    (letter) => {
      setLastLockedChar(letter);
      setSignedText((prev) => prev + letter);

      sendTelemetry({
        sessionType: "narrative",
        targetLabel: letter,
        predictedLabel: letter,
        confidence: modelHook.telemetry.confidence || 88,
        latencyMs: modelHook.telemetry.latencyMs || 24,
        fps: modelHook.telemetry.fps || 30,
        isSuccess: true,
      });
    },
    [modelHook.telemetry]
  );

  // Terapkan prediksi kata dalam 1 klik
  const handleApplyWordPrediction = (word, isCompletingPartial = true) => {
    setSignedText((prev) => {
      if (!isCompletingPartial) {
        const base = prev.trim();
        return base ? `${base} ${word} ` : `${word} `;
      }
      const parts = prev.trimEnd().split(/\s+/);
      parts[parts.length - 1] = word;
      return parts.join(" ") + " ";
    });
  };

  const handleAddSpace = () => {
    setSignedText((prev) => (prev.endsWith(" ") || !prev ? prev : prev + " "));
  };

  const handleDeleteChar = () => {
    setSignedText((prev) => prev.slice(0, -1));
  };

  const handleClearSigned = () => {
    setSignedText("");
    setLastLockedChar("");
    setAiPolishedSentence("");
    setAiVariations([]);
  };

  // Poles dan suarakan kalimat dengan Gemini AI (atau fallback cerdas instan)
  const handlePolishAndSpeakAi = async (modeOverride = expandMode, shouldSpeak = true) => {
    const raw = signedText.trim();
    if (!raw || isPolishingAi) return;
    setIsPolishingAi(true);
    try {
      const [interpRes, expandRes] = await Promise.all([
        interpretSigns(raw.split(""), "umum"),
        expandTextVariations(raw, modeOverride),
      ]);
      const finalSentence =
        interpRes?.suggestion || `Saya sedang membahas tentang ${raw.toLowerCase()}.`;
      setAiPolishedSentence(finalSentence);
      setAiVariations(Array.isArray(expandRes?.variations) ? expandRes.variations : []);
      if (shouldSpeak) {
        speakIndonesian(finalSentence);
      }
    } finally {
      setIsPolishingAi(false);
    }
  };

  const handleSelectExpandMode = async (newMode) => {
    setExpandMode(newMode);
    if (signedText.trim() && aiPolishedSentence) {
      await handlePolishAndSpeakAi(newMode, false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-16 pb-20">
      {/* Header & Pengalih Jembatan 2 Arah */}
      <section className="border-b-[3px] border-ink bg-paper-2 py-7 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-yellow border-[2px] border-ink shadow-[2px_2px_0_#111] font-mono text-xs font-black uppercase mb-2.5">
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Jembatan Komunikasi 2 Arah SIBI</span>
              </div>
              <h1 className="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-[1.03]">
                Jembatan <span className="highlight">Isyarat &amp; Narasi</span>
              </h1>
              <p className="mt-2 font-sans text-sm sm:text-base text-ink/80 max-w-2xl font-medium leading-relaxed">
                Terjemahkan kalimat atau suara Bahasa Indonesia menjadi peragaan tangan 3D Sistem Isyarat Bahasa Indonesia (SIBI), atau rangkai isyarat kamera menjadi kalimat bersuara dengan prediksi kata instan.
              </p>
            </div>

            {/* Tab Pengalih 2 Arah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setBridgeMode("text-to-sign")}
                className={`min-h-[48px] px-4 py-2.5 border-[2.5px] border-ink font-mono text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  bridgeMode === "text-to-sign"
                    ? "bg-yellow text-ink shadow-[4px_4px_0_#111] -translate-y-0.5"
                    : "bg-paper text-ink hover:bg-paper-3 shadow-[2px_2px_0_#111]"
                }`}
                aria-pressed={bridgeMode === "text-to-sign"}
              >
                <Move3d className="w-4 h-4 text-cobalt" aria-hidden="true" />
                <span>1. Teks / Suara ke Tangan 3D</span>
              </button>

              <button
                type="button"
                onClick={() => setBridgeMode("sign-to-voice")}
                className={`min-h-[48px] px-4 py-2.5 border-[2.5px] border-ink font-mono text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  bridgeMode === "sign-to-voice"
                    ? "bg-yellow text-ink shadow-[4px_4px_0_#111] -translate-y-0.5"
                    : "bg-paper text-ink hover:bg-paper-3 shadow-[2px_2px_0_#111]"
                }`}
                aria-pressed={bridgeMode === "sign-to-voice"}
              >
                <Camera className="w-4 h-4 text-coral" aria-hidden="true" />
                <span>2. Kamera Isyarat ke Suara</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {bridgeMode === "text-to-sign" ? (
          /* =================================================================
             ARAH 1: TEKS & SUARA -> KOREOGRAFER TANGAN 3D SIBI
          ================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            {/* Kolom Kiri (6 Kolom): Input Kalimat, Suara Mic, & Pita Urutan Huruf */}
            <div className="lg:col-span-6 space-y-5">
              {/* Kartu Input Kalimat & Mikrofon */}
              <div className="bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b-2 border-ink">
                  <label
                    htmlFor="sibi-sentence-input"
                    className="font-mono text-xs font-black uppercase text-ink"
                  >
                    Ketik atau Ucapkan Kalimat Bahasa Indonesia:
                  </label>
                  <span className="font-mono text-xs font-bold text-ink/75">
                    {charTokens.filter((c) => c !== " ").length} Huruf
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                  <input
                    id="sibi-sentence-input"
                    type="text"
                    value={inputSentence}
                    onChange={(e) => {
                      setInputSentence(e.target.value);
                      setActiveCharIdx(0);
                    }}
                    placeholder="Contoh: HALO NAMA SAYA ADIT"
                    maxLength={60}
                    className="flex-1 min-h-[46px] px-3.5 py-2.5 border-[2.5px] border-ink bg-paper-2 font-mono font-black text-base text-ink uppercase placeholder-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 shadow-[3px_3px_0_#111]"
                  />

                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`btn min-h-[46px] px-4 text-xs font-mono uppercase ${
                      isListeningMic ? "btn-coral" : "btn-yellow"
                    }`}
                    title="Ucapkan kalimat dengan mikrofon Bahasa Indonesia"
                  >
                    {isListeningMic ? (
                      <>
                        <MicOff className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        <span>Mendengarkan...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        <span>Bicara (Mic)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Preset Frasa Percakapan Cepat */}
                <div className="mb-4">
                  <span className="font-mono text-[11px] font-bold uppercase text-ink/75 block mb-1.5">
                    Contoh Frasa Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SENTENCES.map((phrase) => (
                      <button
                        key={phrase}
                        type="button"
                        onClick={() => {
                          setInputSentence(phrase);
                          setActiveCharIdx(0);
                          setIsPlayingSign(true);
                        }}
                        className={`px-2.5 py-1.5 border-[2px] border-ink font-mono text-[11px] font-bold cursor-pointer transition-all ${
                          normalizedSentence === phrase
                            ? "bg-ink text-yellow shadow-[2px_2px_0_#FFD000]"
                            : "bg-paper-2 text-ink hover:bg-yellow"
                        }`}
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aksi AI Ringkas & Suarakan */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t-2 border-ink/15">
                  <button
                    type="button"
                    onClick={handleAiSimplifyToSibi}
                    disabled={isSimplifyingAi || !inputSentence.trim()}
                    className="btn bg-paper-2 hover:bg-yellow text-ink text-xs font-mono py-2 px-3.5 min-h-[40px] disabled:opacity-50"
                  >
                    {isSimplifyingAi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        <span>Merapikan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cobalt" />
                        <span>Rapikan Ejaan dengan AI</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => speakIndonesian(normalizedSentence)}
                    className="btn btn-mint text-xs font-mono py-2 px-3.5 min-h-[40px]"
                  >
                    <Volume2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    <span>Dengar Suara Kalimat</span>
                  </button>
                </div>
              </div>

              {/* Pita Koreografi Huruf demi Huruf */}
              <div className="bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b-2 border-ink">
                  <span className="font-mono text-xs font-black uppercase text-ink">
                    Urutan Peragaan Ejaan SIBI:
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-cobalt">
                    Langkah {safeCharIdx + 1} / {charTokens.length}
                  </span>
                </div>

                {/* Barisan Tile Huruf */}
                <div className="flex flex-wrap items-center gap-1.5 mb-5">
                  {charTokens.map((ch, idx) => {
                    const isCurrent = idx === safeCharIdx;
                    const isPast = idx < safeCharIdx;
                    if (ch === " ") {
                      return (
                        <button
                          key={`sp-${idx}`}
                          type="button"
                          onClick={() => {
                            setActiveCharIdx(idx);
                            setIsPlayingSign(false);
                          }}
                          className={`h-10 px-2.5 border-[2px] font-mono text-[10px] font-bold uppercase cursor-pointer ${
                            isCurrent
                              ? "bg-yellow text-ink border-ink shadow-[2px_2px_0_#111]"
                              : "bg-paper-2 text-ink/70 border-dashed border-ink/40"
                          }`}
                          title="Jeda Antar Kata (Spasi)"
                        >
                          Spasi
                        </button>
                      );
                    }
                    return (
                      <button
                        key={`ch-${idx}`}
                        type="button"
                        onClick={() => {
                          setActiveCharIdx(idx);
                          setIsPlayingSign(false);
                        }}
                        className={`w-10 h-10 border-[2px] border-ink font-display font-black text-base flex items-center justify-center cursor-pointer transition-all ${
                          isCurrent
                            ? "bg-yellow text-ink shadow-[3px_3px_0_#111] -translate-y-1 scale-105"
                            : isPast
                            ? "bg-mint/35 text-ink"
                            : "bg-paper text-ink hover:bg-paper-2"
                        }`}
                        aria-label={`Lompat ke huruf ${ch} (urutan ${idx + 1})`}
                        aria-pressed={isCurrent}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>

                {/* Kontrol Pemutaran Koreografi & Kecepatan */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-ink">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingSign(false);
                        setActiveCharIdx((prev) => (prev - 1 + charTokens.length) % charTokens.length);
                      }}
                      className="btn bg-paper-2 hover:bg-yellow p-2.5 min-h-[40px]"
                      title="Huruf Sebelumnya"
                      aria-label="Huruf Sebelumnya"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPlayingSign((prev) => !prev)}
                      className={`btn text-xs font-mono py-2 px-4 min-h-[40px] ${
                        isPlayingSign ? "btn-yellow" : "btn-mint"
                      }`}
                    >
                      {isPlayingSign ? (
                        <>
                          <Pause className="w-4 h-4 mr-1.5" aria-hidden="true" />
                          <span>Jeda Peraga</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1.5" aria-hidden="true" />
                          <span>Putar Otomatis</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingSign(false);
                        setActiveCharIdx((prev) => (prev + 1) % charTokens.length);
                      }}
                      className="btn bg-paper-2 hover:bg-yellow p-2.5 min-h-[40px]"
                      title="Huruf Berikutnya"
                      aria-label="Huruf Berikutnya"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pilihan Kecepatan */}
                  <div className="flex items-center gap-1">
                    {SPEED_OPTIONS.map((sp, idx) => (
                      <button
                        key={sp.label}
                        type="button"
                        onClick={() => setSpeedIdx(idx)}
                        className={`px-2.5 py-1.5 border-[1.5px] border-ink font-mono text-[10px] font-bold cursor-pointer ${
                          speedIdx === idx
                            ? "bg-ink text-yellow"
                            : "bg-paper text-ink hover:bg-paper-2"
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan (6 Kolom): Panggung Peraga Tangan 3D */}
            <div className="lg:col-span-6">
              <div className="bg-paper border-[3px] border-ink shadow-[8px_8px_0_#111] overflow-hidden">
                <div className="bg-yellow border-b-[3px] border-ink px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 bg-paper border-[2.5px] border-ink shadow-[2px_2px_0_#111] flex items-center justify-center font-display font-black text-2xl text-ink">
                      {currentSignChar === " " ? "_" : activeAlphabetObj.letter}
                    </span>
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-ink/75 block">
                        Peraga 3D Aktif
                      </span>
                      <h2 className="font-display font-black text-lg text-ink leading-tight">
                        {currentSignChar === " "
                          ? "Jeda Spasi Antar Kata"
                          : `Isyarat Huruf "${activeAlphabetObj.letter}"`}
                      </h2>
                    </div>
                  </div>

                  <Link
                    to={`/latihan?letter=${activeAlphabetObj.letter}`}
                    className="btn btn-coral text-xs font-mono py-2 px-3.5 min-h-[40px]"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    <span>Latih Huruf {activeAlphabetObj.letter}</span>
                  </Link>
                </div>

                <div className="p-5 space-y-4">
                  <SignChoreographer3DCanvas activeLetter={activeAlphabetObj.letter} />

                  {/* Instruksi Posisi Jari Huruf yang Sedang Diperagakan */}
                  <div className="p-4 bg-paper-2 border-[2px] border-ink shadow-[3px_3px_0_#111]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hand className="w-4 h-4 text-cobalt" aria-hidden="true" />
                      <span className="font-mono text-xs font-black uppercase text-ink">
                        Posisi Jemari Huruf {activeAlphabetObj.letter}:
                      </span>
                    </div>
                    <p className="font-sans text-xs sm:text-sm font-semibold text-ink leading-relaxed">
                      {activeAlphabetObj.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================
             ARAH 2: KAMERA ISYARAT -> PREDIKSI KATA INSTAN & SUARA AI
          ================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            {/* Kolom Kiri (5 Kolom): Papan Susun Kata Cepat & Pembaca Suara AI */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-ink">
                  <div className="flex items-center gap-2">
                    <span className="tag tag-ink text-[10px]">TRANSKRIP ISYARAT</span>
                    {lastLockedChar && (
                      <span className="px-2 py-0.5 bg-mint border border-ink font-mono text-xs font-black text-ink">
                        +{lastLockedChar}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-ink/75">
                    {completedWords.length} Kata
                  </span>
                </div>

                {/* Kotak Teks yang Bisa Diedit Langsung */}
                <textarea
                  rows={3}
                  value={signedText}
                  onChange={(e) => setSignedText(e.target.value.toUpperCase())}
                  placeholder="Arahkan tangan ke kamera di kanan (tahan 1 detik per huruf) atau klik rekomendasi kata cepat di bawah..."
                  className="w-full p-3.5 bg-paper-2 border-[2.5px] border-ink shadow-[3px_3px_0_#111] font-mono font-black text-lg sm:text-xl text-ink uppercase placeholder-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt mb-4 resize-none"
                />

                {/* Baris Prediksi Kata Instan (Autocomplete Huruf Awal) */}
                {wordPredictions.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow/25 border-2 border-ink">
                    <span className="font-mono text-[10px] font-black uppercase text-ink block mb-1.5">
                      Lengkapi Kata &ldquo;{currentPartialWord}...&rdquo; (Klik untuk Isi Cepat):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {wordPredictions.map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => handleApplyWordPrediction(word, true)}
                          className="px-3 py-1.5 bg-yellow hover:bg-ink hover:text-yellow border-2 border-ink shadow-[2px_2px_0_#111] font-mono text-xs font-black text-ink cursor-pointer transition-colors"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Baris Rekomendasi Kata Berikutnya (Next-Word Prediction) */}
                {nextWordPredictions.length > 0 && (
                  <div className="mb-4">
                    <span className="font-mono text-[10px] font-black uppercase text-ink/75 block mb-1.5">
                      Saran Kata Selanjutnya:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {nextWordPredictions.map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => handleApplyWordPrediction(word, false)}
                          className="px-2.5 py-1.5 bg-paper-2 hover:bg-yellow border-2 border-ink shadow-[2px_2px_0_#111] font-mono text-xs font-bold text-ink cursor-pointer"
                        >
                          + {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kontrol Baris Teks */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t-2 border-ink">
                  <button
                    type="button"
                    onClick={handleAddSpace}
                    className="btn bg-paper-2 hover:bg-yellow text-xs font-mono py-2 px-3 min-h-[40px]"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Spasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteChar}
                    disabled={!signedText}
                    className="btn bg-paper-2 hover:bg-yellow text-xs font-mono py-2 px-3 min-h-[40px] disabled:opacity-40"
                  >
                    <Delete className="w-3.5 h-3.5 mr-1" />
                    <span>Hapus</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSigned}
                    disabled={!signedText}
                    className="btn bg-paper-2 hover:bg-coral hover:text-white text-xs font-mono py-2 px-3 min-h-[40px] disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => speakIndonesian(signedText)}
                    disabled={!signedText.trim()}
                    className="btn btn-mint text-xs font-mono py-2 px-3.5 min-h-[40px] ml-auto disabled:opacity-40"
                  >
                    <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>{isSpeaking ? "Membaca..." : "Suarakan Langsung"}</span>
                  </button>
                </div>
              </div>

              {/* Panel Penyempurna Kalimat AI & Variasi Nada Bicara */}
              <div className="bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b-2 border-ink">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-cobalt" aria-hidden="true" />
                    <span className="font-mono text-xs font-black uppercase text-ink">
                      Penyempurna Kalimat &amp; Suara AI
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {EXPAND_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectExpandMode(m.id)}
                        className={`px-2 py-1 border border-ink font-mono text-[10px] font-bold cursor-pointer ${
                          expandMode === m.id ? "bg-ink text-yellow" : "bg-paper-2 text-ink"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePolishAndSpeakAi(expandMode)}
                  disabled={!signedText.trim() || isPolishingAi}
                  className="btn btn-yellow w-full min-h-[46px] text-xs font-mono font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPolishingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyusun Kalimat...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Bentuk Kalimat Utuh &amp; Suarakan</span>
                    </>
                  )}
                </button>

                {aiPolishedSentence && (
                  <div className="p-4 bg-paper-2 border-2 border-ink space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase text-ink/75 block">
                          Kalimat Natural:
                        </span>
                        <p className="font-sans text-base font-black text-ink mt-0.5">
                          {aiPolishedSentence}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakIndonesian(aiPolishedSentence)}
                        className="btn btn-mint p-2 min-h-[38px] shrink-0"
                        title="Suarakan kalimat ini"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {aiVariations.length > 0 && (
                      <div className="pt-2 border-t border-ink/20 space-y-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase text-ink/75 block">
                          Pilihan Variasi Nada ({EXPAND_MODES.find((x) => x.id === expandMode)?.label}):
                        </span>
                        {aiVariations.map((v, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => speakIndonesian(v)}
                            className="w-full text-left p-2 bg-paper hover:bg-yellow border border-ink font-sans text-xs font-semibold text-ink flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span>{v}</span>
                            <Volume2 className="w-3.5 h-3.5 shrink-0 text-cobalt" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Kolom Kanan (7 Kolom): Live Webcam & Telemetri */}
            <div className="lg:col-span-7 space-y-4">
              <WebcamCanvas
                modelHook={modelHook}
                onLetterLocked={handleCameraLetterLocked}
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

              <div className="p-3.5 bg-paper-2 border-[2.5px] border-ink shadow-[4px_4px_0_#111] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-mint" />
                  <span>Tahan isyarat 1 detik untuk mengetik huruf, lalu pilih rekomendasi kata agar lebih cepat.</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
