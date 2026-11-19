import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  useScroll,
  useTransform,
  useVelocity,
  useSpring,
  useMotionValue,
  motion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";
import {
  Camera,
  BookOpen,
  MessageSquare,
  Zap,
  Shield,
  BarChart2,
  Award,
  Layers,
  Volume2,
  Activity,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import ShapeGrid from "../components/reactbits/ShapeGrid";
import TextType from "../components/reactbits/TextType";
import ScrollReveal from "../components/reactbits/ScrollReveal";
import MicroSlats from "../components/reactbits/MicroSlats";
import { DecryptedText } from "../components/reactbits/DecryptedText";
import { SpotlightCard } from "../components/reactbits/SpotlightCard";
import { MagnetButton } from "../components/reactbits/MagnetButton";
import {
  Hero3DSibiStage,
  HAND_CONNECTIONS,
  GROUP_COLORS,
  NODE_COLORS,
  getSibiHandPose3D,
} from "../components/creative/Hero3DSibiStage";

/**
 * Renderer Vektor 21-Landmark Tangan SIBI untuk kartu-kartu interaktif di HomePage.
 */
const HomeMiniHandSvg = ({ letter = "A", className = "w-24 h-24", bgClass = "bg-paper-2" }) => {
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
        y: 56 - y2 * 42 * scale,
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
        width: conn.group === "palm" ? 3.8 : 4.3,
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
      className={`shrink-0 border-[2px] border-ink shadow-[3px_3px_0_#111] ${bgClass} ${className}`}
      aria-label={`Diagram 21 titik tangan SIBI huruf ${letter}`}
    >
      <line x1="12" y1="86" x2="88" y2="86" stroke="#111111" strokeOpacity="0.16" strokeWidth="1" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="#111111" strokeOpacity="0.09" strokeWidth="1" strokeDasharray="2 2" />

      {geometry.dynamic === "J" && (
        <path
          d="M 70 24 L 70 55 Q 70 72 52 72 Q 38 72 40 58"
          fill="none"
          stroke="#FF4D4D"
          strokeWidth="2.4"
          strokeDasharray="3 2"
        />
      )}
      {geometry.dynamic === "Z" && (
        <path
          d="M 32 24 L 68 24 L 32 54 L 70 54"
          fill="none"
          stroke="#111111"
          strokeWidth="2.4"
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
            strokeWidth={b.width + 2.2}
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

/* ─────────────────────────────────────────
   HERO SECTION
   Menggunakan React Bits <ShapeGrid /> untuk
   background interaktif dan <TextType /> untuk
   headline ketik dinamis.
───────────────────────────────────────── */
const Hero = ({ isSimulationMode }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const leftY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);
  const rightY = useTransform(scrollYProgress, [0, 1], ["0%", "6%"]);

  return (
    <section ref={ref} className="min-h-screen pt-14 relative overflow-hidden bg-paper">
      {/* React Bits ShapeGrid: Interactive Grid Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto">
        <ShapeGrid
          shape="square"
          direction="diagonal"
          lineColor="rgba(17, 17, 17, 0.08)"
          hoverColor="#FFD000"
          hoverFillColor="#FFD000"
          fillOpacity={0.22}
          cellSize={44}
          speed={0.4}
          tiltX={0}
          tiltY={0}
          glow={0.35}
          twinkle={0.12}
          fade={0.88}
          clickCascade={true}
        />
      </div>

      {/* Big decorative letter behind everything */}
      <div
        className="deco-num select-none pointer-events-none"
        style={{ fontSize: "clamp(200px, 40vw, 480px)", top: "-60px", right: "-40px", opacity: 0.035 }}
        aria-hidden="true"
      >
        26
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pointer-events-none">
        <div className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row gap-0">

          {/* KIRI: copy utama */}
          <motion.div
            style={{ y: leftY }}
            className="flex-1 flex flex-col justify-center py-20 lg:py-28 lg:pr-12 lg:border-r-[2.5px] lg:border-ink pointer-events-auto"
          >
            {/* Headline: Menggunakan React Bits <TextType /> */}
            <div className="mb-6">
              <TextType
                as="h1"
                className="font-display font-black leading-[0.95] tracking-tight text-ink"
                style={{ fontSize: "clamp(2.5rem, 6.5vw, 5.2rem)" }}
                prefix="Belajar "
                prefixColor="#111111"
                text={[
                  "26 huruf SIBI langsung di kamera.",
                  "bentuk jari A sampai Z lewat model 3D.",
                  "mengeja isyarat sampai berbunyi suara.",
                ]}
                textColors={["#0055FF", "#FF4D4D", "#00875A"]}
                typingSpeed={55}
                pauseDuration={2300}
                deletingSpeed={30}
                deleteMode="backspace"
                typeEffect="rise"
                cursorStyle="bar"
                cursorColor="#FFD000"
                cursorGlide={true}
                showCursor={true}
              />
            </div>

            <p className="font-sans text-lg sm:text-xl text-ink/80 font-medium max-w-lg leading-relaxed mb-10">
              Arahkan tangan ke webcam, bentuk huruf A sampai Z dalam Sistem Isyarat Bahasa Indonesia (SIBI), dan dengarkan rangkaian katamu dibacakan dalam bahasa Indonesia.
            </p>

            {/* CTA: dua tombol dengan aksi spesifik */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/latihan" className="btn btn-coral text-base py-3.5 px-6 shadow-[4px_4px_0_#111]">
                <Camera className="w-5 h-5 mr-2" aria-hidden="true" />
                Buka Kamera &amp; Coba Huruf A
              </Link>
              <Link to="/kamus" className="btn btn-paper text-base py-3.5 px-6 shadow-[4px_4px_0_#111] hover:bg-paper-3">
                <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                Buka Kamus 26 Huruf
              </Link>
            </div>

            {/* Tiga fakta singkat */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Zap, text: "Deteksi 25-30 FPS di browser", color: "text-yellow-dark" },
                { icon: Shield, text: "Video kamera tidak diunggah", color: "text-mint" },
                { icon: BarChart2, text: "Riwayat latihan tersimpan", color: "text-cobalt" },
              ].map(({ icon: Icon, text, color }) => (
                <span key={text} className="flex items-center gap-1.5 font-mono text-xs text-ink/75 font-bold">
                  <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" />
                  {text}
                </span>
              ))}
            </div>
          </motion.div>

          {/* KANAN: Panggung 3D Tangan SIBI Interaktif */}
          <motion.div
            style={{ y: rightY }}
            className="flex flex-col justify-center w-full lg:w-[440px] xl:w-[500px] pb-16 lg:py-16 lg:pl-8 pointer-events-auto"
          >
            <Hero3DSibiStage isSimulationMode={isSimulationMode} />
          </motion.div>
        </div>
      </div>

      {/* Ticker bottom border */}
      <div className="absolute bottom-0 left-0 right-0 border-t-[2.5px] border-ink bg-yellow overflow-hidden py-2 z-10">
        <div
          className="flex gap-0 whitespace-nowrap font-mono font-bold text-sm text-ink"
          style={{ animation: "ticker 28s linear infinite" }}
          aria-hidden="true"
        >
          {[...SIBI_ALPHABETS_FALLBACK, ...SIBI_ALPHABETS_FALLBACK].map((item, i) => (
            <span key={i} className="px-5 border-r-2 border-ink/20 flex items-center gap-2">
              {item.letter}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 1: HORIZONTAL ROADMAP (VELOCITY-SKEWED 3D TRACK)
   Pinning scroll horizontal interaktif dengan
   Framer Motion useVelocity + 3D Card Tilt +
   Diagram 21-Landmark Tangan + React Bits DecryptedText.
───────────────────────────────────────── */
const RoadmapCard3D = ({ mode }) => {
  const cardRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 260, damping: 22 });
  const sy = useSpring(my, { stiffness: 260, damping: 22 });
  const rotX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const [hovered, setHovered] = useState(false);

  const IconComp = mode.icon;

  const handleMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
    setHovered(false);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      style={{ perspective: 950 }}
      className="w-[330px] sm:w-[400px] lg:w-[440px] shrink-0 select-none"
    >
      <motion.div
        style={{
          rotateX: rotX,
          rotateY: rotY,
          transformStyle: "preserve-3d",
        }}
        className={`h-full border-[3px] border-ink p-7 flex flex-col justify-between ${mode.bg} ${mode.textColor} shadow-[8px_8px_0_#111] relative overflow-hidden transition-shadow hover:shadow-[12px_12px_0_#111]`}
      >
        <span
          className="deco-num -right-3 -bottom-8 text-[11rem] opacity-10 select-none pointer-events-none"
          aria-hidden="true"
        >
          {mode.num}
        </span>

        <div style={{ transform: "translateZ(24px)" }}>
          <div className="flex items-center justify-between mb-5 border-b-2 border-current/25 pb-3">
            <span className="px-2.5 py-1 bg-ink text-yellow border-2 border-ink font-mono text-[10px] font-black uppercase shadow-[2px_2px_0_#111]">
              {hovered ? <DecryptedText text={mode.badge} speed={22} maxIterations={6} /> : mode.badge}
            </span>
            <div className="w-9 h-9 border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_#111] flex items-center justify-center">
              <IconComp className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-mono font-black uppercase opacity-80 block mb-1">
                Tahap {mode.num} / 05
              </span>
              <h3 className="font-display font-black text-2xl sm:text-3xl leading-tight">
                {mode.title}
              </h3>
            </div>
            <HomeMiniHandSvg
              letter={mode.sampleLetter}
              className="w-20 h-20"
              bgClass="bg-paper"
            />
          </div>

          <p className="font-sans text-sm opacity-95 leading-relaxed font-semibold">
            {mode.desc}
          </p>
        </div>

        <div style={{ transform: "translateZ(34px)" }} className="mt-7 pt-4 border-t-2 border-current/25">
          <Link
            to={mode.to}
            className={`btn w-full text-xs font-mono py-3 px-4 flex items-center justify-center gap-2 transition-all ${
              mode.bg.includes("ink")
                ? "btn-yellow text-ink shadow-[4px_4px_0_#ffffff] hover:bg-white"
                : "btn-ink text-paper shadow-[4px_4px_0_#111] hover-invert-yellow"
            }`}
          >
            <span>{mode.cta}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const HorizontalRoadmap = () => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-66%"]);
  const scrollVelocity = useVelocity(scrollYProgress);
  const smoothVelocity = useSpring(scrollVelocity, { stiffness: 280, damping: 32 });
  const trackSkewX = useTransform(smoothVelocity, [-0.8, 0, 0.8], [7, 0, -7]);
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 28 });

  const modes = [
    {
      num: "01",
      badge: "26 HURUF SIBI",
      sampleLetter: "A",
      title: "Kamus Tangan 3D",
      desc: "Putar model tangan 3D sampai 360 derajat untuk melihat lekukan tiap jari dari depan, samping, dan atas. Bandingkan juga huruf yang mirip seperti K, V, dan Y.",
      cta: "Jelajahi Kamus 3D",
      to: "/kamus",
      bg: "bg-theme-yellow",
      textColor: "text-ink",
      icon: BookOpen,
    },
    {
      num: "02",
      badge: "DETEKSI WEBCAM",
      sampleLetter: "L",
      title: "Latihan Kamera Langsung",
      desc: "Tiru bentuk jari di layar, lalu tahan posisimu selama 1 detik di depan kamera. Indikator langsung memberi tahu apakah hurufmu sudah tepat atau masih tertukar.",
      cta: "Latih Huruf di Kamera",
      to: "/latihan",
      bg: "bg-theme-cobalt",
      textColor: "text-white",
      icon: Camera,
    },
    {
      num: "03",
      badge: "TEKS, SUARA & ISYARAT",
      sampleLetter: "V",
      title: "Jembatan Isyarat & Narasi",
      desc: "Ketik atau ucapkan kalimat lewat mikrofon untuk melihat peragaan tangan 3D-nya huruf demi huruf. Atau eja dari kamera lalu dengarkan kalimatmu dibacakan.",
      cta: "Coba Jembatan 2 Arah",
      to: "/narasi",
      bg: "bg-theme-mint",
      textColor: "text-ink",
      icon: Volume2,
    },
    {
      num: "04",
      badge: "TEBAK & EJA KATA",
      sampleLetter: "Y",
      title: "Kuis Eja di Kamera",
      desc: "Eja kata bahasa Indonesia huruf demi huruf menggunakan tanganmu tanpa melihat bocoran kamus. Kumpulkan poin dan jaga rentetan jawaban benarmu.",
      cta: "Mainkan Kuis Eja",
      to: "/kuis",
      bg: "bg-theme-coral",
      textColor: "text-white",
      icon: Award,
    },
    {
      num: "05",
      badge: "CATATAN LATIHAN",
      sampleLetter: "Z",
      title: "Rapor & Data Latihan",
      desc: "Lihat huruf mana yang sudah kamu kuasai, rata-rata kecepatan deteksi kamera (FPS dan milidetik), lalu unduh seluruh riwayat latihanmu dalam format CSV.",
      cta: "Buka Rapor Latihan",
      to: "/analitik",
      bg: "bg-theme-ink",
      textColor: "text-paper",
      icon: BarChart2,
    },
  ];

  return (
    <section ref={targetRef} className="relative h-[270vh] bg-paper">
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden border-b-[3px] border-ink bg-paper">
        {/* Background subtle architectural grid lines */}
        <div
          className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] pointer-events-none"
          aria-hidden="true"
        />

        {/* Header Bar + Progress Rail */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mb-7 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-yellow border-2 border-ink shadow-[2px_2px_0_#111] font-mono text-xs font-black uppercase mb-2.5">
                <Activity className="w-3.5 h-3.5" />
                <span>5 Ruang Belajar di AJIN</span>
              </div>
              <ScrollReveal
                mode="enter"
                effect="rise"
                splitBy="words"
                stagger={0.04}
                duration={0.65}
                textClassName="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-none"
              >
                Mulai dari kenal bentuk jari sampai lancar mengeja kalimat.
              </ScrollReveal>
            </div>

            {/* Pita Navigasi Cepat 5 Tahap */}
            <div className="flex flex-wrap items-center gap-1.5">
              {modes.map((m) => (
                <Link
                  key={m.num}
                  to={m.to}
                  className="px-2.5 py-1.5 border-2 border-ink bg-paper-2 hover:bg-yellow font-mono text-[11px] font-black text-ink shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5"
                >
                  {m.num}. {m.title.split(" ")[0]}
                </Link>
              ))}
            </div>
          </div>

          {/* Kinetic Scroll Progress Bar */}
          <div className="w-full h-3 border-2 border-ink bg-paper-2 p-0.5 shadow-[2px_2px_0_#111]">
            <motion.div
              style={{ scaleX: progressScaleX }}
              className="h-full w-full bg-yellow origin-left"
            />
          </div>
        </div>

        {/* Velocity-Skewed Horizontal Track */}
        <div className="w-full pl-4 sm:pl-12 relative z-10">
          <motion.div
            style={{ x, skewX: trackSkewX }}
            className="flex gap-7 items-stretch py-3"
          >
            {modes.map((mode) => (
              <RoadmapCard3D key={mode.num} mode={mode} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 2: CARA BELAJAR (3D DECK DEAL + INTERACTIVE MICRO-SIMULATORS)
   4 Kartu dengan simulasi interaktif nyata di
   dalam masing-masing kartu (Scanline 21-Keypoint,
   Hold-to-Lock Ring, Voice TTS, dan XP Counter).
───────────────────────────────────────── */
const HowItWorks = () => {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.22, once: false });
  const [manualStack, setManualStack] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // State interaktif di dalam kartu langkah
  const [holdPct, setHoldPct] = useState(100);
  const [isSimHolding, setIsSimHolding] = useState(false);
  const [demoXp, setDemoXp] = useState(125);
  const [speakingDemo, setSpeakingDemo] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Simulasi Hold-to-Lock saat pengguna menekan tombol uji di Kartu 02
  useEffect(() => {
    if (!isSimHolding) return;
    setHoldPct(0);
    const start = performance.now();
    let raf;
    const step = (now) => {
      const pct = Math.min(100, Math.round(((now - start) / 1000) * 100));
      setHoldPct(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(step);
      } else {
        setIsSimHolding(false);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isSimHolding]);

  const handleDemoSpeak = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("Halo teman, mari belajar SIBI bersama AJIN");
    u.lang = "id-ID";
    u.rate = 0.96;
    u.onstart = () => setSpeakingDemo(true);
    u.onend = () => setSpeakingDemo(false);
    u.onerror = () => setSpeakingDemo(false);
    window.speechSynthesis.speak(u);
  };

  const isStacked = !inView || manualStack;

  const steps = [
    {
      num: "01",
      bg: "bg-theme-cobalt",
      textColor: "text-white",
      badgeColor: "bg-yellow text-ink",
      badgeText: "LANGKAH 01",
      title: "Nyalakan kamera di browser",
      body: "Buka halaman latihan dan izinkan akses webcam. Kamera langsung melacak 21 titik sendi jari tanganmu tanpa perlu pasang aplikasi tambahan.",
      cta: { label: "Buka Kamera Latihan", to: "/latihan", btnClass: "btn-yellow text-ink shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "145%", y: 22, rotate: -8, scale: 0.94, zIndex: 10 },
      offsetMobile: { x: 14, y: 24, rotate: -4, scale: 0.96, zIndex: 10 },
      widget: (
        <div className="mb-5 p-3 bg-ink/35 border-2 border-white/30 flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] space-y-1">
            <span className="text-yellow font-black block">21 TITIK SENDI JARI</span>
            <span className="text-white/90 block">X: 0.48 • Y: 0.32 • Z: -0.04</span>
            <span className="inline-block px-1.5 py-0.5 bg-mint text-ink font-black">
              TANGAN TERBACA
            </span>
          </div>
          <HomeMiniHandSvg letter="B" className="w-16 h-16" bgClass="bg-paper" />
        </div>
      ),
    },
    {
      num: "02",
      bg: "bg-theme-yellow",
      textColor: "text-ink",
      badgeColor: "bg-coral text-white",
      badgeText: "LANGKAH 02",
      title: "Tahan bentuk jari selama 1 detik",
      body: "Saat bentuk jarimu sudah pas, tahan posisimu selama 1 detik penuh. Jeda singkat ini memastikan huruf tidak salah ketik sewaktu jarimu masih bergerak.",
      cta: { label: "Lihat Contoh 26 Huruf", to: "/kamus", btnClass: "btn-ink text-paper shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "48%", y: 10, rotate: 4, scale: 0.97, zIndex: 20 },
      offsetMobile: { x: -12, y: 10, rotate: 3, scale: 0.98, zIndex: 20 },
      widget: (
        <div className="mb-5 p-3 bg-paper border-2 border-ink shadow-[3px_3px_0_#111]">
          <div className="flex items-center justify-between font-mono text-[10px] font-black mb-1.5">
            <span>TAHAN POSISI 1 DETIK</span>
            <span className="text-cobalt tabular-nums">{holdPct}%</span>
          </div>
          <div className="w-full h-3 border-2 border-ink bg-paper-2 overflow-hidden mb-2">
            <div
              className="h-full bg-mint transition-all duration-75"
              style={{ width: `${holdPct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsSimHolding(true)}
            className="w-full py-1 bg-ink text-yellow font-mono text-[10px] font-black uppercase cursor-pointer hover:bg-cobalt hover:text-white transition-colors"
          >
            {isSimHolding ? "Menahan Posisi..." : "Coba Simulasi Tahan 1 Detik"}
          </button>
        </div>
      ),
    },
    {
      num: "03",
      bg: "bg-theme-coral",
      textColor: "text-white",
      badgeColor: "bg-yellow text-ink",
      badgeText: "LANGKAH 03",
      title: "Susun kata dan bunyikan suaranya",
      body: "Cukup eja satu atau dua huruf awal, pilih rekomendasi kata yang muncul, lalu tekan tombol suara untuk membacakan kalimatmu dalam bahasa Indonesia.",
      cta: { label: "Buka Jembatan Narasi", to: "/narasi", btnClass: "btn-yellow text-ink shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "-48%", y: -6, rotate: -4, scale: 1.0, zIndex: 30 },
      offsetMobile: { x: 10, y: -10, rotate: -3, scale: 1.0, zIndex: 30 },
      widget: (
        <div className="mb-5 p-3 bg-paper text-ink border-2 border-ink shadow-[3px_3px_0_#111] flex items-center justify-between gap-2">
          <div className="font-mono text-[10px]">
            <span className="text-ink/70 font-bold block">CONTOH SUARA ID-ID:</span>
            <span className="font-black text-xs block">&ldquo;Halo teman, mari belajar SIBI&rdquo;</span>
          </div>
          <button
            type="button"
            onClick={handleDemoSpeak}
            className={`px-2.5 py-2 border-2 border-ink font-mono text-[10px] font-black uppercase cursor-pointer shrink-0 flex items-center gap-1 ${
              speakingDemo ? "bg-mint text-ink" : "bg-yellow text-ink hover:bg-ink hover:text-yellow"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{speakingDemo ? "Bunyi" : "Putar"}</span>
          </button>
        </div>
      ),
    },
    {
      num: "04",
      bg: "bg-theme-mint",
      textColor: "text-ink",
      badgeColor: "bg-ink text-yellow",
      badgeText: "LANGKAH 04",
      title: "Tes hafalanmu di Kuis Eja",
      body: "Eja kata acak di depan kamera tanpa menyontek kamus. Setiap huruf yang berhasil terkunci langsung tercatat ke dalam rapor belajarmu.",
      cta: { label: "Mulai Kuis Eja", to: "/kuis", btnClass: "btn-ink text-paper shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "-145%", y: -18, rotate: 6, scale: 1.03, zIndex: 40 },
      offsetMobile: { x: -10, y: -22, rotate: 4, scale: 1.02, zIndex: 40 },
      widget: (
        <div className="mb-5 p-3 bg-paper border-2 border-ink shadow-[3px_3px_0_#111] flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] font-bold text-ink/70 block">POIN TERKUMPUL:</span>
            <span className="font-display font-black text-xl text-ink tabular-nums">
              +<DecryptedText text={String(demoXp)} speed={25} maxIterations={5} /> XP
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDemoXp((p) => p + 25)}
            className="px-2.5 py-1.5 bg-yellow hover:bg-ink hover:text-yellow border-2 border-ink font-mono text-[10px] font-black uppercase cursor-pointer"
          >
            Tambah +25 XP
          </button>
        </div>
      ),
    },
  ];

  return (
    <section
      ref={containerRef}
      className="py-24 bg-paper-2 border-t-[3px] border-b-[3px] border-ink relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="tag tag-ink text-xs font-mono">
                {isStacked ? "Susunan Kartu: Bertumpuk" : "Susunan Kartu: Terbuka"}
              </span>
            </div>
            <ScrollReveal
              mode="enter"
              effect="skew"
              splitBy="words"
              stagger={0.05}
              duration={0.7}
              textClassName="font-display font-black text-ink leading-tight text-3xl sm:text-5xl lg:text-6xl"
            >
              Cara pakai AJIN dari buka kamera sampai kalimat pertama.
            </ScrollReveal>
          </div>

          <MagnetButton
            onClick={() => setManualStack(!manualStack)}
            magnetStrength={0.28}
            className="btn btn-yellow text-xs font-mono py-3 px-5 shadow-[4px_4px_0_#111] rounded-none flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-ink" />
            <span>{manualStack ? "Buka 4 Kartu Langkah" : "Tumpuk Kembali Kartu"}</span>
          </MagnetButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative min-h-[420px]">
          {steps.map((step, i) => {
            const currentOffset = isDesktop ? step.offsetDesktop : step.offsetMobile;
            return (
              <motion.div
                key={step.num}
                initial={false}
                animate={
                  isStacked
                    ? {
                        x: currentOffset.x,
                        y: currentOffset.y,
                        rotate: currentOffset.rotate,
                        scale: currentOffset.scale,
                        zIndex: currentOffset.zIndex,
                        boxShadow: "10px 10px 0px #111111",
                      }
                    : {
                        x: 0,
                        y: 0,
                        rotate: 0,
                        scale: 1,
                        zIndex: 1,
                        boxShadow: "6px 6px 0px #111111",
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 185,
                  damping: 20,
                  mass: 0.85,
                  delay: isStacked ? 0 : i * 0.1,
                }}
                className={`relative p-6 border-[3px] border-ink flex flex-col justify-between nb-lift ${step.bg} ${step.textColor} transition-shadow overflow-hidden`}
              >
                <span
                  className="absolute -bottom-4 -right-2 font-display font-black text-8xl opacity-15 select-none pointer-events-none leading-none"
                  aria-hidden="true"
                >
                  {step.num}
                </span>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`border-2 border-ink ${step.badgeColor} text-[10px] font-mono font-black px-2 py-0.5 uppercase shadow-[2px_2px_0_#111]`}>
                      {step.badgeText}
                    </span>
                    <span className="font-mono text-xs font-black opacity-80">
                      0{i + 1}/04
                    </span>
                  </div>

                  <h3 className="font-display font-black text-xl sm:text-2xl mb-2.5 leading-snug">
                    {step.title}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm font-medium opacity-95 leading-relaxed mb-4">
                    {step.body}
                  </p>

                  {step.widget}
                </div>

                <div className="pt-3 border-t-2 border-current/25 z-10">
                  <Link
                    to={step.cta.to}
                    className={`btn w-full text-xs font-mono uppercase tracking-wider py-2.5 px-4 flex items-center justify-center gap-1.5 ${step.cta.btnClass}`}
                  >
                    <span>{step.cta.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 3: FITUR UNGGULAN (KINETIC LAB + SPOTLIGHT CARDS)
   Simulator Hold-to-Type Interaktif + React Bits
   <SpotlightCard /> + Pembanding 3D Statis vs Dinamis.
───────────────────────────────────────── */
const DEMO_WORD_BANK = [
  { word: "KITA", desc: "4 huruf statis berurutan" },
  { word: "BISA", desc: "4 huruf statis sehari-hari" },
  { word: "SIBI", desc: "Sistem Isyarat Bahasa Indonesia" },
  { word: "AJIN", desc: "Mengandung huruf dinamis J" },
];

const Features = () => {
  const [wordIdx, setWordIdx] = useState(0);
  const [typedCount, setTypedCount] = useState(4);
  const [activeDynLetter, setActiveDynLetter] = useState("J");
  const [isSpeakingWord, setIsSpeakingWord] = useState(false);

  const activeWordObj = DEMO_WORD_BANK[wordIdx];
  const letters = activeWordObj.word.split("");

  const handleCycleWord = (idx) => {
    setWordIdx(idx);
    setTypedCount(0);
  };

  // Animasi ketik bertahap saat kata diganti
  useEffect(() => {
    if (typedCount >= letters.length) return;
    const t = setTimeout(() => {
      setTypedCount((p) => Math.min(letters.length, p + 1));
    }, 320);
    return () => clearTimeout(t);
  }, [typedCount, letters.length]);

  const handleSpeakActiveWord = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(activeWordObj.word);
    u.lang = "id-ID";
    u.rate = 0.95;
    u.onstart = () => setIsSpeakingWord(true);
    u.onend = () => setIsSpeakingWord(false);
    u.onerror = () => setIsSpeakingWord(false);
    window.speechSynthesis.speak(u);
  };

  return (
    <section className="py-24 bg-paper border-b-[3px] border-ink relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="tag tag-cobalt mb-3 inline-block">Kenapa Nyaman Dipakai Latihan</span>
            <ScrollReveal
              mode="enter"
              effect="rise"
              splitBy="words"
              stagger={0.04}
              duration={0.65}
              textClassName="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-none"
            >
              Deteksi jari langsung di perangkatmu tanpa kirim video ke luar.
            </ScrollReveal>
          </div>
          <span className="font-mono text-xs font-bold text-ink/75">
            MediaPipe 21 Titik Sendi • ONNX WebAssembly • Suara Bahasa Indonesia
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Kartu Besar Kiri (7 Kolom): Interactive Hold-to-Type Word Lab */}
          <div className="lg:col-span-7 border-[3px] border-ink bg-theme-cobalt text-white p-7 sm:p-9 shadow-[8px_8px_0_#111] flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b-2 border-white/20">
                <span className="px-2.5 py-1 bg-yellow text-ink border-2 border-ink font-mono text-xs font-black uppercase shadow-[2px_2px_0_#111]">
                  Kunci Huruf 1 Detik
                </span>
                <span className="font-mono text-xs font-bold text-white/85">
                  Klik contoh kata untuk melihat urutan kuncian hurufnya
                </span>
              </div>

              <h3 className="font-display font-black text-2xl sm:text-4xl text-white mb-3 leading-tight">
                Tangan pindah posisi tidak akan dianggap salah ketik.
              </h3>
              <p className="font-sans text-sm sm:text-base text-white/90 leading-relaxed mb-6 max-w-xl font-medium">
                Waktu kamu mengganti bentuk jari dari huruf K ke I, jari pasti melewati bentuk huruf lain. Karena huruf baru dikunci setelah ditahan stabil 1 detik, gerakan perpindahan tangan tidak akan ikut tercatat.
              </p>

              {/* Pilihan Kata Simulasi */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {DEMO_WORD_BANK.map((item, idx) => (
                  <button
                    key={item.word}
                    type="button"
                    onClick={() => handleCycleWord(idx)}
                    className={`px-3 py-1.5 border-2 border-ink font-mono text-xs font-black uppercase cursor-pointer transition-all ${
                      wordIdx === idx
                        ? "bg-yellow text-ink shadow-[3px_3px_0_#111] -translate-y-0.5"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    Kata &ldquo;{item.word}&rdquo;
                  </button>
                ))}
              </div>

              {/* Panggung Kartu Ejaan 21-Landmark per Huruf */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {letters.map((char, idx) => {
                  const isLocked = idx < typedCount;
                  return (
                    <motion.div
                      key={`${activeWordObj.word}-${idx}`}
                      initial={{ opacity: 0, y: 14, scale: 0.92 }}
                      animate={{
                        opacity: isLocked ? 1 : 0.45,
                        y: 0,
                        scale: isLocked ? 1 : 0.96,
                      }}
                      transition={{ type: "spring", stiffness: 280, damping: 22 }}
                      className={`p-3 border-[2.5px] border-ink flex flex-col items-center text-center ${
                        isLocked
                          ? "bg-paper text-ink shadow-[4px_4px_0_#111]"
                          : "bg-ink/40 text-white"
                      }`}
                    >
                      <HomeMiniHandSvg
                        letter={char}
                        className="w-16 h-16 mb-2"
                        bgClass="bg-paper-2"
                      />
                      <span className="font-display font-black text-2xl leading-none">
                        {char}
                      </span>
                      <span className="font-mono text-[9px] font-black uppercase mt-1 px-1.5 py-0.5 bg-yellow text-ink border border-ink">
                        {isLocked ? "1 Detik Pas" : "Menunggu..."}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bar Hasil Kata & Sintesis Suara */}
            <div className="p-4 bg-ink text-paper border-[2.5px] border-ink shadow-[4px_4px_0_#FFD000] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-yellow block">
                  Kata Terbentuk ({activeWordObj.desc}):
                </span>
                <span className="font-mono font-black text-xl sm:text-2xl tracking-wider text-white">
                  &ldquo;<DecryptedText text={activeWordObj.word.slice(0, typedCount) || "..."} speed={28} />&rdquo;
                </span>
              </div>

              <button
                type="button"
                onClick={handleSpeakActiveWord}
                className="btn btn-yellow text-xs font-mono py-2.5 px-4 shadow-[2px_2px_0_#fff]"
              >
                <Volume2 className="w-4 h-4 mr-1.5" />
                <span>{isSpeakingWord ? "Membacakan..." : "Dengarkan Suaranya"}</span>
              </button>
            </div>
          </div>

          {/* Kolom Kanan (5 Kolom): Dua Kartu React Bits <SpotlightCard /> */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Kartu Atas: Privasi & Client-Side WebAssembly */}
            <SpotlightCard
              spotlightColor="rgba(255, 208, 0, 0.28)"
              className="p-6 sm:p-7 border-[3px] border-ink shadow-[6px_6px_0_#111] bg-paper flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b-2 border-ink/15">
                  <span className="tag tag-mint text-[10px]">TANPA UNGGAH VIDEO</span>
                  <Shield className="w-5 h-5 text-ink" />
                </div>
                <h3 className="font-display font-black text-xl sm:text-2xl text-ink mb-2.5 leading-tight">
                  Rekaman webcam diproses di browser laptop atau HP kamu.
                </h3>
                <p className="font-sans text-sm text-ink/85 leading-relaxed font-medium mb-5">
                  Pembacaan 21 titik tangan MediaPipe dan model klasifikasi ONNX berjalan di memori perambanmu sendiri. Tidak ada rekaman wajah atau ruanganmu yang dikirim ke server.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t-2 border-ink font-mono text-center">
                <div className="p-2 bg-paper-2 border border-ink">
                  <span className="text-xs font-black text-cobalt block">25-30 FPS</span>
                  <span className="text-[9px] font-bold text-ink/75 uppercase">Kecepatan</span>
                </div>
                <div className="p-2 bg-paper-2 border border-ink">
                  <span className="text-xs font-black text-ink block">&lt;28 ms</span>
                  <span className="text-[9px] font-bold text-ink/75 uppercase">Jeda Baca</span>
                </div>
                <div className="p-2 bg-mint/30 border border-ink">
                  <span className="text-xs font-black text-ink block">0 Byte</span>
                  <span className="text-[9px] font-bold text-ink/75 uppercase">Video Keluar</span>
                </div>
              </div>
            </SpotlightCard>

            {/* Kartu Bawah: 24 Statis vs 2 Dinamis (J & Z Interaktif) */}
            <SpotlightCard
              spotlightColor="rgba(255, 77, 77, 0.22)"
              className="p-6 sm:p-7 border-[3px] border-ink shadow-[6px_6px_0_#111] bg-paper-2 flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b-2 border-ink/15">
                  <span className="tag tag-coral text-[10px]">24 STATIS &amp; 2 DINAMIS</span>
                  <div className="flex items-center gap-1">
                    {["J", "Z"].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setActiveDynLetter(ch)}
                        className={`px-2.5 py-0.5 border-2 border-ink font-mono text-xs font-black cursor-pointer ${
                          activeDynLetter === ch ? "bg-ink text-yellow" : "bg-paper text-ink hover:bg-yellow"
                        }`}
                      >
                        Huruf {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-black text-xl text-ink mb-2 leading-tight">
                      24 huruf cukup ditahan diam, huruf J dan Z punya arah ayunan.
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-ink/85 leading-relaxed font-medium">
                      {activeDynLetter === "J"
                        ? "Huruf J diawali dengan kelingking tegak seperti huruf I, lalu ujung kelingking diayunkan melengkung membentuk kait huruf J di udara."
                        : "Huruf Z menggunakan jari telunjuk yang digerakkan menyamping, miring ke bawah, lalu ke samping lagi mengikuti bentuk huruf Z."}
                    </p>
                  </div>
                  <HomeMiniHandSvg
                    letter={activeDynLetter}
                    className="w-24 h-24"
                    bgClass="bg-paper"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-ink flex items-center justify-between font-mono text-xs font-bold">
                <span className="text-ink/80">Garis putus-putus menunjukkan arah gerak jari</span>
                <Link
                  to={`/kamus?letter=${activeDynLetter}`}
                  className="text-cobalt font-black hover:underline flex items-center gap-1"
                >
                  <span>Lihat Huruf {activeDynLetter}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 4: SHOWCASE 26 ALFABET (GSAP MAGNETIC WAVE + LIVE ANATOMY DOCK)
   Grid 26 huruf dengan reaksi gelombang kursor GSAP
   dan panggung pratinjau anatomi 21-landmark real-time
   saat kursor menyorot huruf mana saja.
───────────────────────────────────────── */
const AlphabetShowcase = () => {
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-50px" });
  const [hoveredLetter, setHoveredLetter] = useState("A");

  const activeAlphabet = useMemo(
    () =>
      SIBI_ALPHABETS_FALLBACK.find((a) => a.letter === hoveredLetter) ||
      SIBI_ALPHABETS_FALLBACK[0],
    [hoveredLetter]
  );

  // Efek gelombang kedekatan kursor menggunakan GSAP pada 26 tile huruf
  const handleGridMouseMove = useCallback((e) => {
    if (!gridRef.current) return;
    const tiles = gridRef.current.querySelectorAll("[data-sibi-tile]");
    tiles.forEach((tile) => {
      const rect = tile.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 130) {
        const power = 1 - dist / 130;
        gsap.to(tile, {
          y: -power * 8,
          scale: 1 + power * 0.08,
          duration: 0.22,
          ease: "power2.out",
          overwrite: "auto",
        });
      } else {
        gsap.to(tile, {
          y: 0,
          scale: 1,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    });
  }, []);

  const handleGridMouseLeave = useCallback(() => {
    if (!gridRef.current) return;
    const tiles = gridRef.current.querySelectorAll("[data-sibi-tile]");
    gsap.to(tiles, {
      y: 0,
      scale: 1,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.025,
        delayChildren: 0.08,
      },
    },
  };

  const tileVariants = {
    hidden: { opacity: 0, y: 26, scale: 0.84 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 22,
      },
    },
  };

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-paper border-b-[3px] border-ink relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="tag tag-coral text-xs font-mono font-bold">
                26 Alfabet Sistem Isyarat Bahasa Indonesia (SIBI)
              </span>
            </div>
            <h2
              className="font-display font-black text-ink leading-tight"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              Geser kursor ke huruf mana saja untuk melihat{" "}
              <span className="bg-yellow text-ink px-2.5 py-0.5 inline-block border-2 border-ink shadow-[3px_3px_0_#111]">
                posisi jarinya
              </span>
            </h2>
          </div>

          <Link
            to="/kamus"
            className="btn btn-coral text-xs sm:text-sm font-mono uppercase tracking-wider py-3 px-6 shadow-[4px_4px_0_#111] hover-invert-yellow"
          >
            <span>Lihat Semua di Kamus 3D</span>
            <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>

        {/* Live Floating Specimen HUD Bar (Berubah Real-Time Saat Kursor Menyorot Tile) */}
        <div className="mb-8 p-5 sm:p-6 bg-paper-2 border-[3px] border-ink shadow-[6px_6px_0_#111] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow border-[3px] border-ink shadow-[4px_4px_0_#111] flex items-center justify-center font-display font-black text-4xl sm:text-5xl text-ink shrink-0">
              {activeAlphabet.letter}
            </div>
            <HomeMiniHandSvg
              letter={activeAlphabet.letter}
              className="w-16 h-16 sm:w-20 sm:h-20"
              bgClass="bg-paper"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-ink text-yellow font-mono text-[10px] font-black">
                  #{String(activeAlphabet.id).padStart(2, "0")} / 26
                </span>
                <span
                  className={`tag text-[10px] ${
                    activeAlphabet.gestureType === "dynamic" ? "tag-coral" : "tag-mint"
                  }`}
                >
                  {activeAlphabet.gestureType === "dynamic" ? "Gerak Dinamis" : "Gestur Statis"}
                </span>
              </div>
              <h3 className="font-display font-black text-xl text-ink">
                <DecryptedText
                  text={`Panduan Huruf ${activeAlphabet.letter}`}
                  speed={20}
                  maxIterations={5}
                />
              </h3>
              <p className="font-sans text-xs sm:text-sm font-semibold text-ink/85 max-w-xl leading-relaxed mt-0.5">
                {activeAlphabet.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-center shrink-0">
            <Link
              to={`/kamus?letter=${activeAlphabet.letter}`}
              className="btn btn-paper text-xs font-mono py-2.5 px-4"
            >
              Putar 3D di Kamus
            </Link>
            <Link
              to={`/latihan?letter=${activeAlphabet.letter}`}
              className="btn btn-yellow text-xs font-mono py-2.5 px-4"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              <span>Coba Huruf {activeAlphabet.letter}</span>
            </Link>
          </div>
        </div>

        {/* GSAP Magnetic Wave Grid 26 Huruf */}
        <motion.div
          ref={gridRef}
          onMouseMove={handleGridMouseMove}
          onMouseLeave={handleGridMouseLeave}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))] gap-2 sm:gap-2.5"
        >
          {SIBI_ALPHABETS_FALLBACK.map((item) => {
            const isDyn = item.gestureType === "dynamic";
            const isFocused = hoveredLetter === item.letter;
            return (
              <motion.div key={item.letter} variants={tileVariants}>
                <Link
                  data-sibi-tile
                  to={`/kamus?letter=${item.letter}`}
                  onMouseEnter={() => setHoveredLetter(item.letter)}
                  onFocus={() => setHoveredLetter(item.letter)}
                  className={`flex flex-col items-center justify-center aspect-square border-[2.5px] border-ink transition-colors duration-150 relative group ${
                    isFocused
                      ? "bg-ink text-yellow shadow-[5px_5px_0_#FFD000] z-20"
                      : "bg-paper text-ink shadow-[3px_3px_0_#111] hover:bg-ink hover:text-yellow z-10"
                  }`}
                  aria-label={`Huruf ${item.letter}${isDyn ? " (dinamis)" : ""}`}
                >
                  <span
                    className={`font-display font-black text-2xl transition-colors ${
                      isFocused ? "text-yellow" : "text-ink group-hover:text-yellow"
                    }`}
                  >
                    {item.letter}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider transition-colors ${
                      isFocused ? "text-yellow" : "text-ink/70 group-hover:text-yellow"
                    }`}
                  >
                    {isDyn ? "Gerak" : "Diam"}
                  </span>
                  {isDyn && (
                    <span
                      className="absolute top-1 right-1 w-2 h-2 bg-coral border border-ink"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 5: BELAJAR LEWAT KUIS (PLAYABLE MINI SIBI ARCADE)
   Mini game tebak isyarat interaktif langsung di
   beranda dengan diagram 21-landmark, skor live,
   suara TTS id-ID, dan efek confetti kemenangan.
───────────────────────────────────────── */
const MINI_QUIZ_CHALLENGES = [
  { word: "HALO", missingIdx: 2, answer: "L", choices: ["L", "K", "V", "A"] },
  { word: "AJIN", missingIdx: 1, answer: "J", choices: ["I", "J", "Y", "Z"] },
  { word: "SIBI", missingIdx: 2, answer: "B", choices: ["F", "W", "B", "D"] },
  { word: "BISA", missingIdx: 3, answer: "A", choices: ["S", "E", "A", "O"] },
  { word: "KITA", missingIdx: 0, answer: "K", choices: ["V", "K", "R", "U"] },
];

const QuizTeaser = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [miniScore, setMiniScore] = useState(0);

  const currentChallenge = MINI_QUIZ_CHALLENGES[challengeIdx];
  const answerAlphabet =
    SIBI_ALPHABETS_FALLBACK.find((a) => a.letter === currentChallenge.answer) ||
    SIBI_ALPHABETS_FALLBACK[0];

  const handlePickChoice = (letter) => {
    if (isCorrect) return;
    setSelectedChoice(letter);
    if (letter === currentChallenge.answer) {
      setIsCorrect(true);
      setMiniScore((s) => s + 50);
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.7 },
        colors: ["#FFD000", "#FF4D4D", "#0055FF", "#00C68E"],
      });
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(
            `Benar, huruf ${letter}, membentuk kata ${currentChallenge.word}`
          );
          u.lang = "id-ID";
          window.speechSynthesis.speak(u);
        }
      } catch {}
    }
  };

  const handleNextChallenge = () => {
    setSelectedChoice(null);
    setIsCorrect(false);
    setChallengeIdx((prev) => (prev + 1) % MINI_QUIZ_CHALLENGES.length);
  };

  return (
    <section ref={ref} className="py-24 bg-paper-2 border-b-[3px] border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-[3px] border-ink shadow-[10px_10px_0_#111] bg-paper">
          {/* Kiri (7 Kolom): Playable Mini Quiz Arcade */}
          <motion.div
            initial={{ x: -24, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : {}}
            transition={{ duration: 0.45 }}
            className="lg:col-span-7 bg-paper-2 p-6 sm:p-9 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-ink relative overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b-2 border-ink">
              <div className="flex items-center gap-2">
                <span className="tag tag-yellow">Coba Tebak Isyarat</span>
                <span className="font-mono text-xs font-bold text-ink/75">
                  Soal {challengeIdx + 1}/{MINI_QUIZ_CHALLENGES.length}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-mint border-2 border-ink font-mono text-xs font-black text-ink shadow-[2px_2px_0_#111] tabular-nums">
                Poin: +{miniScore} XP
              </span>
            </div>

            {/* Petunjuk Diagram Tangan + Slot Kata */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-6 p-4 bg-paper border-[2.5px] border-ink shadow-[4px_4px_0_#111]">
              <div>
                <span className="font-mono text-[10px] font-black uppercase text-cobalt block mb-1">
                  Perhatikan gambar jari di kanan, huruf apa yang hilang dari kata ini?
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {currentChallenge.word.split("").map((char, i) => {
                    const isMissing = i === currentChallenge.missingIdx;
                    const revealed = !isMissing || isCorrect;
                    return (
                      <span
                        key={i}
                        className={`w-12 h-12 border-[2.5px] border-ink flex items-center justify-center font-display font-black text-xl transition-all ${
                          isMissing
                            ? isCorrect
                              ? "bg-mint text-ink shadow-[3px_3px_0_#111] scale-105"
                              : "bg-yellow text-ink shadow-[3px_3px_0_#111]"
                            : "bg-paper-2 text-ink"
                        }`}
                      >
                        {revealed ? char : "?"}
                      </span>
                    );
                  })}
                </div>
                <p className="font-sans text-xs font-semibold text-ink/80 mt-2.5">
                  Ciri Jari: {answerAlphabet.description}
                </p>
              </div>

              <HomeMiniHandSvg
                letter={currentChallenge.answer}
                className="w-28 h-28"
                bgClass="bg-paper-2"
              />
            </div>

            {/* 4 Tombol Pilihan Jawaban */}
            <div className="mb-4">
              <span className="font-mono text-[10px] font-black uppercase text-ink/75 block mb-2">
                Klik Huruf yang Sesuai:
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {currentChallenge.choices.map((choice) => {
                  const isPicked = selectedChoice === choice;
                  const isRightChoice = choice === currentChallenge.answer;
                  let btnStyle = "bg-paper text-ink hover:bg-yellow";
                  if (isPicked && isRightChoice) btnStyle = "bg-mint text-ink";
                  else if (isPicked && !isRightChoice) btnStyle = "bg-coral text-white";

                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handlePickChoice(choice)}
                      className={`min-h-[48px] border-[2.5px] border-ink font-display font-black text-lg shadow-[3px_3px_0_#111] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${btnStyle}`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Umpan Balik Jawaban */}
            <AnimatePresence mode="wait">
              {selectedChoice && (
                <motion.div
                  key={`${challengeIdx}-${selectedChoice}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 border-2 border-ink flex items-center justify-between gap-3 font-mono text-xs font-bold ${
                    isCorrect ? "bg-mint text-ink" : "bg-coral text-white"
                  }`}
                >
                  <span>
                    {isCorrect
                      ? `Benar. Gambar jari di atas adalah huruf ${currentChallenge.answer}, melengkapi kata "${currentChallenge.word}" (+50 XP).`
                      : `Bukan huruf ${selectedChoice}. Perhatikan lagi petunjuk lekukan jarinya dan pilih huruf lain.`}
                  </span>
                  {isCorrect && (
                    <button
                      type="button"
                      onClick={handleNextChallenge}
                      className="px-3 py-1 bg-ink text-yellow border border-ink font-black uppercase cursor-pointer shrink-0"
                    >
                      Kata Berikutnya →
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Kanan (5 Kolom): Copy & CTA Arena Kuis Kamera */}
          <motion.div
            initial={{ x: 24, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : {}}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-5 bg-paper p-7 sm:p-9 flex flex-col justify-between"
          >
            <div>
              <span className="tag tag-coral mb-4 inline-block">Latihan Mengeja Kata</span>
              <ScrollReveal
                mode="enter"
                effect="rise"
                splitBy="words"
                stagger={0.04}
                duration={0.6}
                textClassName="font-display font-black text-ink leading-tight mb-4 text-2xl sm:text-4xl"
              >
                Sudah hafal bentuk hurufnya? Sekarang coba eja satu kata utuh di kamera.
              </ScrollReveal>
              <p className="font-sans text-sm sm:text-base text-ink/85 leading-relaxed mb-6 font-medium">
                Di halaman Kuis Eja, kamu bisa memilih tema kata dan tingkat kesulitan. Kamera akan membaca ejaan tanganmu dari huruf pertama sampai kata selesai.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t-2 border-ink">
              <Link
                to="/kuis"
                className="btn btn-coral w-full text-xs sm:text-sm font-mono uppercase tracking-wider py-3.5 px-6 shadow-[4px_4px_0_#111] flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" aria-hidden="true" />
                <span>Mulai Kuis Eja dengan Kamera</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                to="/analitik"
                className="btn btn-paper w-full text-xs font-mono uppercase tracking-wider py-2.5 px-4 flex items-center justify-center gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Lihat Riwayat &amp; Akurasi Latihan</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION: CTA BAWAH
   Background dinamis interaktif <MicroSlats />
   dengan <ScrollReveal /> dari React Bits
───────────────────────────────────────── */
const FinalCTA = () => {
  return (
    <section className="py-24 bg-paper border-b-[3.5px] border-ink relative overflow-hidden">
      {/* Background MicroSlats (Harmonized with AJIN brand palette: Cobalt #0055FF, Yellow #FFD000, Paper White #ffffff) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-auto opacity-75">
        <MicroSlats
          preset="tide"
          color="#0055FF"
          glintColor="#FFD000"
          backgroundColor="#ffffff"
          slatWidth={10}
          slatHeight={25}
          gap={3}
          roundness={0.75}
          interactive={true}
          cursorStrength={1.2}
          cursorSize={45}
          swirl={0.15}
          trail={1.4}
          lean={0.2}
          intro={true}
          scale={1.3}
          speed={0.5}
          direction={262}
          chop={0.2}
          stretch={0.12}
          glint={0.65}
          contrast={1.2}
          perspective={0.5}
          fog={0.35}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 pointer-events-none">
        {/* Main Hero Card Container: Solid Opaque Background (Non-Transparent) */}
        <div
          className="border-[3.5px] border-ink bg-theme-yellow p-8 sm:p-14 lg:p-16 shadow-[12px_12px_0_#111] relative overflow-hidden pointer-events-auto"
          style={{ backgroundColor: "#FFD000" }}
        >
          {/* Headline with React Bits ScrollReveal */}
          <div className="text-center my-4">
            <ScrollReveal
              mode="enter"
              effect="rise"
              splitBy="words"
              stagger={0.05}
              duration={0.8}
              baseOpacity={0.15}
              enableBlur={true}
              blurStrength={5}
              highlightColor="#FF4D4D"
              containerClassName="my-2"
              textClassName="font-display font-black text-ink leading-[1.05] tracking-tight text-3xl sm:text-5xl lg:text-6xl text-center"
            >
              Angkat satu tangan di depan kamera dan coba huruf pertamamu sekarang.
            </ScrollReveal>

            <p className="font-sans text-base sm:text-xl font-bold text-ink/80 max-w-2xl mx-auto leading-relaxed mt-6 mb-10">
              Mulai dari huruf A yang paling mudah: kepalkan empat jari, tegakkan ibu jari di samping telunjuk, dan tahan selama 1 detik sampai hurufnya terkunci.
            </p>
          </div>

          {/* 3 Guarantee Checklist Pills */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-10 font-mono text-xs sm:text-sm font-bold text-ink">
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
              <Check className="w-4 h-4 text-mint stroke-[3]" /> 26 Alfabet SIBI Lengkap
            </span>
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
              <Check className="w-4 h-4 text-coral stroke-[3]" /> Diproses Lokal di Browser
            </span>
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
              <Check className="w-4 h-4 text-cobalt stroke-[3]" /> Bisa Langsung Dibacakan Suara
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4">
            <Link
              to="/latihan"
              className="btn btn-ink text-base sm:text-lg font-mono py-4 px-8 shadow-[6px_6px_0_#FF4D4D] hover-invert-yellow flex items-center gap-2.5"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              <span>Buka Kamera &amp; Coba Huruf A</span>
              <span>↗</span>
            </Link>
            <Link
              to="/kamus"
              className="btn btn-paper text-base sm:text-lg font-mono py-4 px-8 shadow-[6px_6px_0_#111] hover:bg-paper-3 flex items-center gap-2.5"
            >
              <BookOpen className="w-5 h-5" aria-hidden="true" />
              <span>Lihat Kamus 26 Huruf</span>
            </Link>
            <Link
              to="/kuis"
              className="btn btn-coral text-base sm:text-lg font-mono py-4 px-8 shadow-[6px_6px_0_#111] flex items-center gap-2.5"
            >
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
              <span>Mainkan Kuis Eja</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   ROOT: HomePage
───────────────────────────────────────── */
export const HomePage = ({ isSimulationMode = true }) => {
  return (
    <div className="min-h-screen bg-paper text-ink pt-14">
      <Hero isSimulationMode={isSimulationMode} />
      <HorizontalRoadmap />
      <HowItWorks />
      <Features />
      <AlphabetShowcase />
      <QuizTeaser />
      <FinalCTA />
    </div>
  );
};
