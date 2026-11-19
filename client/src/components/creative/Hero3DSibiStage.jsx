import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Camera,
  Volume2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Hand,
  RotateCcw,
  Move3d,
  Play,
  Pause,
} from "lucide-react";
import { SIBI_ALPHABETS_FALLBACK } from "../../services/fallbackData";

const AUTO_CYCLE_MS = 3000;
const TRANSITION_MS = 720;

// Topologi 21 Landmark MediaPipe Hand (0: pergelangan, 1-4: ibu jari, 5-8: telunjuk, 9-12: tengah, 13-16: manis, 17-20: kelingking)
export const HAND_CONNECTIONS = [
  // Telapak tangan
  { from: 0, to: 1, group: "palm" },
  { from: 0, to: 5, group: "palm" },
  { from: 0, to: 9, group: "palm" },
  { from: 0, to: 13, group: "palm" },
  { from: 0, to: 17, group: "palm" },
  { from: 5, to: 9, group: "palm" },
  { from: 9, to: 13, group: "palm" },
  { from: 13, to: 17, group: "palm" },
  // Ibu jari
  { from: 1, to: 2, group: "thumb" },
  { from: 2, to: 3, group: "thumb" },
  { from: 3, to: 4, group: "thumb" },
  // Jari telunjuk
  { from: 5, to: 6, group: "index" },
  { from: 6, to: 7, group: "index" },
  { from: 7, to: 8, group: "index" },
  // Jari tengah
  { from: 9, to: 10, group: "middle" },
  { from: 10, to: 11, group: "middle" },
  { from: 11, to: 12, group: "middle" },
  // Jari manis
  { from: 13, to: 14, group: "ring" },
  { from: 14, to: 15, group: "ring" },
  { from: 15, to: 16, group: "ring" },
  // Jari kelingking
  { from: 17, to: 18, group: "pinky" },
  { from: 18, to: 19, group: "pinky" },
  { from: 19, to: 20, group: "pinky" },
];

export const GROUP_COLORS = {
  palm: "#111111",
  thumb: "#FF4D4D",
  index: "#0055FF",
  middle: "#00C68E",
  ring: "#00C68E",
  pinky: "#FFD000",
};

export const NODE_COLORS = [
  "#111111", // 0: wrist
  "#FF4D4D", "#FF4D4D", "#FF4D4D", "#FF4D4D", // 1-4: thumb
  "#0055FF", "#0055FF", "#0055FF", "#0055FF", // 5-8: index
  "#00C68E", "#00C68E", "#00C68E", "#00C68E", // 9-12: middle
  "#00C68E", "#00C68E", "#00C68E", "#00C68E", // 13-16: ring
  "#FFD000", "#FFD000", "#FFD000", "#FFD000", // 17-20: pinky
];

// Parameter pose biomekanik untuk 26 alfabet SIBI (A-Z)
// curl: [mcp, pip, dip] dalam radian; spread: sudut mekar samping (radian)
const FINGER_BASE = {
  index: { mcp: [-0.26, 0.10, 0.01], lengths: [0.32, 0.22, 0.16], spreadBase: -0.08 },
  middle: { mcp: [-0.08, 0.14, 0.02], lengths: [0.35, 0.25, 0.17], spreadBase: 0.00 },
  ring: { mcp: [0.10, 0.11, 0.01], lengths: [0.32, 0.23, 0.16], spreadBase: 0.06 },
  pinky: { mcp: [0.26, 0.04, 0.00], lengths: [0.25, 0.18, 0.14], spreadBase: 0.14 },
};

function buildFingerChain(base, curl, spread = 0, crossX = 0) {
  const [mx, my, mz] = base.mcp;
  const [c1, c2, c3] = curl;
  const [l1, l2, l3] = base.lengths;

  const a1 = c1;
  const a2 = c1 + c2;
  const a3 = c1 + c2 + c3;
  const totalSpread = base.spreadBase + spread;

  const p0 = [mx, my, mz];
  const p1 = [
    mx + Math.sin(totalSpread) * l1 + crossX * 0.35,
    my + Math.cos(a1) * l1,
    mz + Math.sin(a1) * l1,
  ];
  const p2 = [
    p1[0] + Math.sin(totalSpread) * l2 + crossX * 0.65,
    p1[1] + Math.cos(a2) * l2,
    p1[2] + Math.sin(a2) * l2,
  ];
  const p3 = [
    p2[0] + Math.sin(totalSpread) * l3 + crossX,
    p2[1] + Math.cos(a3) * l3,
    p2[2] + Math.sin(a3) * l3,
  ];
  return [p0, p1, p2, p3];
}

// Konfigurasi gestur SIBI + sudut pandang showcase 3D optimal tiap huruf
const SIBI_POSE_CONFIG = {
  A: { thumb: "upSide", i: [1.55, 1.65, 1.15], m: [1.58, 1.65, 1.15], r: [1.58, 1.65, 1.15], p: [1.55, 1.60, 1.10], spread: 0, viewYaw: 0.06, viewPitch: 0.00 },
  B: { thumb: "across", i: [0.04, 0.04, 0.04], m: [0.04, 0.04, 0.04], r: [0.04, 0.04, 0.04], p: [0.06, 0.05, 0.05], spread: -0.02, viewYaw: -0.08, viewPitch: 0.02 },
  C: { thumb: "cArch", i: [0.65, 0.85, 0.70], m: [0.68, 0.85, 0.70], r: [0.70, 0.85, 0.70], p: [0.72, 0.82, 0.65], yaw: -0.65, spread: 0.01, viewYaw: 0.14, viewPitch: 0.04 },
  D: { thumb: "oMeetMid", i: [0.04, 0.04, 0.04], m: [0.85, 1.05, 0.85], r: [0.90, 1.05, 0.85], p: [0.95, 1.05, 0.85], yaw: -0.22, viewYaw: -0.10, viewPitch: 0.04 },
  E: { thumb: "tuckLow", i: [1.15, 1.50, 1.20], m: [1.15, 1.50, 1.20], r: [1.15, 1.50, 1.20], p: [1.15, 1.45, 1.15], spread: 0, viewYaw: 0.10, viewPitch: -0.04 },
  F: { thumb: "oMeetIdx", i: [0.88, 1.05, 0.88], m: [0.05, 0.04, 0.04], r: [0.06, 0.05, 0.04], p: [0.08, 0.06, 0.05], spread: 0.14, viewYaw: -0.12, viewPitch: 0.04 },
  G: { thumb: "pointFwd", i: [0.06, 0.05, 0.04], m: [1.58, 1.65, 1.15], r: [1.60, 1.65, 1.15], p: [1.58, 1.60, 1.10], roll: 1.42, yaw: -0.35, viewYaw: 0.16, viewPitch: 0.02 },
  H: { thumb: "across", i: [0.05, 0.04, 0.04], m: [0.05, 0.04, 0.04], r: [1.60, 1.65, 1.15], p: [1.58, 1.60, 1.10], roll: 1.45, yaw: -0.30, viewYaw: 0.12, viewPitch: 0.02 },
  I: { thumb: "across", i: [1.58, 1.65, 1.15], m: [1.60, 1.65, 1.15], r: [1.58, 1.65, 1.15], p: [0.04, 0.04, 0.04], viewYaw: -0.06, viewPitch: 0.00 },
  J: { thumb: "across", i: [1.58, 1.65, 1.15], m: [1.60, 1.65, 1.15], r: [1.58, 1.65, 1.15], p: [0.04, 0.04, 0.04], dynamic: "J", viewYaw: 0.10, viewPitch: 0.04 },
  K: { thumb: "kMiddle", i: [0.04, 0.04, 0.04], m: [0.18, 0.08, 0.04], r: [1.58, 1.65, 1.15], p: [1.55, 1.60, 1.10], spread: 0.22, viewYaw: -0.14, viewPitch: 0.02 },
  L: { thumb: "outWide", i: [0.04, 0.04, 0.04], m: [1.58, 1.65, 1.15], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], viewYaw: 0.04, viewPitch: 0.00 },
  M: { thumb: "under3", i: [1.35, 1.55, 1.15], m: [1.35, 1.55, 1.15], r: [1.35, 1.55, 1.15], p: [1.60, 1.65, 1.15], viewYaw: 0.10, viewPitch: -0.06 },
  N: { thumb: "under2", i: [1.35, 1.55, 1.15], m: [1.35, 1.55, 1.15], r: [1.60, 1.65, 1.15], p: [1.58, 1.60, 1.10], viewYaw: 0.10, viewPitch: -0.06 },
  O: { thumb: "oMeetIdx", i: [0.86, 1.05, 0.92], m: [0.88, 1.05, 0.92], r: [0.90, 1.05, 0.92], p: [0.92, 1.02, 0.90], yaw: -0.58, viewYaw: 0.18, viewPitch: 0.04 },
  P: { thumb: "kMiddle", i: [0.08, 0.05, 0.04], m: [0.45, 0.15, 0.06], r: [1.58, 1.65, 1.15], p: [1.55, 1.60, 1.10], pitch: 1.95, yaw: -0.42, viewYaw: 0.12, viewPitch: -0.08 },
  Q: { thumb: "pointFwd", i: [0.10, 0.06, 0.04], m: [1.58, 1.65, 1.15], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], pitch: 2.15, yaw: -0.25, viewYaw: 0.14, viewPitch: -0.08 },
  R: { thumb: "across", i: [0.05, 0.04, 0.04], m: [0.08, 0.06, 0.04], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], crossR: true, viewYaw: -0.08, viewPitch: 0.02 },
  S: { thumb: "fistFront", i: [1.62, 1.68, 1.18], m: [1.64, 1.68, 1.18], r: [1.64, 1.68, 1.18], p: [1.60, 1.62, 1.15], viewYaw: 0.08, viewPitch: -0.02 },
  T: { thumb: "betweenIM", i: [1.52, 1.62, 1.15], m: [1.60, 1.65, 1.15], r: [1.62, 1.65, 1.15], p: [1.58, 1.60, 1.10], viewYaw: -0.10, viewPitch: -0.02 },
  U: { thumb: "across", i: [0.04, 0.04, 0.04], m: [0.04, 0.04, 0.04], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], spread: -0.04, viewYaw: -0.06, viewPitch: 0.00 },
  V: { thumb: "across", i: [0.04, 0.04, 0.04], m: [0.04, 0.04, 0.04], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], spread: 0.24, viewYaw: 0.04, viewPitch: 0.00 },
  W: { thumb: "acrossP", i: [0.04, 0.04, 0.04], m: [0.04, 0.04, 0.04], r: [0.05, 0.04, 0.04], p: [1.55, 1.60, 1.10], spread: 0.18, viewYaw: 0.06, viewPitch: 0.00 },
  X: { thumb: "across", i: [0.55, 1.35, 1.10], m: [1.60, 1.65, 1.15], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], yaw: -0.45, viewYaw: 0.16, viewPitch: 0.02 },
  Y: { thumb: "outWide", i: [1.58, 1.65, 1.15], m: [1.60, 1.65, 1.15], r: [1.58, 1.65, 1.15], p: [0.05, 0.04, 0.04], spread: 0.26, viewYaw: -0.04, viewPitch: 0.00 },
  Z: { thumb: "across", i: [0.04, 0.04, 0.04], m: [1.58, 1.65, 1.15], r: [1.60, 1.65, 1.15], p: [1.55, 1.60, 1.10], dynamic: "Z", viewYaw: 0.08, viewPitch: 0.04 },
};

function buildThumbChain(mode) {
  switch (mode) {
    case "upSide":
      return [[-0.28, -0.34, 0.04], [-0.42, -0.16, 0.08], [-0.46, 0.04, 0.08], [-0.45, 0.22, 0.07]];
    case "outWide":
      return [[-0.28, -0.34, 0.04], [-0.46, -0.22, 0.05], [-0.66, -0.14, 0.05], [-0.84, -0.06, 0.05]];
    case "cArch":
      return [[-0.26, -0.34, 0.06], [-0.38, -0.18, 0.18], [-0.34, -0.02, 0.30], [-0.20, 0.10, 0.36]];
    case "oMeetIdx":
      return [[-0.26, -0.34, 0.06], [-0.36, -0.16, 0.16], [-0.28, 0.02, 0.28], [-0.14, 0.12, 0.34]];
    case "oMeetMid":
      return [[-0.24, -0.34, 0.06], [-0.28, -0.18, 0.16], [-0.14, -0.04, 0.28], [0.02, 0.04, 0.32]];
    case "tuckLow":
      return [[-0.24, -0.34, 0.05], [-0.16, -0.18, 0.14], [-0.02, -0.06, 0.18], [0.10, 0.00, 0.18]];
    case "pointFwd":
      return [[-0.26, -0.34, 0.05], [-0.34, -0.18, 0.12], [-0.36, 0.00, 0.20], [-0.36, 0.18, 0.26]];
    case "kMiddle":
      return [[-0.24, -0.34, 0.05], [-0.22, -0.14, 0.14], [-0.16, 0.08, 0.20], [-0.08, 0.26, 0.22]];
    case "under2":
      return [[-0.22, -0.34, 0.04], [-0.12, -0.18, 0.09], [0.04, -0.06, 0.10], [0.14, 0.02, 0.08]];
    case "under3":
      return [[-0.22, -0.34, 0.04], [-0.08, -0.18, 0.08], [0.10, -0.06, 0.08], [0.24, 0.00, 0.07]];
    case "betweenIM":
      return [[-0.24, -0.34, 0.05], [-0.22, -0.16, 0.10], [-0.18, 0.04, 0.16], [-0.15, 0.18, 0.24]];
    case "fistFront":
      return [[-0.24, -0.34, 0.08], [-0.16, -0.16, 0.22], [0.02, -0.06, 0.26], [0.18, -0.04, 0.22]];
    case "acrossP":
      return [[-0.24, -0.34, 0.06], [-0.10, -0.22, 0.16], [0.10, -0.12, 0.18], [0.24, -0.04, 0.15]];
    case "across":
    default:
      return [[-0.24, -0.34, 0.06], [-0.12, -0.22, 0.15], [0.04, -0.12, 0.18], [0.16, -0.08, 0.16]];
  }
}

export function rotatePoint3D([x, y, z], pitch = 0, yaw = 0, roll = 0) {
  // Roll (rotasi Z)
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const x1 = x * cr - y * sr;
  const y1 = x * sr + y * cr;
  const z1 = z;

  // Pitch (rotasi X)
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  const x2 = x1;

  // Yaw (rotasi Y)
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x3 = x2 * cy + z2 * sy;
  const z3 = -x2 * sy + z2 * cy;
  const y3 = y2;

  return [x3, y3, z3];
}

// Pose tengah transisi (tangan sedikit membuka dan merilekskan jari sebelum mengunci huruf berikutnya)
function buildNeutralOpenPose() {
  const wrist = [-0.02, -0.56, 0.0];
  const thumb = [[-0.28, -0.34, 0.05], [-0.42, -0.20, 0.09], [-0.54, -0.06, 0.11], [-0.62, 0.08, 0.12]];
  const index = buildFingerChain(FINGER_BASE.index, [0.22, 0.18, 0.14], -0.14);
  const middle = buildFingerChain(FINGER_BASE.middle, [0.18, 0.16, 0.12], -0.02);
  const ring = buildFingerChain(FINGER_BASE.ring, [0.22, 0.18, 0.14], 0.10);
  const pinky = buildFingerChain(FINGER_BASE.pinky, [0.26, 0.20, 0.15], 0.18);
  return [wrist, ...thumb, ...index, ...middle, ...ring, ...pinky];
}

export const NEUTRAL_OPEN_POSE = buildNeutralOpenPose();

export function getSibiHandPose3D(letter) {
  const cfg = SIBI_POSE_CONFIG[letter] || SIBI_POSE_CONFIG.A;
  const wrist = [-0.02, -0.56, 0.0];
  const thumb = buildThumbChain(cfg.thumb);

  const spread = cfg.spread || 0;
  const idxSpread = cfg.crossR ? 0.05 : -spread;
  const midSpread = cfg.crossR ? -0.14 : 0;

  const index = buildFingerChain(FINGER_BASE.index, cfg.i, idxSpread, cfg.crossR ? 0.04 : 0);
  const middle = buildFingerChain(FINGER_BASE.middle, cfg.m, midSpread, cfg.crossR ? -0.18 : 0);
  const ring = buildFingerChain(FINGER_BASE.ring, cfg.r, spread * 0.65);
  const pinky = buildFingerChain(FINGER_BASE.pinky, cfg.p, spread);

  const rawPoints = [wrist, ...thumb, ...index, ...middle, ...ring, ...pinky];
  const pitch = cfg.pitch || 0;
  const yaw = cfg.yaw || 0;
  const roll = cfg.roll || 0;

  const points = rawPoints.map((pt) => rotatePoint3D(pt, pitch, yaw, roll));
  return {
    points,
    dynamic: cfg.dynamic || null,
    viewYaw: cfg.viewYaw || 0,
    viewPitch: cfg.viewPitch || 0,
  };
}

export const Hero3DSibiStage = ({ isSimulationMode = true }) => {
  const [selected, setSelected] = useState("A");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRotated, setIsRotated] = useState(false);

  const cardContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const cycleBarRef = useRef(null);

  // State orientasi 3D kamera di dalam canvas
  const DEFAULT_ROT = { x: 0.16, y: -0.26 };
  const rotationRef = useRef({ x: DEFAULT_ROT.x, y: DEFAULT_ROT.y });
  const showcaseRotRef = useRef({ x: 0, y: 0.06 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const hoverParallaxRef = useRef({ x: 0, y: 0 });

  // State transisi 2-tahap pose & timer 3 detik
  const initialPose = useMemo(() => getSibiHandPose3D("A"), []);
  const currentLandmarksRef = useRef(initialPose.points.map((p) => [...p]));
  const prevLandmarksRef = useRef(initialPose.points.map((p) => [...p]));
  const midOpenLandmarksRef = useRef(initialPose.points.map((p) => [...p]));
  const targetPoseRef = useRef(initialPose);
  const transitionStartRef = useRef(0);
  const turnDirRef = useRef(1);
  const lockPulseStartRef = useRef(-1);
  const lockPulseTriggeredRef = useRef(true);

  const isAutoPlayingRef = useRef(isAutoPlaying);
  isAutoPlayingRef.current = isAutoPlaying;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const cycleElapsedRef = useRef(0);

  // Preferensi reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Multi-plane CSS 3D card tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 220, damping: 24 });
  const smoothY = useSpring(mouseY, { stiffness: 220, damping: 24 });
  const cardRotateX = useTransform(smoothY, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [7, -7]);
  const cardRotateY = useTransform(smoothX, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [-8, 8]);

  const currentIndex = SIBI_ALPHABETS_FALLBACK.findIndex((x) => x.letter === selected);
  const current = currentIndex !== -1 ? SIBI_ALPHABETS_FALLBACK[currentIndex] : SIBI_ALPHABETS_FALLBACK[0];
  const isDynamic = current.gestureType === "dynamic";

  const triggerLetterTransition = useCallback((nextLetter, direction = 1) => {
    prevLandmarksRef.current = currentLandmarksRef.current.map((p) => [...p]);
    const nextPose = getSibiHandPose3D(nextLetter);
    targetPoseRef.current = nextPose;

    // Hitung kurva perantara tangan sedikit terbuka agar jari terlihat mengurai lalu membentuk gestur baru
    midOpenLandmarksRef.current = prevLandmarksRef.current.map((prevPt, idx) => {
      const openPt = NEUTRAL_OPEN_POSE[idx];
      const tgtPt = nextPose.points[idx];
      return [
        openPt[0] * 0.55 + prevPt[0] * 0.25 + tgtPt[0] * 0.20,
        openPt[1] * 0.55 + prevPt[1] * 0.25 + tgtPt[1] * 0.20,
        openPt[2] * 0.55 + prevPt[2] * 0.25 + tgtPt[2] * 0.20,
      ];
    });

    turnDirRef.current = direction;
    transitionStartRef.current = performance.now();
    lockPulseTriggeredRef.current = false;
    cycleElapsedRef.current = 0;
  }, []);

  const selectLetter = useCallback(
    (nextLetter, direction = 1) => {
      if (nextLetter === selectedRef.current) {
        cycleElapsedRef.current = 0;
        return;
      }
      triggerLetterTransition(nextLetter, direction);
      setSelected(nextLetter);
    },
    [triggerLetterTransition]
  );

  // Render loop 3D Canvas + timer otomatis 3 detik A sampai Z
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let time = 0;
    let lastFrameTime = performance.now();

    const project = ([vx, vy, vz], width, height, rotX, rotY) => {
      // Yaw (rotY) lalu Pitch (rotX)
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
      const unit = Math.min(width, height) * 0.43;

      return {
        x: width / 2 + x1 * unit * scale,
        y: height / 2 - y2 * unit * scale + height * 0.06,
        z: z2,
        scale,
      };
    };

    const renderFrame = (now) => {
      const dt = Math.min(100, Math.max(0, now - lastFrameTime));
      lastFrameTime = now;
      time += dt * 0.0015;

      // Update timer 3 detik otomatis A -> B -> ... -> Z
      if (isAutoPlayingRef.current && !isDraggingRef.current) {
        cycleElapsedRef.current += dt;
        if (cycleElapsedRef.current >= AUTO_CYCLE_MS) {
          const curIdx = SIBI_ALPHABETS_FALLBACK.findIndex((x) => x.letter === selectedRef.current);
          const nextIdx = (curIdx + 1) % SIBI_ALPHABETS_FALLBACK.length;
          const nextChar = SIBI_ALPHABETS_FALLBACK[nextIdx].letter;
          triggerLetterTransition(nextChar, 1);
          setSelected(nextChar);
        }
      }

      if (cycleBarRef.current) {
        const ratio = isAutoPlayingRef.current
          ? Math.min(1, cycleElapsedRef.current / AUTO_CYCLE_MS)
          : 0;
        cycleBarRef.current.style.transform = `scaleX(${ratio})`;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(240, Math.floor(rect.width));
      const height = Math.max(200, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Transisi artikulasi 2-tahap + impuls pergelangan tangan 3D
      const targetPts = targetPoseRef.current.points;
      const prevPts = prevLandmarksRef.current;
      const midPts = midOpenLandmarksRef.current;
      const currPts = currentLandmarksRef.current;

      const tRaw = prefersReducedMotion
        ? 1
        : Math.min(1, Math.max(0, (now - transitionStartRef.current) / TRANSITION_MS));

      if (tRaw >= 0.85 && !lockPulseTriggeredRef.current) {
        lockPulseTriggeredRef.current = true;
        lockPulseStartRef.current = now;
      }

      let waveLiftY = 0;
      let waveRoll = 0;
      let waveYaw = 0;
      let wavePitch = 0;

      if (tRaw < 1 && !prefersReducedMotion) {
        const dir = turnDirRef.current;
        const arc = Math.sin(tRaw * Math.PI);
        waveLiftY = arc * 0.085;
        waveYaw = arc * 0.30 * dir;
        wavePitch = -arc * 0.13;
        waveRoll = Math.sin(tRaw * Math.PI * 2) * 0.09 * dir;
      }

      for (let i = 0; i < 21; i++) {
        let bx;
        let by;
        let bz;

        if (tRaw >= 1) {
          bx = targetPts[i][0];
          by = targetPts[i][1];
          bz = targetPts[i][2];
        } else if (tRaw < 0.38) {
          const u1 = tRaw / 0.38;
          const e1 = 1 - Math.pow(1 - u1, 2);
          bx = prevPts[i][0] + (midPts[i][0] - prevPts[i][0]) * e1;
          by = prevPts[i][1] + (midPts[i][1] - prevPts[i][1]) * e1;
          bz = prevPts[i][2] + (midPts[i][2] - prevPts[i][2]) * e1;
        } else {
          const u2 = (tRaw - 0.38) / 0.62;
          const e2 = 1 - Math.pow(1 - u2, 3);
          bx = midPts[i][0] + (targetPts[i][0] - midPts[i][0]) * e2;
          by = midPts[i][1] + (targetPts[i][1] - midPts[i][1]) * e2;
          bz = midPts[i][2] + (targetPts[i][2] - midPts[i][2]) * e2;
        }

        currPts[i][0] = bx;
        currPts[i][1] = by;
        currPts[i][2] = bz;
      }

      // Interpolasi sudut showcase per huruf secara halus
      const showcaseSpeed = prefersReducedMotion ? 1 : 0.09;
      showcaseRotRef.current.y += (targetPoseRef.current.viewYaw - showcaseRotRef.current.y) * showcaseSpeed;
      showcaseRotRef.current.x += (targetPoseRef.current.viewPitch - showcaseRotRef.current.x) * showcaseSpeed;

      // Hitung rotasi aktif (user drag + showcase huruf + impuls transisi + hover parallax + ayunan idle)
      const idleSwayY = !isDraggingRef.current && !prefersReducedMotion ? Math.sin(time * 0.9) * 0.12 : 0;
      const idleSwayX = !isDraggingRef.current && !prefersReducedMotion ? Math.cos(time * 0.65) * 0.04 : 0;
      const gridRotX = rotationRef.current.x + hoverParallaxRef.current.y * 0.14 + idleSwayX;
      const gridRotY = rotationRef.current.y + hoverParallaxRef.current.x * 0.22 + idleSwayY;
      const handRotX = gridRotX + showcaseRotRef.current.x + wavePitch;
      const handRotY = gridRotY + showcaseRotRef.current.y + waveYaw;

      // 1. Gambar lantai grid perspektif 3D
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

      // Cincin denyut lantai 3D saat gestur huruf baru terkunci
      if (lockPulseStartRef.current > 0 && !prefersReducedMotion) {
        const pulseElapsed = now - lockPulseStartRef.current;
        if (pulseElapsed < 550) {
          const pt = pulseElapsed / 550;
          const pulseEase = 1 - Math.pow(1 - pt, 2);
          const centerFloor = project([0, floorY, 0], width, height, gridRotX, gridRotY);
          const rx = (28 + pulseEase * 68) * centerFloor.scale;
          const ry = (9 + pulseEase * 22) * centerFloor.scale;
          ctx.save();
          ctx.strokeStyle = `rgba(255, 208, 0, ${(1 - pt) * 0.9})`;
          ctx.lineWidth = 3 * (1 - pt * 0.5);
          ctx.beginPath();
          ctx.ellipse(centerFloor.x, centerFloor.y, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          lockPulseStartRef.current = -1;
        }
      }

      // 2. Transformasi roll pergelangan + angkat vertikal, lalu proyeksikan 21 landmark
      const animatedPts = currPts.map((pt) => {
        const [rx, ry, rz] = waveRoll !== 0 ? rotatePoint3D(pt, 0, 0, waveRoll) : pt;
        return [rx, ry + waveLiftY, rz];
      });
      const projected = animatedPts.map((pt) => project(pt, width, height, handRotX, handRotY));

      // Bayangan proyeksi di lantai grid 3D (mengecil halus saat tangan terangkat)
      ctx.save();
      const liftShrink = 1 - waveLiftY * 1.8;
      ctx.fillStyle = "rgba(17, 17, 17, 0.11)";
      const shadowCenter = project([0, floorY, 0], width, height, gridRotX, gridRotY);
      ctx.beginPath();
      ctx.ellipse(
        shadowCenter.x,
        shadowCenter.y,
        44 * shadowCenter.scale * liftShrink,
        14 * shadowCenter.scale * liftShrink,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // 3. Lintasan dinamis 3D untuk huruf J dan Z
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

        // Titik penanda gerak menyusuri lintasan
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

      // 4. Painter's Algorithm: urutkan tulang dan sendi dari belakang ke depan (z kecil ke besar)
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
          const baseWidth = (item.isPalm ? 7 : 8) * avgScale;

          // Outline hitam Neobrutalist
          ctx.strokeStyle = "#111111";
          ctx.lineCap = "round";
          ctx.lineWidth = baseWidth + 3.5;
          ctx.beginPath();
          ctx.moveTo(item.a.x, item.a.y);
          ctx.lineTo(item.b.x, item.b.y);
          ctx.stroke();

          // Isian tulang berwarna kontras
          ctx.strokeStyle = item.color;
          ctx.lineWidth = baseWidth;
          ctx.beginPath();
          ctx.moveTo(item.a.x, item.a.y);
          ctx.lineTo(item.b.x, item.b.y);
          ctx.stroke();
        } else {
          const r = (item.isWrist ? 6.8 : item.isTip ? 6.2 : 4.5) * item.node.scale;
          ctx.fillStyle = item.isTip ? item.color : "#ffffff";
          ctx.strokeStyle = "#111111";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(item.node.x, item.node.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [prefersReducedMotion, triggerLetterTransition]);

  // Handler mouse di area kartu luar untuk CSS 3D tilt + parallax ringan
  const handleCardMouseMove = (e) => {
    if (!cardContainerRef.current || prefersReducedMotion) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(nx);
    mouseY.set(ny);
    hoverParallaxRef.current = { x: nx, y: ny };
  };

  const handleCardMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    hoverParallaxRef.current = { x: 0, y: 0 };
  };

  // Handler drag 360 derajat khusus di area 3D Canvas
  const handleCanvasPointerDown = (e) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    rotationRef.current.y += dx * 0.012;
    rotationRef.current.x = Math.max(-1.15, Math.min(1.15, rotationRef.current.x + dy * 0.012));

    const movedEnough =
      Math.abs(rotationRef.current.x - DEFAULT_ROT.x) > 0.06 ||
      Math.abs(rotationRef.current.y - DEFAULT_ROT.y) > 0.06;
    if (movedEnough && !isRotated) setIsRotated(true);
  };

  const handleCanvasPointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { }
  };

  const handleResetAngle = (e) => {
    e.stopPropagation();
    rotationRef.current = { x: DEFAULT_ROT.x, y: DEFAULT_ROT.y };
    setIsRotated(false);
  };

  const handleToggleAutoPlay = (e) => {
    e.stopPropagation();
    setIsAutoPlaying((prev) => !prev);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + SIBI_ALPHABETS_FALLBACK.length) % SIBI_ALPHABETS_FALLBACK.length;
    selectLetter(SIBI_ALPHABETS_FALLBACK[prevIdx].letter, -1);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % SIBI_ALPHABETS_FALLBACK.length;
    selectLetter(SIBI_ALPHABETS_FALLBACK[nextIdx].letter, 1);
  };

  const handleSpeak = (e) => {
    e.stopPropagation();
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(`Huruf ${current.letter}`);
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

  return (
    <div
      ref={cardContainerRef}
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      style={{ perspective: 1100 }}
      className="relative w-full max-w-md mx-auto select-none py-2"
    >
      <motion.div
        style={{
          rotateX: cardRotateX,
          rotateY: cardRotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full"
      >
        {/* Lapisan Belakang (Z: -24px): Plat Kuning Neobrutalist */}
        <div
          style={{ transform: "translateZ(-24px) translateX(10px) translateY(12px)" }}
          className="absolute inset-0 bg-yellow border-[3px] border-ink shadow-[8px_8px_0_#111] pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute bottom-2.5 right-4 font-mono text-[10px] font-black uppercase text-ink/80">
            26 Alfabet SIBI
          </div>
        </div>

        {/* Lapisan Tengah (Z: 0px): Rangka Utama Kartu */}
        <div className="relative bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] p-5 sm:p-6">
          {/* Header Mengambang (Z: 34px) */}
          <div
            style={{ transform: "translateZ(34px)" }}
            className="flex items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-ink/15"
          >
            <div className="flex items-center gap-3">
              {/* Keycap Huruf 3D dengan transisi huruf aktif */}
              <motion.div
                key={current.letter}
                initial={prefersReducedMotion ? false : { scale: 0.86, y: -4 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="w-11 h-11 bg-yellow border-[2.5px] border-ink shadow-[3px_3px_0_#111] flex items-center justify-center font-display font-black text-2xl text-ink"
              >
                {current.letter}
              </motion.div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/75 block">
                  Peraga Tangan 3D
                </span>
                <span
                  className={`font-display font-black text-xs uppercase ${isDynamic ? "text-coral" : "text-cobalt"
                    }`}
                >
                  {isDynamic ? "Gerak Dinamis" : "Gestur Statis"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`tag text-[9px] font-bold ${isSimulationMode ? "tag-yellow" : "tag-mint"
                  }`}
              >
                {isSimulationMode ? "21 Titik Sendi" : "Kamera Siap"}
              </span>

              <button
                type="button"
                onClick={handleSpeak}
                className={`p-2 border-[2px] border-ink shadow-[2px_2px_0_#111] transition-colors cursor-pointer ${isSpeaking ? "bg-coral text-white" : "bg-paper-2 hover:bg-yellow text-ink"
                  }`}
                title={`Dengarkan pelafalan huruf ${current.letter}`}
                aria-label={`Dengarkan pelafalan huruf ${current.letter}`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stage Viewport 3D (Z: 22px): Kanvas Model Tangan Interaktif */}
          <div
            style={{ transform: "translateZ(22px)" }}
            className="relative bg-paper-2 border-[2.5px] border-ink shadow-[4px_4px_0_#111] mb-4 overflow-hidden"
          >
            {/* Bar Kontrol Atas: Geser 3D + Putar/Jeda + Reset */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-10">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-paper border-[1.5px] border-ink shadow-[2px_2px_0_#111] font-mono text-[10px] font-bold text-ink">
                <Move3d className="w-3.5 h-3.5 text-cobalt" aria-hidden="true" />
                <span>Geser 3D</span>
              </span>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                {isRotated && (
                  <button
                    type="button"
                    onClick={handleResetAngle}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-paper hover:bg-yellow border-[1.5px] border-ink shadow-[2px_2px_0_#111] font-mono text-[10px] font-black text-ink cursor-pointer"
                    title="Kembalikan sudut kamera 3D awal"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleAutoPlay}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 border-[1.5px] border-ink shadow-[2px_2px_0_#111] font-mono text-[10px] font-black text-ink cursor-pointer transition-colors ${isAutoPlaying ? "bg-yellow hover:bg-yellow-dark" : "bg-mint hover:bg-paper"
                    }`}
                  title={isAutoPlaying ? "Jeda perpindahan otomatis 3 detik" : "Lanjutkan perpindahan otomatis A sampai Z"}
                  aria-label={isAutoPlaying ? "Jeda animasi otomatis" : "Putar animasi otomatis"}
                >
                  {isAutoPlaying ? (
                    <>
                      <Pause className="w-3 h-3" aria-hidden="true" />
                      <span>Jeda</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" aria-hidden="true" />
                      <span>Putar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              aria-label={`Model 3D 21 landmark tangan SIBI huruf ${current.letter}`}
              className="w-full h-56 sm:h-60 block cursor-grab active:cursor-grabbing touch-none"
            />

            {/* Garis Progres Hitung Mundur 3 Detik */}
            <div className="w-full h-[3px] bg-ink/15 overflow-hidden">
              <div
                ref={cycleBarRef}
                className="w-full h-full bg-yellow origin-left will-change-transform"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>

          {/* Deskripsi Posisi Jemari (Z: 24px) */}
          <div style={{ transform: "translateZ(24px)" }} className="mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Hand className="w-3.5 h-3.5 text-coral" aria-hidden="true" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/75">
                Cara Membentuk Jari
              </span>
            </div>
            <p className="font-sans text-xs text-ink font-semibold leading-relaxed p-3 bg-paper border-[2px] border-ink/40 shadow-[2px_2px_0_#111] min-h-[54px]">
              {current.description}
            </p>
          </div>

          {/* Urutan Lengkap 26 Huruf A sampai Z & Navigasi (Z: 28px) */}
          <div style={{ transform: "translateZ(28px)" }} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-ink/75">
                  Pilih Huruf
                </span>
                <span className="font-mono text-[10px] font-bold tabular-nums text-cobalt">
                  {String(currentIndex + 1).padStart(2, "0")}/26
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  to="/kamus"
                  className="font-mono text-[10px] font-black text-ink/75 hover:text-ink hover:underline mr-1 uppercase flex items-center gap-0.5"
                >
                  <span>Kamus</span>
                  <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 border-[2px] border-ink bg-paper hover:bg-yellow shadow-[2px_2px_0_#111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  title="Huruf Sebelumnya"
                  aria-label="Huruf Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 border-[2px] border-ink bg-paper hover:bg-yellow shadow-[2px_2px_0_#111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  title="Huruf Berikutnya"
                  aria-label="Huruf Berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-9 sm:grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
              {SIBI_ALPHABETS_FALLBACK.map((item, idx) => {
                const isSelected = selected === item.letter;
                return (
                  <button
                    key={item.letter}
                    type="button"
                    onClick={() => selectLetter(item.letter, idx >= currentIndex ? 1 : -1)}
                    className={`h-7 font-display font-black text-[11px] border-[1.5px] transition-all flex items-center justify-center cursor-pointer ${isSelected
                      ? "bg-ink text-yellow border-ink shadow-[2px_2px_0_#111] -translate-y-0.5"
                      : "bg-paper text-ink border-ink/30 hover:border-ink hover:bg-yellow"
                      }`}
                    aria-label={`Tampilkan pose 3D huruf ${item.letter}`}
                    aria-pressed={isSelected}
                  >
                    {item.letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tombol Aksi Kamera (Z: 32px) */}
          <div style={{ transform: "translateZ(32px)" }}>
            <Link
              to={`/latihan?letter=${current.letter}`}
              className="btn btn-coral w-full py-3 text-xs font-mono font-black uppercase tracking-wider shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              <span>Latih Huruf &ldquo;{current.letter}&rdquo; di Kamera</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
