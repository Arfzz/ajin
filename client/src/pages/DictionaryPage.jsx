import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Search,
  Camera,
  X,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Move3d,
  RotateCcw,
  Play,
  Shuffle,
  ArrowUpRight,
} from "lucide-react";

import ShapeGrid from "../components/reactbits/ShapeGrid";
import { DecryptedText } from "../components/reactbits/DecryptedText";
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
  { key: "all", label: "Semua (26)" },
  { key: "static", label: "Posisi Diam (24)" },
  { key: "dynamic", label: "Gerak Jari (2)" },
  { key: "vowels", label: "Vokal (5)" },
  { key: "attention", label: "Mirip & Rawan Tertukar (7)" },
];

const ATTENTION_LETTERS = ["K", "Y", "V", "P", "M", "N", "S"];
const VOWELS = ["A", "I", "U", "E", "O"];

const DIFFICULTY_LABEL = {
  easy: "Mudah",
  medium: "Sedang",
  hard: "Sulit",
};

// Pasangan huruf yang secara anatomi mirip untuk perbandingan cepat
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

// Skema blok warna fungsional per jenis huruf (tetap memenuhi kontras WCAG AA)
function getLetterAccentTheme(letter, gestureType) {
  if (gestureType === "dynamic") {
    return {
      barClass: "bg-theme-coral text-ink",
      tileClass: "bg-theme-coral text-ink",
      stripeClass: "stripe-coral",
      spotlight: "rgba(255, 77, 77, 0.16)",
    };
  }
  if (VOWELS.includes(letter)) {
    return {
      barClass: "bg-theme-yellow text-ink",
      tileClass: "bg-theme-yellow text-ink",
      stripeClass: "stripe-y",
      spotlight: "rgba(255, 208, 0, 0.22)",
    };
  }
  if (ATTENTION_LETTERS.includes(letter)) {
    return {
      barClass: "bg-theme-cobalt text-white",
      tileClass: "bg-theme-cobalt text-white",
      stripeClass: "",
      spotlight: "rgba(0, 85, 255, 0.14)",
    };
  }
  return {
    barClass: "bg-paper-2 text-ink",
    tileClass: "bg-theme-mint text-ink",
    stripeClass: "",
    spotlight: "rgba(0, 198, 142, 0.14)",
  };
}

/**
 * Diagram vektor 21 titik sendi tangan SIBI yang ringan (tanpa loop rAF)
 * untuk kartu katalog dan pembanding huruf mirip.
 */
const MiniHandSkeletonSvg = ({ letter, className = "w-20 h-20" }) => {
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
      className={`shrink-0 border-[2px] border-ink bg-paper shadow-[3px_3px_0_#111] ${className}`}
      aria-label={`Diagram posisi jari huruf ${letter}`}
    >
      <line x1="12" y1="84" x2="88" y2="84" stroke="#111111" strokeOpacity="0.14" strokeWidth="1" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 2" />

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
 * Kanvas 3D Interaktif untuk memutar model tangan SIBI 360 derajat,
 * berdiri di atas pelat kuning Neobrutalism berlapis.
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
      const height = Math.max(240, Math.floor(rect.height));

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
      ctx.strokeStyle = "rgba(17, 17, 17, 0.13)";
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
      ctx.fillStyle = "rgba(17, 17, 17, 0.1)";
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
    <div>
      {/* Pelat Kuning Offset di Belakang Kanvas 3D */}
      <div className="relative">
        <div
          className="absolute inset-0 translate-x-2 translate-y-2 bg-yellow border-[2.5px] border-ink pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative bg-paper border-[2.5px] border-ink shadow-[3px_3px_0_#111] overflow-hidden">
          {isRotated && (
            <button
              type="button"
              onClick={handleReset}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow hover:bg-yellow-dark border-[2px] border-ink shadow-[2px_2px_0_#111] font-mono text-[11px] font-black text-ink cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Sudut</span>
            </button>
          )}

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label={`Model tangan 3D SIBI huruf ${letter}`}
            className="w-full h-72 sm:h-80 block cursor-grab active:cursor-grabbing touch-none"
          />
        </div>
      </div>

      <p className="mt-4 font-mono text-[11px] font-semibold text-ink/75">
        Seret model tangan di atas untuk memutar sudut pandang 360 derajat.
      </p>
    </div>
  );
};

/**
 * Kartu Direktori Alfabet dengan Efek Sorot Kursor & Blok Warna Fungsional.
 */
const AlphabetDirectoryCard = ({ item, isSelected, onSelect }) => {
  const cardRef = useRef(null);
  const [spot, setSpot] = useState({ x: 0, y: 0, active: false });
  const isDynamic = item.gestureType === "dynamic";
  const accent = getLetterAccentTheme(item.letter, item.gestureType);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSpot({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setSpot((prev) => ({ ...prev, active: false }));
  };

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-25px" }}
      transition={{ duration: 0.28 }}
      className={`group relative overflow-hidden flex flex-col justify-between border-[2.5px] border-ink transition-all duration-150 ${
        isSelected
          ? "bg-yellow/25 shadow-[8px_8px_0_#111] -translate-y-1"
          : "bg-paper hover:-translate-y-1 shadow-[4px_4px_0_#111] hover:shadow-[8px_8px_0_#111]"
      }`}
    >
      {/* Radial Cursor Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200 z-0"
        style={{
          opacity: spot.active ? 1 : 0,
          background: `radial-gradient(320px circle at ${spot.x}px ${spot.y}px, ${accent.spotlight}, transparent 75%)`,
        }}
        aria-hidden="true"
      />

      {/* Watermark Huruf Raksasa Latar Belakang */}
      <span
        className="deco-num right-2 bottom-9 text-[8rem] opacity-[0.045] group-hover:opacity-[0.08] transition-opacity"
        aria-hidden="true"
      >
        {item.letter}
      </span>

      {/* Strip Warna Header Fungsional (Tanpa Pill Badge) */}
      <div
        className={`relative z-10 px-4 py-2 border-b-[2px] border-ink flex items-center justify-between font-mono text-[11px] font-black uppercase ${accent.barClass}`}
      >
        <span className="tabular-nums">
          Huruf {String(item.id).padStart(2, "0")}
        </span>
        <span>
          {isDynamic ? "Gerak jari" : "Posisi diam"} · {DIFFICULTY_LABEL[item.difficulty] || "Mudah"}
        </span>
      </div>

      {/* Isi Kartu (Klik untuk Putar 3D di Stage Atas) */}
      <button
        type="button"
        onClick={() => onSelect(item, true)}
        className="relative z-10 w-full text-left p-5 flex-1 flex flex-col justify-between cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-[-2px]"
        aria-label={`Tampilkan model 3D huruf ${item.letter}`}
      >
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <span className="font-display font-black text-6xl text-ink leading-none tracking-tight group-hover:translate-x-0.5 transition-transform">
              {item.letter}
            </span>

            <div className="transition-transform duration-150 group-hover:-rotate-2 group-hover:scale-105">
              <MiniHandSkeletonSvg letter={item.letter} className="w-20 h-20" />
            </div>
          </div>

          <p className="font-sans text-xs text-ink/90 font-semibold leading-relaxed">
            {item.description}
          </p>
        </div>
      </button>

      {/* Footer Kartu Ringkas */}
      <div className="relative z-10 px-5 py-3 border-t-2 border-ink/15 bg-paper/75 flex items-center justify-between font-mono text-[11px]">
        <span className={`font-bold ${isSelected ? "text-ink" : "text-ink/60"}`}>
          {isSelected ? "Aktif di layar 3D" : "Klik kartu untuk 3D"}
        </span>

        <Link
          to={`/latihan?letter=${item.letter}`}
          className="font-black text-cobalt hover:underline inline-flex items-center gap-0.5"
        >
          <span>Uji Kamera</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
};

export const DictionaryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLetterParam = searchParams.get("letter");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewerMode, setViewerMode] = useState("3d"); // '3d' | 'guide'
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
  const railRef = useRef(null);

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

  const handleRandomSpecimen = useCallback(() => {
    const candidates = SIBI_ALPHABETS_FALLBACK.filter(
      (a) => a.letter !== activeSpecimen.letter
    );
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick) selectSpecimen(pick, false);
  }, [activeSpecimen.letter, selectSpecimen]);

  // Efek gelombang magnetik GSAP pada deretan tombol indeks A-Z
  const handleRailMouseMove = useCallback((e) => {
    if (!railRef.current) return;
    const keys = railRef.current.querySelectorAll("[data-az-key]");
    keys.forEach((keyEl) => {
      const rect = keyEl.getBoundingClientRect();
      const dist = Math.hypot(
        e.clientX - (rect.left + rect.width / 2),
        e.clientY - (rect.top + rect.height / 2)
      );
      if (dist < 110) {
        const power = 1 - dist / 110;
        gsap.to(keyEl, {
          y: -power * 6,
          scale: 1 + power * 0.08,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
        });
      } else {
        gsap.to(keyEl, {
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    });
  }, []);

  const handleRailMouseLeave = useCallback(() => {
    if (!railRef.current) return;
    const keys = railRef.current.querySelectorAll("[data-az-key]");
    gsap.to(keys, {
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  // Navigasi tombol panah kiri/kanan saat fokus tidak berada di kolom pencarian
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
  const activeAccent = getLetterAccentTheme(activeSpecimen.letter, activeSpecimen.gestureType);

  const metaSummaryParts = [
    activeIsDynamic ? "Gerak jari dinamis" : "Posisi diam",
    `Tingkat ${DIFFICULTY_LABEL[activeSpecimen.difficulty] || "Mudah"}`,
  ];
  if (activeIsVowel) metaSummaryParts.push("Huruf vokal");
  if (activeNeedsAttention) metaSummaryParts.push("Bentuk mirip huruf lain");

  return (
    <div className="min-h-screen bg-paper text-ink pt-16 pb-20">
      {/* Header Kinetik Interaktif dengan ShapeGrid & Watermark Huruf Aktif */}
      <section className="relative overflow-hidden border-b-[3px] border-ink bg-paper py-9 px-4 sm:px-6">
        {/* React Bits ShapeGrid Interaktif */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto opacity-85">
          <ShapeGrid
            shape="square"
            direction="diagonal"
            lineColor="rgba(17, 17, 17, 0.07)"
            hoverColor="#FFD000"
            hoverFillColor="#FFD000"
            fillOpacity={0.2}
            cellSize={40}
            speed={0.3}
            tiltX={0}
            tiltY={0}
            glow={0.25}
            twinkle={0.08}
            fade={0.9}
            clickCascade={true}
          />
        </div>

        {/* Huruf Raksasa Dekoratif di Kanan Atas */}
        <div
          className="deco-num right-6 -top-6 text-[13rem] sm:text-[17rem] opacity-[0.05] select-none pointer-events-none z-0"
          aria-hidden="true"
        >
          {activeSpecimen.letter}
        </div>

        <div className="max-w-7xl mx-auto relative z-10 pointer-events-none">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl pointer-events-auto">
              <h1 className="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-[1.02]">
                Kamus Isyarat <span className="highlight">A sampai Z</span>
              </h1>
              <p className="mt-2.5 font-sans text-sm sm:text-base text-ink/80 font-medium leading-relaxed">
                Pelajari bentuk tangan Sistem Isyarat Bahasa Indonesia (SIBI). Putar model tangan 3D untuk melihat lekukan jari dari berbagai sisi, lalu coba langsung di kamera.
              </p>
            </div>

            {/* Kotak Pencarian */}
            <div className="w-full lg:w-88 pointer-events-auto">
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
                  placeholder="Contoh: 'K', 'kelingking', 'silang'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-11 py-2.5 border-[2.5px] border-ink bg-paper text-sm font-bold text-ink placeholder-ink/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 shadow-[4px_4px_0_#111]"
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

          {/* Indeks 26 Huruf Interaktif (GSAP Piano Wave) */}
          <div className="mt-7 pt-5 border-t-2 border-ink/20 pointer-events-auto">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-mono text-xs font-black uppercase text-ink">
                Pilih Huruf untuk Diputar 3D
              </span>
              <span className="hidden sm:inline font-mono text-xs font-semibold text-ink/70">
                Bisa pakai tombol panah Kiri / Kanan di keyboard
              </span>
            </div>
            <div
              ref={railRef}
              onMouseMove={handleRailMouseMove}
              onMouseLeave={handleRailMouseLeave}
              className="grid grid-cols-9 sm:grid-cols-13 lg:grid-cols-[repeat(26,minmax(0,1fr))] gap-1.5"
            >
              {SIBI_ALPHABETS_FALLBACK.map((item) => {
                const isSelected = activeSpecimen.letter === item.letter;
                const isMatched = filteredLettersSet.has(item.letter);
                return (
                  <button
                    key={item.letter}
                    data-az-key
                    type="button"
                    onClick={() => selectSpecimen(item, false)}
                    className={`min-h-[40px] font-display font-black text-xs sm:text-sm border-[2px] transition-colors flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1 ${
                      isSelected
                        ? "bg-ink text-yellow border-ink shadow-[3px_3px_0_#FFD000]"
                        : isMatched
                        ? "bg-paper text-ink border-ink hover:bg-yellow shadow-[2px_2px_0_#111]"
                        : "bg-paper-3 text-ink/45 border-ink/35 hover:border-ink"
                    }`}
                    aria-label={`Tampilkan model 3D huruf ${item.letter}`}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">
        {/* ZONA 1: PANGGUNG INSPEKSI 3D BERLAPIS & DINAMIS */}
        <section
          ref={inspectorRef}
          aria-label={`Panduan 3D Huruf ${activeSpecimen.letter}`}
          className="mb-14 bg-paper border-[3px] border-ink shadow-[10px_10px_0_#111] overflow-hidden"
        >
          {/* Header Panggung Kuning Neobrutalist */}
          <div className="bg-theme-yellow border-b-[3px] border-ink px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display font-black text-xl sm:text-2xl text-ink tracking-tight">
                <DecryptedText
                  text={`Huruf ${activeSpecimen.letter}`}
                  speed={22}
                  maxIterations={5}
                />
              </h2>
              <span className="font-mono text-xs font-bold text-ink/75 tabular-nums">
                ({activeSpecimen.id} dari 26)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRandomSpecimen}
                className="btn btn-paper hover:bg-ink hover:text-yellow text-xs font-mono py-2 px-3 min-h-[40px]"
                title="Pilih satu huruf acak untuk dipelajari"
              >
                <Shuffle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                <span>Acak Huruf</span>
              </button>

              <button
                type="button"
                onClick={handleSpeak}
                className={`btn text-xs font-mono py-2 px-3 min-h-[40px] ${
                  isSpeaking ? "btn-coral" : "btn-paper"
                }`}
                aria-label={`Dengarkan penjelasan huruf ${activeSpecimen.letter}`}
              >
                <Volume2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>{isSpeaking ? "Membacakan..." : "Dengarkan"}</span>
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

          {/* Konten Inspeksi Split 12 Kolom */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Kolom Kiri (6 Kolom): Kanvas 3D di atas Latar Garis Miring Tactile */}
            <div className="lg:col-span-6 p-5 sm:p-7 bg-paper-2 stripe-y border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-ink flex flex-col justify-between gap-4">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewerMode("3d")}
                  className={`min-h-[42px] px-3 py-2 border-[2px] border-ink font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    viewerMode === "3d"
                      ? "bg-ink text-yellow shadow-[3px_3px_0_#FFD000]"
                      : "bg-paper text-ink hover:bg-yellow/60"
                  }`}
                  aria-pressed={viewerMode === "3d"}
                >
                  <Move3d className="w-4 h-4" aria-hidden="true" />
                  <span>Model Tangan 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewerMode("guide")}
                  className={`min-h-[42px] px-3 py-2 border-[2px] border-ink font-mono text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    viewerMode === "guide"
                      ? "bg-ink text-yellow shadow-[3px_3px_0_#FFD000]"
                      : "bg-paper text-ink hover:bg-yellow/60"
                  }`}
                  aria-pressed={viewerMode === "guide"}
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>Animasi Panduan</span>
                </button>
              </div>

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
              <div className="p-3 bg-paper border-[2px] border-ink shadow-[2px_2px_0_#111] flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 font-mono text-[11px] font-bold text-ink">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-coral border border-ink inline-block" />
                  Ibu Jari
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-cobalt border border-ink inline-block" />
                  Telunjuk
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-mint border border-ink inline-block" />
                  Tengah &amp; Manis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-yellow border border-ink inline-block" />
                  Kelingking
                </span>
              </div>
            </div>

            {/* Kolom Kanan (6 Kolom): Penjelasan, Animasi Pergantian Huruf & Pembanding */}
            <div className="lg:col-span-6 p-6 sm:p-8 bg-paper relative overflow-hidden flex flex-col justify-between gap-6">
              {/* Watermark Huruf Raksasa di Latar Kolom Kanan */}
              <span
                className="deco-num -right-4 -bottom-6 text-[13rem] opacity-[0.045] select-none pointer-events-none"
                aria-hidden="true"
              >
                {activeSpecimen.letter}
              </span>

              <div className="space-y-6 relative z-10">
                {/* Identitas Huruf dengan Keycap Berwarna Dinamis & Spring Animation */}
                <div className="flex items-center gap-4 pb-5 border-b-2 border-ink/15">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSpecimen.letter}
                      initial={{ scale: 0.85, rotate: -4, opacity: 0.4 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0.4 }}
                      transition={{ type: "spring", stiffness: 320, damping: 20 }}
                      className={`w-20 h-20 border-[3px] border-ink shadow-[5px_5px_0_#111] flex items-center justify-center font-display font-black text-5xl shrink-0 ${activeAccent.tileClass}`}
                    >
                      {activeSpecimen.letter}
                    </motion.div>
                  </AnimatePresence>
                  <div>
                    <h3 className="font-display font-black text-2xl sm:text-3xl text-ink tracking-tight leading-tight">
                      Isyarat Huruf {activeSpecimen.letter}
                    </h3>
                    <p className="font-mono text-xs font-bold text-ink/75 mt-1">
                      {metaSummaryParts.join(" · ")}
                    </p>
                  </div>
                </div>

                {/* Cara Membentuk Jari */}
                <div>
                  <h4 className="font-mono text-xs font-black uppercase tracking-wider text-ink/70 mb-2">
                    Cara Membentuk Jari
                  </h4>
                  <p className="font-sans text-base font-semibold text-ink leading-relaxed">
                    {activeSpecimen.description}
                  </p>
                </div>

                {/* Tips Agar Mudah Terbaca Kamera */}
                {activeSpecimen.tips && (
                  <div className="p-4 bg-paper-2 border-2 border-ink border-l-[6px] border-l-cobalt shadow-[3px_3px_0_#111]">
                    <h4 className="font-mono text-xs font-black uppercase tracking-wider text-cobalt mb-1">
                      Tips Saat Mencoba di Kamera
                    </h4>
                    <p className="font-sans text-sm text-ink/90 font-medium leading-relaxed">
                      {activeSpecimen.tips}
                    </p>
                  </div>
                )}

                {/* Pembanding Visual Bentuk yang Mirip */}
                {similarLetters.length > 0 && (
                  <div className="pt-1">
                    <h4 className="font-mono text-xs font-black uppercase tracking-wider text-ink/70 mb-2.5">
                      Bandingkan dengan Huruf yang Mirip:
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
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
                            className="flex items-center gap-2.5 pr-3.5 pl-1.5 py-1.5 bg-paper hover:bg-yellow border-[2px] border-ink shadow-[3px_3px_0_#111] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                            aria-label={`Bandingkan dan buka huruf ${simChar}`}
                          >
                            <MiniHandSkeletonSvg
                              letter={simChar}
                              className="w-10 h-10"
                            />
                            <span className="font-display font-black text-lg text-ink">
                              {simChar}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Aksi Utama */}
              <div className="relative z-10 pt-5 border-t-[2.5px] border-ink flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to={`/latihan?letter=${activeSpecimen.letter}`}
                  className="btn btn-coral min-h-[48px] text-xs sm:text-sm font-mono font-black uppercase tracking-wider flex-1 flex items-center justify-center gap-2 shadow-[5px_5px_0_#111]"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>Coba Huruf {activeSpecimen.letter} di Kamera</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/kuis"
                  className="btn btn-paper hover:bg-yellow min-h-[48px] text-xs font-mono font-black uppercase px-5 text-center"
                >
                  Tes di Kuis Eja
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ZONA 2: DIREKTORI REFERENSI 26 HURUF BERWARNA & INTERAKTIF */}
        <section aria-label="Daftar Referensi 26 Huruf SIBI">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 mb-8 border-b-[3px] border-ink">
            <div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-ink tracking-tight">
                Daftar Semua Huruf
              </h2>
              <p className="font-sans text-sm text-ink/75 mt-1">
                Menampilkan {filteredAlphabets.length} dari 26 huruf SIBI. Klik kartu mana saja untuk memutar model 3D-nya di atas.
              </p>
            </div>

            {/* Filter Kategori */}
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFilter(f.key)}
                    className={`min-h-[40px] px-3.5 py-2 border-[2px] border-ink font-mono text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-yellow text-ink shadow-[4px_4px_0_#111] -translate-y-0.5"
                        : "bg-paper text-ink hover:bg-paper-2 shadow-[2px_2px_0_#111]"
                    }`}
                    aria-pressed={isActive}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredAlphabets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAlphabets.map((item) => (
                <AlphabetDirectoryCard
                  key={item.letter}
                  item={item}
                  isSelected={activeSpecimen.letter === item.letter}
                  onSelect={selectSpecimen}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center max-w-lg mx-auto bg-paper-2 border-[3px] border-ink shadow-[6px_6px_0_#111]">
              <h3 className="font-display font-black text-2xl text-ink mb-2">
                Tidak Ada Huruf yang Cocok dengan &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="font-sans text-sm text-ink/80 mb-6">
                Pencarian pada filter aktif tidak menemukan huruf yang sesuai. Reset pencarian untuk menampilkan kembali 26 alfabet SIBI.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="btn btn-yellow text-xs font-mono uppercase min-h-[44px]"
              >
                Tampilkan Semua 26 Huruf
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
