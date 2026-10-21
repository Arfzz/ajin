import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useScroll, useTransform, motion, useInView } from "framer-motion";
import { Camera, BookOpen, MessageSquare, Zap, Shield, BarChart2, Award, Sparkles, Layers } from "lucide-react";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import ShapeGrid from "../components/reactbits/ShapeGrid";
import TextType from "../components/reactbits/TextType";
import ScrollReveal from "../components/reactbits/ScrollReveal";
import MicroSlats from "../components/reactbits/MicroSlats";

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
            {/* Sticker "Gratis" — gimmick neobrutalist */}
            <div className="flex items-center gap-3 mb-8">
              <span
                className="sticker sticker-coral px-3 py-1.5 text-sm rotated-label"
                style={{ boxShadow: "3px 3px 0 #111" }}
              >
                100% Gratis
              </span>
              <span className="tag">Bahasa Isyarat Indonesia</span>
            </div>

            {/* Headline — Menggunakan React Bits <TextType /> */}
            <div className="mb-6">
              <TextType
                as="h1"
                className="font-display font-black leading-[0.95] tracking-tight text-ink"
                style={{ fontSize: "clamp(2.5rem, 6.5vw, 5.2rem)" }}
                prefix="Belajar "
                prefixColor="#111111"
                text={[
                  "bahasa isyarat langsung di browser.",
                  "26 alfabet SIBI di depan webcam.",
                  "gerakan jemari jadi suara narasi.",
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
              Kamera mengenali gerakan tanganmu secara langsung. Pelajari 26
              huruf SIBI, rangkai kata, dan dengar hasilnya disuarakan otomatis.
            </p>

            {/* CTA — dua tombol dengan warna berbeda, keduanya punya tujuan */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/latihan" className="btn btn-coral text-base py-3.5 px-6 shadow-[4px_4px_0_#111]">
                <Camera className="w-5 h-5 mr-2" aria-hidden="true" />
                Coba Sekarang
              </Link>
              <Link to="/kamus" className="btn btn-paper text-base py-3.5 px-6 shadow-[4px_4px_0_#111] hover:bg-paper-3">
                <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                Lihat 26 Huruf
              </Link>
            </div>

            {/* Tiga fakta singkat */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Zap, text: "Deteksi real-time", color: "text-yellow-dark" },
                { icon: Shield, text: "Kamera tidak diunggah", color: "text-mint" },
                { icon: BarChart2, text: "Progres terekam", color: "text-cobalt" },
              ].map(({ icon: Icon, text, color }) => (
                <span key={text} className="flex items-center gap-1.5 font-mono text-xs text-ink/75 font-bold">
                  <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" />
                  {text}
                </span>
              ))}
            </div>
          </motion.div>

          {/* KANAN: Letter Viewfinder interaktif */}
          <motion.div
            style={{ y: rightY }}
            className="hidden lg:flex flex-col justify-center w-[400px] xl:w-[460px] py-20 pl-10 pointer-events-auto"
          >
            <LetterViewfinder isSimulationMode={isSimulationMode} />
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
              {item.gestureType === "dynamic" && <span className="text-[9px] opacity-50">★</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   LETTER VIEWFINDER
   Interactive SIBI letter picker (kontras tinggi)
───────────────────────────────────────── */
const LetterViewfinder = ({ isSimulationMode }) => {
  const [selected, setSelected] = useState("A");
  const current = SIBI_ALPHABETS_FALLBACK.find((x) => x.letter === selected) || SIBI_ALPHABETS_FALLBACK[0];
  const isDynamic = current.gestureType === "dynamic";

  return (
    <div className="nb-xl relative" style={{ background: "#111" }}>
      {/* HUD top */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b-[2.5px] border-white/20">
        <span className="font-mono text-[10px] text-white/70 uppercase tracking-widest font-bold">
          preview.studio
        </span>
        <span
          className={`tag text-[9px] ${isDynamic ? "tag-coral" : "tag-mint"}`}
        >
          {isDynamic ? "Dinamis" : "Statis"}
        </span>
      </div>

      {/* Huruf besar + info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <span
              className="font-display font-black leading-none text-yellow"
              style={{ fontSize: "6rem" }}
            >
              {current.letter}
            </span>
            <p className="font-sans text-sm text-white/80 mt-1 max-w-[220px] leading-snug font-medium">
              {current.description}
            </p>
          </div>
          {/* Difficulty sticker */}
          <span
            className="sticker sticker-yellow text-xs px-2 py-1 rotated-label-2 mt-2"
            style={{ boxShadow: "2px 2px 0 #111" }}
          >
            {current.difficulty}
          </span>
        </div>

        {/* Alphabet grid */}
        <div className="mb-5">
          <span className="font-mono text-[9px] text-white/90 uppercase tracking-widest block mb-2 font-bold">
            Pilih Huruf
          </span>
          <div className="grid grid-cols-9 gap-[3px]">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((char) => (
              <button
                key={char}
                onClick={() => setSelected(char)}
                className={`h-7 text-[11px] font-mono font-black transition-colors border ${
                  selected === char
                    ? "bg-yellow text-ink border-yellow"
                    : "bg-transparent text-white/80 border-white/40 hover:border-white hover:text-white"
                }`}
                aria-label={`Pilih huruf ${char}`}
                aria-pressed={selected === char}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/latihan?letter=${current.letter}`}
          className="btn btn-yellow w-full text-sm font-mono uppercase tracking-wider py-2.5"
          style={{ boxShadow: "4px 4px 0 #FFD000" }}
        >
          <Camera className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
          Latih &ldquo;{current.letter}&rdquo; dengan Kamera
        </Link>

        {!isSimulationMode && (
          <p className="font-mono text-[9px] text-white/80 text-center mt-2 uppercase tracking-wider font-bold">
            TensorFlow.js WebGL Aktif
          </p>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   SECTION: CARA BELAJAR
   Animasi 4 kartu bertumpuk di tengah seperti
   deck kartu remi, lalu saat user tiba di section
   ini (inView), keempat kartu memisah dan menyebar
   ke grid masing-masing!
───────────────────────────────────────── */
const HowItWorks = () => {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.25, once: false });
  const [manualStack, setManualStack] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isStacked = !inView || manualStack;

  const steps = [
    {
      num: "01",
      bg: "bg-theme-cobalt",
      textColor: "text-white",
      badgeColor: "sticker-yellow",
      badgeText: "Langkah 01",
      title: "Tunjukkan tanganmu",
      body: "Klik \"Coba Sekarang\", izinkan akses kamera, dan arahkan tangan ke dalam bingkai. Tidak perlu install apapun.",
      cta: { label: "Buka Kamera", to: "/latihan", btnClass: "btn-yellow text-ink shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "145%", y: 22, rotate: -8, scale: 0.94, zIndex: 10 },
      offsetMobile: { x: 20, y: 35, rotate: -6, scale: 0.95, zIndex: 10 },
    },
    {
      num: "02",
      bg: "bg-theme-yellow",
      textColor: "text-ink",
      badgeColor: "sticker-coral",
      badgeText: "Langkah 02",
      title: "Tahan gestur 1,5 detik",
      body: "AI mengenali posisi jarimu dan mengunci huruf setelah kamu menahannya sebentar. Jeda singkat ini mencegah karakter masuk secara tidak sengaja.",
      cta: { label: "Kamus 26 Huruf", to: "/kamus", btnClass: "btn-ink text-paper shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "48%", y: 10, rotate: 4, scale: 0.97, zIndex: 20 },
      offsetMobile: { x: -18, y: 15, rotate: 5, scale: 0.97, zIndex: 20 },
    },
    {
      num: "03",
      bg: "bg-theme-coral",
      textColor: "text-white",
      badgeColor: "sticker-yellow",
      badgeText: "Langkah 03",
      title: "Rangkai kata, dengar suara",
      body: "Huruf yang terkunci tersusun menjadi kata. Tekan satu tombol dan teks langsung disuarakan. Persis seperti mengetik, tapi pakai tangan.",
      cta: { label: "Studio Narasi", to: "/narasi", btnClass: "btn-yellow text-ink shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "-48%", y: -6, rotate: -4, scale: 1.0, zIndex: 30 },
      offsetMobile: { x: 15, y: -15, rotate: -4, scale: 1.0, zIndex: 30 },
    },
    {
      num: "04",
      bg: "bg-theme-mint",
      textColor: "text-ink",
      badgeColor: "sticker-cobalt",
      badgeText: "Langkah 04",
      title: "Uji dirimu di kuis eja",
      body: "Kuis Eja menampilkan kata, kamu eja huruf per huruf pakai isyarat. Progres tersimpan otomatis supaya kamu bisa melanjutkan kapanpun.",
      cta: { label: "Mulai Kuis", to: "/kuis", btnClass: "btn-ink text-paper shadow-[3px_3px_0_#111]" },
      offsetDesktop: { x: "-145%", y: -18, rotate: 6, scale: 1.03, zIndex: 40 },
      offsetMobile: { x: -15, y: -35, rotate: 6, scale: 1.03, zIndex: 40 },
    },
  ];

  return (
    <section ref={containerRef} className="py-24 bg-paper-2 border-t-[3px] border-b-[3px] border-ink relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-end justify-between mb-16 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="sticker sticker-yellow px-2.5 py-0.5 text-xs font-mono uppercase rotated-label shadow-[2px_2px_0_#111]">
                🃏 Deck Kartu Bertumpuk
              </span>
              <span className="tag tag-ink text-xs font-mono">
                {isStacked ? "Posisi: Bertumpuk" : "Posisi: Terbuka"}
              </span>
            </div>
            <h2 className="font-display font-black text-ink leading-tight"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)" }}>
              Dari nol sampai bisa
              <br />
              dalam <span className="highlight-coral">4 langkah kilat.</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setManualStack(!manualStack)}
              className="btn btn-paper text-xs font-mono py-2.5 px-4 shadow-[3px_3px_0_#111] hover:bg-yellow flex items-center gap-2"
              title="Klik untuk mencoba animasi tumpuk kartu"
            >
              <Layers className="w-4 h-4 text-ink" />
              <span>{manualStack ? "Buka Kartu" : "Tumpuk Ulang Kartu"}</span>
            </button>
            <span
              className="sticker sticker-coral px-3 py-1.5 text-sm rotated-label-2 hidden sm:flex shadow-[3px_3px_0_#111]"
              aria-hidden="true"
            >
              100% Gratis ✓
            </span>
          </div>
        </div>

        {/* 4 Cards Grid with Stacking / Unstacking Animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative min-h-[380px] lg:min-h-[420px]">
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
                  stiffness: 175,
                  damping: 19,
                  mass: 0.85,
                  delay: isStacked ? 0 : i * 0.12,
                }}
                className={`relative p-7 border-[3px] border-ink flex flex-col justify-between nb-lift ${step.bg} ${step.textColor} transition-shadow overflow-hidden`}
              >
                {/* Background ghost number */}
                <span
                  className="absolute -bottom-4 -right-2 font-display font-black text-8xl opacity-15 select-none pointer-events-none leading-none"
                  aria-hidden="true"
                >
                  {step.num}
                </span>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`sticker ${step.badgeColor} text-[10px] font-mono px-2 py-0.5 uppercase shadow-[2px_2px_0_#111]`}>
                      {step.badgeText}
                    </span>
                    <span className="font-mono text-sm font-black opacity-60">
                      0{i + 1}/04
                    </span>
                  </div>

                  <h3 className="font-display font-black text-2xl mb-3 leading-snug">
                    {step.title}
                  </h3>
                  <p className="font-sans text-sm font-medium opacity-90 leading-relaxed mb-6">
                    {step.body}
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-current/20 z-10">
                  <Link
                    to={step.cta.to}
                    className={`btn w-full text-xs font-mono uppercase tracking-wider py-2.5 px-4 flex items-center justify-center gap-1.5 ${step.cta.btnClass}`}
                  >
                    <span>{step.cta.label}</span>
                    <span>↗</span>
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
   SECTION: FITUR UNGGULAN
   Bukan card grid identik. Layout asimetris:
   satu kartu besar + dua kartu kecil vertikal
───────────────────────────────────────── */
const Features = () => {
  return (
    <section className="py-20 bg-paper border-b-[2.5px] border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-12">
          <span className="tag tag-cobalt">Yang bikin beda</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0">
          {/* Kartu besar kiri: Hold-to-Type mechanic */}
          <div className="card card-cobalt p-8 lg:border-r-0 border-b-[2.5px] lg:border-b-[2.5px] border-ink">
            <span className="tag tag-ink mb-4 block self-start">Fitur Utama</span>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-white mb-3 leading-tight">
              Tahan gestur,
              <br />
              huruf masuk otomatis.
            </h3>
            <p className="font-sans text-sm text-white/90 leading-relaxed mb-6 max-w-sm font-medium">
              Kamu tidak perlu pencet tombol. Tahan posisi jari selama 1,5
              detik, huruf masuk ke narasi. Sistem menunggu gerakanmu
              stabil sebelum mencatat, jadi tidak ada typo karena tangan bergerak.
            </p>

            {/* Visualisasi simulasi */}
            <div className="border-2 border-white/20 bg-white/5 p-4 inline-flex items-center flex-wrap gap-3">
              {["K", "I", "T", "A"].map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="w-10 h-10 border-2 border-yellow bg-yellow font-mono font-black text-ink text-lg flex items-center justify-center"
                    style={{ boxShadow: "3px 3px 0 rgba(255,255,255,0.2)" }}>
                    {c}
                  </span>
                  {i < 3 && <span className="text-white/90 font-mono">+</span>}
                </span>
              ))}
              <span className="text-white/90 font-mono mx-1">→</span>
              <span className="border-2 border-white/30 px-3 py-2 text-white font-bold text-sm"
                style={{ boxShadow: "3px 3px 0 rgba(255,255,255,0.15)" }}>
                &ldquo;KITA&rdquo; 🔊
              </span>
            </div>
          </div>

          {/* Kolom kanan: dua kartu kecil */}
          <div className="flex flex-col">
            {/* Kartu atas: privasi */}
            <div className="card border-b-0 p-6 flex flex-col justify-between flex-1"
              style={{ borderColor: "#111" }}>
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-black text-lg text-ink leading-tight">
                    Kameramu tidak kemana-mana.
                  </h3>
                  <span
                    className="sticker sticker-mint text-xs px-2 py-1 ml-2 flex-shrink-0 rotated-label"
                    style={{ boxShadow: "2px 2px 0 #111" }}
                    aria-hidden="true"
                  >
                    Private
                  </span>
                </div>
                <p className="font-sans text-sm text-ink/90 leading-relaxed font-medium">
                  Semua inferensi AI berjalan langsung di perambanmu. Tidak ada
                  video yang dikirim ke server manapun. Tidak ada akun yang
                  diperlukan untuk mulai.
                </p>
              </div>
              <div className="mt-4 font-mono text-[10px] text-ink/90 uppercase tracking-wider font-bold">
                TensorFlow.js WebGL Backend
              </div>
            </div>

            {/* Kartu bawah: dua tipe gestur */}
            <div className="card p-6 bg-paper-2" style={{ borderColor: "#111" }}>
              <h3 className="font-display font-black text-lg text-ink mb-2 leading-tight">
                24 huruf diam, 2 huruf bergerak.
              </h3>
              <p className="font-sans text-sm text-ink/90 leading-relaxed mb-4 font-medium">
                Huruf J dan Z punya lintasan gerak di udara, berbeda dari 24
                huruf lain yang cukup ditahan di satu posisi.
              </p>
              <div className="flex gap-2">
                <span className="tag">24 Statis</span>
                <span className="tag tag-coral">J &amp; Z Dinamis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION: HORIZONTAL ROADMAP
   Pinning scroll horizontal interaktif
───────────────────────────────────────── */
const HorizontalRoadmap = () => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["1%", "-65%"]);

  const modes = [
    {
      num: "01",
      badge: "★ 26 HURUF LENGKAP",
      badgeColor: "sticker-yellow",
      title: "Kamus Isyarat A–Z",
      desc: "Pelajari konfigurasi jari dari huruf A sampai Z dengan simulasi visual 3D dan tips posisi tangan agar tidak tertukar.",
      cta: "Buka Kamus",
      to: "/kamus",
      bg: "bg-theme-yellow",
      textColor: "text-ink",
      icon: "📖",
    },
    {
      num: "02",
      badge: "⚡ AI CV REAL-TIME",
      badgeColor: "sticker-cobalt",
      title: "Dojo Latihan Kamera",
      desc: "Uji ketangkasan tanganmu langsung di depan webcam. Model AI memverifikasi isyaratmu dan mengunci huruf dalam 1.5 detik.",
      cta: "Mulai Kamera",
      to: "/latihan",
      bg: "bg-theme-cobalt",
      textColor: "text-white",
      icon: "📷",
    },
    {
      num: "03",
      badge: "🎮 SPEED RUN EJA",
      badgeColor: "sticker-coral",
      title: "Arena Kuis Eja Kata",
      desc: "Eja kata-kata kosakata populer (BUKU, SAYA, KITA) dalam tantangan berbatas waktu dengan streak multiplier dan skor EXP.",
      cta: "Masuk Arena Kuis",
      to: "/kuis",
      bg: "bg-theme-coral",
      textColor: "text-white",
      icon: "🏆",
    },
    {
      num: "04",
      badge: "🗣️ TEXT-TO-SPEECH ID",
      badgeColor: "sticker-mint",
      title: "Studio Narasi Kalimat",
      desc: "Rangkai kata demi kata dari gerakan jemarimu menjadi kalimat utuh, lalu bunyikan suara sintetis bahasa Indonesia.",
      cta: "Buka Studio Narasi",
      to: "/narasi",
      bg: "bg-theme-mint",
      textColor: "text-ink",
      icon: "🎙️",
    },
    {
      num: "05",
      badge: "📊 RAPOR PENGUASAAN",
      badgeColor: "sticker-yellow",
      title: "Dashboard Progres",
      desc: "Cek matriks penguasaan 26 hurufmu, rekam jejak akurasi, kecepatan deteksi FPS, dan unduh rapor kemajuan belajarmu.",
      cta: "Cek Rapor Belajar",
      to: "/analitik",
      bg: "bg-theme-ink",
      textColor: "text-paper",
      icon: "📈",
    },
  ];

  return (
    <section ref={targetRef} className="relative h-[260vh] bg-paper">
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden border-b-[3px] border-ink bg-paper">
        {/* Header Bar */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="sticker sticker-coral px-2.5 py-0.5 text-xs font-mono uppercase rotated-label">
                🌀 Scroll Horizontal Interaktif
              </span>
              <span className="tag tag-yellow text-xs font-mono">5 Fase Belajar</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Alur Perjalanan <span className="highlight">Kuasai SIBI</span>
            </h2>
            <p className="font-sans text-xs sm:text-sm text-ink/80 font-medium mt-1">
              Gulir halaman ke bawah untuk menjelajahi seluruh fase pembelajaran AJIN secara horizontal.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-xs font-bold text-ink/70">
            <span>GESER KE KANAN</span>
            <span className="w-8 h-0.5 bg-ink/40 inline-block" />
            <span>→</span>
          </div>
        </div>

        {/* Horizontal Moving Track */}
        <div className="w-full pl-4 sm:pl-12">
          <motion.div style={{ x }} className="flex gap-6 items-stretch">
            {modes.map((mode) => (
              <div
                key={mode.num}
                className={`w-[320px] sm:w-[380px] lg:w-[420px] shrink-0 border-[3px] border-ink p-7 flex flex-col justify-between nb-lift ${mode.bg} ${mode.textColor} shadow-[6px_6px_0_#111] relative overflow-hidden`}
              >
                {/* Background oversized number */}
                <span className="deco-num -right-4 -bottom-6 text-[10rem] opacity-10 select-none pointer-events-none">
                  {mode.num}
                </span>

                <div>
                  <div className="flex items-center justify-between mb-4 border-b-2 border-current/20 pb-3">
                    <span className={`sticker ${mode.badgeColor} text-[10px] font-mono px-2 py-0.5 uppercase`}>
                      {mode.badge}
                    </span>
                    <span className="text-3xl">{mode.icon}</span>
                  </div>

                  <span className="text-xs font-mono font-bold opacity-80 block mb-1">
                    Fase {mode.num}
                  </span>
                  <h3 className="font-display font-black text-2xl mb-3 leading-tight">
                    {mode.title}
                  </h3>
                  <p className="font-sans text-sm opacity-95 leading-relaxed font-medium">
                    {mode.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t-2 border-current/20">
                  <Link
                    to={mode.to}
                    className={`btn w-full text-xs font-mono py-3 px-4 flex items-center justify-center gap-1.5 transition-all ${
                      mode.bg.includes("ink")
                        ? "btn-yellow text-ink shadow-[4px_4px_0_#ffffff] hover:bg-white"
                        : "btn-ink text-paper shadow-[3px_3px_0_#111] hover-invert-yellow"
                    }`}
                  >
                    <span>{mode.cta}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION: SHOWCASE 26 ALFABET
   Grid huruf interaktif dengan animasi 1 per 1
   dan efek hover invert warna!
───────────────────────────────────────── */
const AlphabetShowcase = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.1,
      },
    },
  };

  const tileVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.8 },
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
    <section ref={ref} className="py-20 bg-paper border-b-[3px] border-ink relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="sticker sticker-yellow px-2.5 py-0.5 text-xs font-mono uppercase rotated-label">
                ✨ Staggered Reveal
              </span>
              <span className="sticker sticker-coral px-2.5 py-0.5 text-xs font-mono uppercase">
                26 Huruf SIBI
              </span>
            </div>
            <h2
              className="font-display font-black text-ink leading-tight"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              Katalog Lengkap <span className="bg-yellow text-ink px-2.5 py-0.5 inline-block -rotate-1 border-2 border-ink shadow-[3px_3px_0_#111]">A sampai Z</span>
            </h2>
            <p className="font-sans text-sm sm:text-base text-ink/80 font-medium mt-2 max-w-lg leading-relaxed">
              Setiap huruf terdaftar rapi. Arahkan kursor untuk melihat efek invert warna dan klik untuk melihat video posisi tangan!
            </p>
          </div>
          <Link
            to="/kamus"
            className="btn btn-coral text-xs sm:text-sm font-mono uppercase tracking-wider py-3 px-6 shadow-[4px_4px_0_#111] hover-invert-yellow"
          >
            Buka Kamus Lengkap ↗
          </Link>
        </div>

        {/* Staggered Grid: Tiles muncul 1 per 1 dengan animasi smooth */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-13 gap-2 sm:gap-2.5"
        >
          {SIBI_ALPHABETS_FALLBACK.map((item) => {
            const isDyn = item.gestureType === "dynamic";
            return (
              <motion.div key={item.letter} variants={tileVariants}>
                <Link
                  to={`/kamus?letter=${item.letter}`}
                  className="flex flex-col items-center justify-center aspect-square border-[2.5px] border-ink bg-paper text-ink transition-all duration-150 relative group shadow-[3px_3px_0_#111] hover:bg-ink hover:text-yellow hover:scale-110 hover:-translate-y-1 hover:shadow-[5px_5px_0_#FFD000] z-10"
                  aria-label={`Huruf ${item.letter}${isDyn ? " (dinamis)" : ""}`}
                >
                  <span className="font-display font-black text-2xl text-ink transition-colors group-hover:text-yellow">
                    {item.letter}
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-ink/70 group-hover:text-yellow transition-colors">
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

        <div className="flex items-center gap-3 sm:gap-4 mt-8 text-xs font-mono font-bold text-ink flex-wrap">
          <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
            <span className="w-3 h-3 bg-paper border border-ink inline-block" />
            <span className="text-ink">Gestur Statis (24)</span>
          </span>
          <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
            <span className="w-3 h-3 bg-coral border border-ink inline-block" />
            <span className="text-coral">Gestur Dinamis J &amp; Z (2)</span>
          </span>
          <span className="ml-auto text-ink/75 text-xs hidden sm:block bg-paper-2 px-3 py-1.5 border border-ink/20">
            💡 Tips: Sorot kartu untuk membalik warna (invert hover)
          </span>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION: BELAJAR LEWAT KUIS
   Showcase QuizPage dengan teaser visual
───────────────────────────────────────── */
const QuizTeaser = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const exampleWord = "HALO";

  return (
    <section ref={ref} className="py-20 bg-paper border-b-[2.5px] border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Kiri: preview kuis */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="border-[2.5px] border-ink bg-paper-2 p-8 lg:border-r-0 relative overflow-hidden"
          >
            {/* Decorative oversized text */}
            <span
              className="absolute -bottom-6 -right-4 font-black text-ink/5 select-none leading-none"
              style={{ fontSize: "10rem" }}
              aria-hidden="true"
            >
              ?
            </span>

            <span className="tag tag-yellow mb-5 block">Kuis Eja</span>

            <div className="mb-5 relative z-10">
              <p className="font-mono text-xs text-ink/90 uppercase tracking-wider mb-2 font-bold">
                Eja kata ini dengan isyarat:
              </p>
              <span className="font-display font-black text-ink" style={{ fontSize: "3.5rem" }}>
                {exampleWord}
              </span>
            </div>

            {/* Kotak jawaban */}
            <div className="flex gap-2 mb-6 relative z-10">
              {exampleWord.split("").map((char, i) => (
                <span
                  key={i}
                  className={`w-12 h-12 border-[2.5px] border-ink flex items-center justify-center font-mono font-black text-lg
                    ${i === 0 ? "bg-yellow text-ink" : i === 1 ? "bg-yellow text-ink" : "bg-paper-3 text-ink/80 font-bold"}`}
                  style={{ boxShadow: i < 2 ? "3px 3px 0 #111" : "none" }}
                >
                  {i < 2 ? char : "_"}
                </span>
              ))}
            </div>

            <p className="font-sans text-sm text-ink/90 font-medium leading-relaxed relative z-10">
              Eja setiap huruf dengan tanganmu di depan kamera. Dua huruf
              pertama sudah berhasil!
            </p>
          </motion.div>

          {/* Kanan: copy */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="border-[2.5px] border-ink bg-paper p-8 flex flex-col justify-center"
          >
            <h2 className="font-display font-black text-ink leading-tight mb-4"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
              Ujian paling seru
              <br />
              yang pernah ada.
            </h2>
            <p className="font-sans text-base text-ink/90 leading-relaxed mb-8 font-medium">
              Kuis Eja menampilkan kata acak bahasa Indonesia. Kamu eja
              huruf per huruf pakai isyarat di depan kamera. Setiap kata yang
              berhasil dieja bertambah ke skormu.
            </p>
            <Link to="/kuis" className="btn btn-coral text-sm font-mono uppercase tracking-wider py-3 px-6 self-start shadow-[3px_3px_0_#111]">
              <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
              Coba Kuis Sekarang
            </Link>
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
        {/* Main Hero Card Container — Solid Opaque Background (Non-Transparent) */}
        <div
          className="border-[3.5px] border-ink bg-theme-yellow p-8 sm:p-14 lg:p-16 shadow-[12px_12px_0_#111] relative overflow-hidden pointer-events-auto"
          style={{ backgroundColor: "#FFD000" }}
        >
          {/* Corner Floating Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <span
              className="sticker sticker-coral text-xs sm:text-sm px-3.5 py-1.5 font-mono uppercase rotated-label shadow-[3px_3px_0_#111]"
            >
              🚀 100% Client-Side WebGL
            </span>
            <span
              className="sticker sticker-mint text-xs sm:text-sm px-3.5 py-1.5 font-mono uppercase rotated-label-2 shadow-[3px_3px_0_#111]"
            >
              ★ Tanpa Akun &amp; Gratis
            </span>
          </div>

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
              Kamu sudah selesai membaca. Sekarang saatnya coba langsung di depan kamera!
            </ScrollReveal>

            <p className="font-sans text-base sm:text-xl font-bold text-ink/80 max-w-2xl mx-auto leading-relaxed mt-6 mb-10">
              Cukup angkat satu tangan, bentuk huruf A atau B, dan biarkan AI mengenali gerakanmu dalam 1,5 detik.
            </p>
          </div>

          {/* 3 Guarantee Checklist Pills */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-10 font-mono text-xs sm:text-sm font-bold text-ink">
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
              <span className="text-mint font-black">✓</span> 26 Huruf SIBI Lengkap
            </span>
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
              <span className="text-coral font-black">✓</span> Privasi Terjaga (Lokal)
            </span>
            <span className="flex items-center gap-2 bg-paper px-3 py-1.5 border-2 border-ink shadow-[2px_2px_0_#111]">
              <span className="text-cobalt font-black">✓</span> Langsung Disuarakan
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4">
            <Link
              to="/latihan"
              className="btn btn-ink text-base sm:text-lg font-mono py-4 px-8 shadow-[6px_6px_0_#FF4D4D] hover-invert-yellow flex items-center gap-2.5"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              <span>Buka Kamera Sekarang</span>
              <span>↗</span>
            </Link>
            <Link
              to="/kamus"
              className="btn btn-paper text-base sm:text-lg font-mono py-4 px-8 shadow-[6px_6px_0_#111] hover:bg-paper-3 flex items-center gap-2.5"
            >
              <BookOpen className="w-5 h-5" aria-hidden="true" />
              <span>Jelajahi 26 Huruf</span>
            </Link>
            <Link
              to="/kuis"
              className="btn btn-coral text-base sm:text-lg font-mono py-4 px-8 shadow-[6px_6px_0_#111] flex items-center gap-2.5"
            >
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
              <span>Tantang Kuis Eja</span>
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
