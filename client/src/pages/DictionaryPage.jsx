import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Camera,
  X,
  Hand,
  Compass,
  ArrowUpRight,
  Lightbulb,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Move3d,
  RotateCcw,
  Layers,
  Play,
} from "lucide-react";

import { GuidePlayer } from "../components/remotion/GuidePlayer";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import {
  HAND_CONNECTIONS,
  GROUP_COLORS,
  NODE_COLORS,
  NEUTRAL_OPEN_POSE,
  rotatePoint3D,
  getSibiHandPose3D,
} from "../components/creative/Hero3DSibiStage";

const FILTERS = [
  { key: "all", label: "Semua Huruf", count: 26 },
  { key: "static", label: "Gestur Statis", count: 24 },
  { key: "dynamic", label: "Gerak Dinamis (J & Z)", count: 2 },
  { key: "attention", label: "Mirip & Rawan Tertukar", count: 7 },
  { key: "vowels", label: "Huruf Vokal (A, I, U, E, O)", count: 5 },
];

const ATTENTION_LETTERS = ["K", "Y", "V", "P", "M", "N", "S"];
const VOWELS = ["A", "I", "U", "E", "O"];

// Pasangan huruf yang secara anatomi sering tertukar untuk perbandingan cepat
const CONFUSED_PAIRS = {
  A: ["E", "S", "T"],
  B: ["F", "W"],
  C: ["O", "E"],
  D: ["F", "I"],
  E: ["A", "S", "O"],
  F: ["D", "B"],
  G: ["Q", "H"],
  H: ["G", "U"],
  I: ["J", "Y"],
  J: ["I", "Z"],
  K: ["V", "Y", "P"],
  L: ["G", "Y"],
  M: ["N", "S", "T"],
  N: ["M", "T", "S"],
  O: ["C", "E"],
  P: ["K", "Q"],
  Q: ["G", "P"],
  R: ["U", "V"],
  S: ["A", "E", "M"],
  T: ["N", "M", "S"],
  U: ["V", "R", "H"],
  V: ["K", "U", "W"],
  W: ["V", "B", "F"],
  X: ["D", "T"],
  Y: ["I", "K", "L"],
  Z: ["J", "D"],
};

/**
 * Diagram Vektor SVG 21-Landmark Tangan SIBI untuk setiap kartu kamus.
 * Menghitung proyeksi 3D ke 2D secara deterministik tanpa membebani konteks WebGL.
 */
const MiniHandSkeletonSvg = ({ letter }) => {
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
        x: 50 + x1 * 42 * scale,
        y: 55 - y2 * 42 * scale,
        z: z2,
        scale,
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
        width: conn.group === "palm" ? 3.8 : 4.2,
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
      viewBox="0 0 100 100"
      className="w-24 h-24 shrink-0 border-[2px] border-ink bg-paper-2 shadow-[2px_2px_0_#111]"
      aria-label={`Diagram anatomi 21 titik tangan huruf ${letter}`}
    >
      {/* Garis bantu sumbu tengah halus */}
      <line x1="12" y1="84" x2="88" y2="84" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 2" />

      {/* Lintasan gerak untuk J & Z */}
      {geometry.dynamic === "J" && (
        <path
          d="M 70 24 L 70 55 Q 70 72 52 72 Q 38 72 40 58"
          fill="none"
          stroke="#FF4D4D"
          strokeWidth="2.2"
          strokeDasharray="3 2"
        />
      )}
      {geometry.dynamic === "Z" && (
        <path
          d="M 32 24 L 68 24 L 32 54 L 70 54"
          fill="none"
          stroke="#111111"
          strokeWidth="2.2"
          strokeDasharray="3 2"
        />
      )}

      {/* Tulang dengan outline hitam */}
      {geometry.bones.map((b) => (
        <g key={b.id}>
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke="#111111"
            strokeWidth={b.width + 2}
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

      {/* Titik Sendi */}
      {geometry.joints.map((j) => (
        <circle
          key={j.id}
          cx={j.x}
          cy={j.y}
          r={j.isWrist ? 3.2 : j.isTip ? 3.0 : 2.1}
          fill={j.isTip ? j.color : "#ffffff"}
          stroke="#111111"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
};

/**
 * Kanvas 3D Interaktif untuk Panggung Inspeksi Spesimen di bagian atas Kamus.
 * Mendukung putar 360 derajat dan transisi artikulasi jari 2-tahap saat pengguna memilih huruf.
 */
const Dictionary3DHandCanvas = ({ letter }) => {
  const canvasRef = useRef(null);
  const DEFAULT_ROT = { x: 0.16, y: -0.24 };
  const rotationRef = useRef({ x: DEFAULT_ROT.x, y: DEFAULT_ROT.y });
  const showcaseRotRef = useRef({ x: 0, y: 0.06 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [isRotated, setIsRotated] = useState(false);

  const initialPose = useMemo(() => getSibiHandPose3D(letter), []);
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
    prevLandmarksRef.current = currentLandmarksRef.current.map((p) => [...p]);
    const nextPose = getSibiHandPose3D(letter);
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
  }, [letter]);

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
        : Math.min(1, Math.max(0, (now - transitionStartRef.current) / 680));

      let waveLiftY = 0;
      let waveRoll = 0;
      let waveYaw = 0;

      if (tRaw < 1 && !prefersReducedMotion) {
        const arc = Math.sin(tRaw * Math.PI);
        waveLiftY = arc * 0.075;
        waveYaw = arc * 0.25;
        waveRoll = Math.sin(tRaw * Math.PI * 2) * 0.07;
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

      const showcaseSpeed = prefersReducedMotion ? 1 : 0.1;
      showcaseRotRef.current.y += (targetPoseRef.current.viewYaw - showcaseRotRef.current.y) * showcaseSpeed;
      showcaseRotRef.current.x += (targetPoseRef.current.viewPitch - showcaseRotRef.current.x) * showcaseSpeed;

      const idleY = !isDraggingRef.current && !prefersReducedMotion ? Math.sin(time * 0.85) * 0.1 : 0;
      const gridRotX = rotationRef.current.x;
      const gridRotY = rotationRef.current.y + idleY;
      const handRotX = gridRotX + showcaseRotRef.current.x;
      const handRotY = gridRotY + showcaseRotRef.current.y + waveYaw;

      // Lantai grid perspektif 3D
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

      // Lintasan J & Z
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

        const tCycle = (time * 0.65) % 1;
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
    <div className="relative bg-paper border-[2.5px] border-ink shadow-[4px_4px_0_#111] overflow-hidden">
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper-2 border-[1.5px] border-ink shadow-[2px_2px_0_#111] font-mono text-[10px] font-bold text-ink">
          <Move3d className="w-3.5 h-3.5 text-cobalt" aria-hidden="true" />
          <span>Seret untuk Putar 360 Derajat</span>
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
        aria-label={`Model 3D interaktif 21 landmark tangan SIBI huruf ${letter}`}
        className="w-full h-64 sm:h-72 block cursor-grab active:cursor-grabbing touch-none"
      />
    </div>
  );
};

export const DictionaryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLetterParam = searchParams.get("letter");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewerMode, setViewerMode] = useState("3d"); // '3d' | 'roi'
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [activeSpecimen, setActiveSpecimen] = useState(() => {
    if (initialLetterParam) {
      const found = SIBI_ALPHABETS_FALLBACK.find(
        (a) => a.letter === initialLetterParam.toUpperCase()
      );
      if (found) return found;
    }
    return SIBI_ALPHABETS_FALLBACK[0];
  });

  const inspectorRef = useRef(null);

  const selectSpecimen = useCallback(
    (item, shouldScroll = false) => {
      setActiveSpecimen(item);
      setSearchParams({ letter: item.letter }, { replace: true });
      if (shouldScroll && inspectorRef.current) {
        inspectorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [setSearchParams]
  );

  const activeIndex = SIBI_ALPHABETS_FALLBACK.findIndex(
    (a) => a.letter === activeSpecimen.letter
  );

  const handlePrevSpecimen = useCallback(() => {
    const prevIdx =
      (activeIndex - 1 + SIBI_ALPHABETS_FALLBACK.length) % SIBI_ALPHABETS_FALLBACK.length;
    selectSpecimen(SIBI_ALPHABETS_FALLBACK[prevIdx], false);
  }, [activeIndex, selectSpecimen]);

  const handleNextSpecimen = useCallback(() => {
    const nextIdx = (activeIndex + 1) % SIBI_ALPHABETS_FALLBACK.length;
    selectSpecimen(SIBI_ALPHABETS_FALLBACK[nextIdx], false);
  }, [activeIndex, selectSpecimen]);

  // Navigasi keyboard panah kiri/kanan saat fokus tidak berada di input pencarian
  useEffect(() => {
    const handleKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowLeft") handlePrevSpecimen();
      if (e.key === "ArrowRight") handleNextSpecimen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handlePrevSpecimen, handleNextSpecimen]);

  const handleSpeak = () => {
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(
          `Huruf ${activeSpecimen.letter}. ${activeSpecimen.description}`
        );
        utterance.lang = "id-ID";
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const filteredAlphabets = useMemo(() => {
    return SIBI_ALPHABETS_FALLBACK.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        item.letter.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.tips && item.tips.toLowerCase().includes(query));
      if (!matchesSearch) return false;

      if (activeFilter === "static") return item.gestureType === "static";
      if (activeFilter === "dynamic") return item.gestureType === "dynamic";
      if (activeFilter === "attention") return ATTENTION_LETTERS.includes(item.letter);
      if (activeFilter === "vowels") return VOWELS.includes(item.letter);
      return true;
    });
  }, [searchQuery, activeFilter]);

  const filteredLettersSet = useMemo(
    () => new Set(filteredAlphabets.map((a) => a.letter)),
    [filteredAlphabets]
  );

  const activeIsDynamic = activeSpecimen.gestureType === "dynamic";
  const activeIsVowel = VOWELS.includes(activeSpecimen.letter);
  const activeNeedsAttention = ATTENTION_LETTERS.includes(activeSpecimen.letter);
  const similarLetters = CONFUSED_PAIRS[activeSpecimen.letter] || [];

  return (
    <div className="min-h-screen bg-paper text-ink pt-16 pb-20">
      {/* Header Editorial & Indeks Cepat A sampai Z */}
      <section className="border-b-[3px] border-ink bg-paper-2 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-yellow border-[2px] border-ink shadow-[2px_2px_0_#111] font-mono text-xs font-black uppercase mb-3">
                <span>Atlas 26 Alfabet SIBI</span>
              </div>
              <h1 className="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-[1.02]">
                Kamus Isyarat <span className="highlight">A sampai Z</span>
              </h1>
              <p className="mt-2.5 font-sans text-sm sm:text-base text-ink/80 font-medium leading-relaxed">
                Referensi anatomi 21 titik persendian tangan untuk Sistem Isyarat Bahasa Indonesia (SIBI). Putar model 3D di panggung inspeksi, bandingkan huruf yang mirip, lalu uji langsung di depan kamera.
              </p>
            </div>

            {/* Kotak Pencarian Kontras Tinggi */}
            <div className="w-full lg:w-88">
              <label
                htmlFor="search-alphabet"
                className="block text-xs font-mono font-bold uppercase mb-1.5 text-ink"
              >
                Cari Huruf atau Posisi Jari:
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 text-ink absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="search-alphabet"
                  type="search"
                  placeholder="Ketik huruf 'K', 'kelingking', 'silang'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-11 py-2.5 border-[2.5px] border-ink bg-paper text-sm font-bold text-ink placeholder-ink/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 shadow-[3px_3px_0_#111]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-ink hover:bg-yellow border border-ink cursor-pointer"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Baris Lompat Cepat 26 Huruf (A sampai Z) */}
          <div className="mt-6 pt-5 border-t-[2px] border-ink/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold uppercase text-ink">
                Indeks Cepat 26 Alfabet:
              </span>
              <span className="font-mono text-xs font-bold text-ink/75">
                Gunakan tombol panah Kiri / Kanan untuk berpindah huruf
              </span>
            </div>
            <div className="grid grid-cols-9 sm:grid-cols-13 lg:grid-cols-[repeat(26,minmax(0,1fr))] gap-1.5">
              {SIBI_ALPHABETS_FALLBACK.map((item) => {
                const isSelected = activeSpecimen.letter === item.letter;
                const isMatched = filteredLettersSet.has(item.letter);
                return (
                  <button
                    key={item.letter}
                    type="button"
                    onClick={() => selectSpecimen(item, false)}
                    className={`min-h-[38px] font-display font-black text-xs sm:text-sm border-[2px] transition-all flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1 ${
                      isSelected
                        ? "bg-ink text-yellow border-ink shadow-[3px_3px_0_#FFD000] -translate-y-0.5"
                        : isMatched
                        ? "bg-paper text-ink border-ink hover:bg-yellow shadow-[2px_2px_0_#111]"
                        : "bg-paper-3 text-ink/50 border-ink/40 hover:border-ink"
                    }`}
                    aria-label={`Inspeksi huruf ${item.letter}`}
                    aria-pressed={isSelected}
                  >
                    {item.letter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* ZONA 1: PANGGUNG INSPEKSI SPESIMEN AKTIF (Master-Detail Stage) */}
        <section
          ref={inspectorRef}
          aria-label={`Panggung Inspeksi Huruf ${activeSpecimen.letter}`}
          className="mb-12 bg-paper border-[3px] border-ink shadow-[8px_8px_0_#111] overflow-hidden"
        >
          {/* Header Panggung Inspeksi */}
          <div className="bg-yellow border-b-[3px] border-ink px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-ink text-yellow font-mono font-black text-xs border-2 border-ink">
                #{String(activeSpecimen.id).padStart(2, "0")} / 26
              </span>
              <h2 className="font-display font-black text-lg sm:text-xl text-ink tracking-tight">
                Spesimen Huruf &ldquo;{activeSpecimen.letter}&rdquo;
              </h2>
              <span
                className={`tag text-[10px] font-bold ${
                  activeIsDynamic ? "tag-coral" : "tag-paper"
                }`}
              >
                {activeIsDynamic ? "Gerak Dinamis" : "Gestur Statis"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSpeak}
                className={`btn text-xs font-mono py-2 px-3 min-h-[40px] ${
                  isSpeaking ? "btn-coral" : "btn-paper"
                }`}
                aria-label={`Dengarkan penjelasan huruf ${activeSpecimen.letter}`}
              >
                <Volume2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>{isSpeaking ? "Membacakan..." : "Dengar Lafal"}</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevSpecimen}
                  className="btn btn-paper p-2 min-h-[40px] min-w-[40px]"
                  title="Huruf Sebelumnya (Panah Kiri)"
                  aria-label="Huruf Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSpecimen}
                  className="btn btn-paper p-2 min-h-[40px] min-w-[40px]"
                  title="Huruf Berikutnya (Panah Kanan)"
                  aria-label="Huruf Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Isi Panggung Inspeksi: Kiri (Kanvas 3D / ROI Guide) & Kanan (Anatomi + Perbandingan) */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Kolom Kiri (5 Kolom): Visualizer 3D & Simulasi ROI */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-paper-2 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-ink flex flex-col justify-between gap-4">
              {/* Switcher Mode Visual */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setViewerMode("3d")}
                  className={`min-h-[40px] px-3 py-2 border-[2px] border-ink font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    viewerMode === "3d"
                      ? "bg-ink text-yellow shadow-[3px_3px_0_#FFD000]"
                      : "bg-paper text-ink hover:bg-yellow/40"
                  }`}
                  aria-pressed={viewerMode === "3d"}
                >
                  <Move3d className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Model Tangan 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewerMode("roi")}
                  className={`min-h-[40px] px-3 py-2 border-[2px] border-ink font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    viewerMode === "roi"
                      ? "bg-ink text-yellow shadow-[3px_3px_0_#FFD000]"
                      : "bg-paper text-ink hover:bg-yellow/40"
                  }`}
                  aria-pressed={viewerMode === "roi"}
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Panduan ROI Kamera</span>
                </button>
              </div>

              {/* Area Viewport */}
              {viewerMode === "3d" ? (
                <Dictionary3DHandCanvas letter={activeSpecimen.letter} />
              ) : (
                <GuidePlayer
                  letter={activeSpecimen.letter}
                  isDynamic={activeIsDynamic}
                  className="w-full"
                />
              )}

              {/* Legenda Warna Jari */}
              <div className="p-3 bg-paper border-[2px] border-ink shadow-[2px_2px_0_#111] flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] font-bold text-ink">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-coral border border-ink inline-block" />
                  Ibu Jari
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-cobalt border border-ink inline-block" />
                  Telunjuk
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-mint border border-ink inline-block" />
                  Tengah &amp; Manis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-yellow border border-ink inline-block" />
                  Kelingking
                </span>
              </div>
            </div>

            {/* Kolom Kanan (7 Kolom): Rincian Anatomi, Tips, & Perbandingan Huruf Mirip */}
            <div className="lg:col-span-7 p-5 sm:p-7 bg-paper flex flex-col justify-between gap-6">
              <div className="space-y-5">
                {/* Baris Identitas Huruf Besar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-ink/15">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-yellow border-[3px] border-ink shadow-[4px_4px_0_#111] flex items-center justify-center font-display font-black text-5xl text-ink">
                      {activeSpecimen.letter}
                    </div>
                    <div>
                      <span className="font-mono text-xs font-bold uppercase text-ink/75 block">
                        Alfabet Sistem Isyarat Bahasa Indonesia (SIBI)
                      </span>
                      <h3 className="font-display font-black text-2xl sm:text-3xl text-ink tracking-tight">
                        Huruf {activeSpecimen.letter}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span
                          className={`tag text-[10px] ${
                            activeSpecimen.difficulty === "easy"
                              ? "tag-mint"
                              : activeSpecimen.difficulty === "medium"
                              ? "tag-yellow"
                              : "tag-coral"
                          }`}
                        >
                          Tingkat:{" "}
                          {activeSpecimen.difficulty === "easy"
                            ? "Mudah"
                            : activeSpecimen.difficulty === "medium"
                            ? "Sedang"
                            : "Sulit"}
                        </span>
                        {activeIsVowel && (
                          <span className="tag tag-cobalt text-[10px]">Huruf Vokal</span>
                        )}
                        {activeNeedsAttention && (
                          <span className="tag tag-coral text-[10px]">Rawan Tertukar</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instruksi Pembentukan Jari */}
                <div>
                  <h4 className="font-mono text-xs font-black uppercase tracking-wider text-ink mb-2 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cobalt" aria-hidden="true" />
                    <span>Cara Membentuk Posisi Jemari:</span>
                  </h4>
                  <p className="p-4 bg-paper-2 border-[2.5px] border-ink shadow-[3px_3px_0_#111] font-sans text-sm sm:text-base font-semibold text-ink leading-relaxed">
                    {activeSpecimen.description}
                  </p>
                </div>

                {/* Catatan Orientasi & Pembeda */}
                {activeSpecimen.tips && (
                  <div className="p-4 bg-yellow/25 border-[2.5px] border-ink shadow-[3px_3px_0_#111] flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-ink shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="font-mono text-xs font-black uppercase text-ink mb-1">
                        Kunci Akurasi &amp; Pembeda Deteksi Kamera:
                      </h4>
                      <p className="font-sans text-xs sm:text-sm text-ink font-medium leading-relaxed">
                        {activeSpecimen.tips}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pembanding Cepat dengan Huruf yang Mirip */}
                {similarLetters.length > 0 && (
                  <div className="pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase text-ink/80 flex items-center gap-1.5 mr-1">
                        <Layers className="w-3.5 h-3.5 text-coral" aria-hidden="true" />
                        <span>Bandingkan Bentuk Mirip:</span>
                      </span>
                      {similarLetters.map((simChar) => {
                        const targetObj = SIBI_ALPHABETS_FALLBACK.find(
                          (x) => x.letter === simChar
                        );
                        if (!targetObj) return null;
                        return (
                          <button
                            key={simChar}
                            type="button"
                            onClick={() => selectSpecimen(targetObj, false)}
                            className="min-h-[36px] px-3 py-1 bg-paper hover:bg-yellow border-[2px] border-ink shadow-[2px_2px_0_#111] font-mono text-xs font-black text-ink cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
                          >
                            Lihat Huruf {simChar}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Baris Tombol Aksi Utama */}
              <div className="pt-4 border-t-[2.5px] border-ink flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Link
                  to={`/latihan?letter=${activeSpecimen.letter}`}
                  className="btn btn-coral min-h-[46px] text-xs sm:text-sm font-mono font-black uppercase tracking-wider flex-1 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>Uji Huruf &ldquo;{activeSpecimen.letter}&rdquo; di Kamera</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/kuis"
                  className="btn btn-paper hover:bg-yellow min-h-[46px] text-xs font-mono font-black uppercase px-5"
                >
                  Tes di Kuis Eja
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ZONA 2: FILTER & KATALOG VISUAL 26 SPESIMEN */}
        <section aria-label="Katalog Visual 26 Alfabet SIBI">
          {/* Baris Filter Kategori */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b-[3px] border-ink">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-black uppercase text-ink mr-1">
                Filter Kategori:
              </span>
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFilter(f.key)}
                    className={`btn text-xs font-mono py-2 px-3.5 min-h-[40px] transition-all ${
                      isActive
                        ? "btn-yellow shadow-[4px_4px_0_#111]"
                        : "bg-paper text-ink hover:bg-paper-3 shadow-[2px_2px_0_#111]"
                    }`}
                    aria-pressed={isActive}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-ink text-yellow" : "bg-ink/10 text-ink"
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="font-mono text-xs font-bold text-ink">
              Menampilkan <span className="font-black">{filteredAlphabets.length}</span> dari 26 huruf SIBI
            </div>
          </div>

          {/* Grid Katalog dengan Diagram Tangan 21-Landmark di Setiap Kartu */}
          {filteredAlphabets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAlphabets.map((item) => {
                const isDynamic = item.gestureType === "dynamic";
                const isVowel = VOWELS.includes(item.letter);
                const needsAttention = ATTENTION_LETTERS.includes(item.letter);
                const isSelected = activeSpecimen.letter === item.letter;

                return (
                  <article
                    key={item.letter}
                    onClick={() => selectSpecimen(item, true)}
                    className={`p-5 flex flex-col justify-between transition-all cursor-pointer border-[3px] border-ink ${
                      isSelected
                        ? "bg-yellow/25 shadow-[8px_8px_0_#111] -translate-y-1"
                        : isDynamic
                        ? "bg-paper-2 hover:bg-paper shadow-[5px_5px_0_#111] hover:shadow-[7px_7px_0_#111] hover:-translate-y-0.5"
                        : "bg-paper hover:bg-paper-2 shadow-[5px_5px_0_#111] hover:shadow-[7px_7px_0_#111] hover:-translate-y-0.5"
                    }`}
                  >
                    <div>
                      {/* Header Kartu */}
                      <div className="flex items-center justify-between mb-4 pb-2.5 border-b-2 border-ink">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 border border-ink font-mono font-black text-xs ${
                              isSelected ? "bg-ink text-yellow" : "bg-yellow text-ink"
                            }`}
                          >
                            #{String(item.id).padStart(2, "0")}
                          </span>
                          <span className="font-mono text-[11px] font-bold uppercase text-ink">
                            {isDynamic ? "Gerak Dinamis" : "Gestur Statis"}
                          </span>
                        </div>

                        <span
                          className={`tag text-[10px] ${
                            item.difficulty === "easy"
                              ? "tag-mint"
                              : item.difficulty === "medium"
                              ? "tag-yellow"
                              : "tag-coral"
                          }`}
                        >
                          {item.difficulty === "easy"
                            ? "Mudah"
                            : item.difficulty === "medium"
                            ? "Sedang"
                            : "Sulit"}
                        </span>
                      </div>

                      {/* Blok Visual: Huruf Besar + Diagram Anatomi 21 Titik Tangan */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex flex-col justify-between">
                          <span className="font-display font-black text-6xl text-ink leading-none tracking-tight">
                            {item.letter}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {isVowel && (
                              <span className="tag tag-cobalt text-[9px]">Vokal</span>
                            )}
                            {needsAttention && (
                              <span className="tag tag-coral text-[9px]">Rawan Salah</span>
                            )}
                            {isDynamic && (
                              <span className="tag tag-yellow text-[9px]">Lintasan Gerak</span>
                            )}
                          </div>
                        </div>

                        {/* Diagram Vektor 21-Landmark Spesifik Huruf */}
                        <MiniHandSkeletonSvg letter={item.letter} />
                      </div>

                      {/* Deskripsi Posisi Jari Lengkap (Tanpa Terpotong) */}
                      <p className="font-sans text-xs text-ink font-medium leading-relaxed mb-5">
                        {item.description}
                      </p>
                    </div>

                    {/* Tombol Aksi Kartu */}
                    <div
                      className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-ink"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => selectSpecimen(item, true)}
                        className={`btn text-xs font-mono py-2 px-2 min-h-[42px] ${
                          isSelected
                            ? "btn-ink"
                            : "bg-paper-2 hover:bg-yellow text-ink"
                        }`}
                        aria-label={`Inspeksi 3D huruf ${item.letter}`}
                      >
                        <Hand className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                        <span>{isSelected ? "Sedang Aktif" : "Inspeksi 3D"}</span>
                      </button>
                      <Link
                        to={`/latihan?letter=${item.letter}`}
                        className="btn btn-yellow text-ink text-xs font-mono py-2 px-2 min-h-[42px] flex items-center justify-center gap-1"
                        aria-label={`Latih huruf ${item.letter} di kamera`}
                      >
                        <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Uji Kamera</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty State Jujur & Terarah */
            <div className="card p-10 sm:p-12 text-center max-w-lg mx-auto bg-paper-2 nb-thick">
              <div className="w-14 h-14 bg-coral border-2 border-ink shadow-[4px_4px_0_#111] mx-auto mb-4 flex items-center justify-center font-display font-black text-2xl text-white">
                ?
              </div>
              <h3 className="font-display font-black text-2xl text-ink mb-2">
                Tidak Ada Huruf yang Cocok dengan &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="font-sans text-sm text-ink/80 mb-6">
                Pencarian pada kategori aktif tidak menemukan alfabet yang sesuai. Reset filter atau kata kunci untuk menampilkan kembali seluruh 26 alfabet Sistem Isyarat Bahasa Indonesia (SIBI).
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="btn btn-yellow text-xs font-mono uppercase min-h-[44px]"
              >
                Reset Filter &amp; Tampilkan 26 Huruf
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
