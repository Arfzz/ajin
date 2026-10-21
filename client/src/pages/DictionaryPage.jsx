import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Camera, X, Sparkles, Hand, Compass, ArrowUpRight, CheckCircle2 } from "lucide-react";

import { GuidePlayer } from "../components/remotion/GuidePlayer";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 24,
    },
  },
};

const FILTERS = [
  { key: "all", label: "Semua Huruf", count: 26, color: "btn-ink" },
  { key: "static", label: "✋ Statis", count: 24, color: "btn-cobalt" },
  { key: "dynamic", label: "💫 Gerak (J & Z)", count: 2, color: "btn-yellow" },
  { key: "attention", label: "👀 Mirip & Rawan Tertukar", count: 7, color: "btn-coral" },
  { key: "vowels", label: "🔤 Vokal (A-I-U-E-O)", count: 5, color: "btn-mint" },
];

const ATTENTION_LETTERS = ["K", "Y", "V", "P", "M", "N", "S"];
const VOWELS = ["A", "I", "U", "E", "O"];

export const DictionaryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLetter = searchParams.get("letter") || null;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedAlphabet, setSelectedAlphabet] = useState(
    initialLetter
      ? SIBI_ALPHABETS_FALLBACK.find((a) => a.letter === initialLetter.toUpperCase()) || null
      : null
  );

  // Tutup modal dengan Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setSelectedAlphabet(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Hero Header Area */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Decorative oversized letter in background */}
        <span className="deco-num -right-10 -bottom-10 text-[18rem] select-none pointer-events-none">
          AZ
        </span>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {/* Fun Neobrutalism Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="sticker sticker-yellow px-3 py-1 text-xs uppercase rotated-label font-mono">
                  🔥 26 Huruf Lengkap
                </span>
                <span className="sticker sticker-coral px-3 py-1 text-xs uppercase font-mono">
                  ⚡ Siap Kamera
                </span>
                <span className="sticker sticker-cobalt px-3 py-1 text-xs uppercase rotated-label-2 font-mono">
                  🎯 SIBI Standar
                </span>
              </div>

              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight leading-[1.05]">
                Kamus Isyarat <span className="highlight">A sampai Z</span>
              </h1>
              <p className="mt-3 font-sans text-base text-ink/70 max-w-xl font-medium leading-relaxed">
                Pelajari bentuk jemari dan orientasi tangan untuk setiap huruf. Klik kartu mana saja
                untuk lihat video simulasi gerakan dan langsung uji di kamera!
              </p>
            </div>

            {/* Search Input Box */}
            <div className="w-full md:w-80">
              <label htmlFor="search-alphabet" className="block text-xs font-mono font-bold uppercase mb-1.5 text-ink/70">
                Cari Huruf / Gerakan:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="search-alphabet"
                  type="search"
                  placeholder="Ketik huruf 'A', 'Kelingking'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-[2.5px] border-ink bg-paper text-sm font-bold text-ink placeholder-ink/40 focus:outline-none shadow-[3px_3px_0_#111]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/60 hover:text-ink hover:bg-paper-2 border border-ink/20"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5 mt-8 pt-6 border-t-[2px] border-ink/15">
            <span className="text-xs font-mono font-bold uppercase text-ink/50 mr-1">
              Filter:
            </span>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`btn text-xs font-mono py-2 px-3.5 transition-all ${
                    isActive
                      ? "btn-yellow shadow-[4px_4px_0_#111] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-paper text-ink hover:bg-paper-3 shadow-[2px_2px_0_#111]"
                  }`}
                  aria-pressed={isActive}
                >
                  {f.label}{" "}
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isActive ? "bg-ink text-paper" : "bg-ink/10 text-ink"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Collectible Letter Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {filteredAlphabets.length > 0 ? (
          <motion.div
            key={activeFilter + searchQuery}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {filteredAlphabets.map((item, index) => {
              const isDynamic = item.gestureType === "dynamic";
              const isVowel = VOWELS.includes(item.letter);
              const needsAttention = ATTENTION_LETTERS.includes(item.letter);

              return (
                <motion.div
                  key={item.letter}
                  variants={cardVariants}
                  className="card p-5 flex flex-col justify-between nb-lift relative group overflow-hidden bg-paper hover:shadow-[8px_8px_0_#111] transition-all"
                >
                  {/* Decorative corner tag */}
                  <div className="flex items-center justify-between mb-3 border-b-2 border-ink pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-none border border-ink bg-yellow flex items-center justify-center font-mono font-bold text-xs">
                        #{item.id}
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/70">
                        {isDynamic ? "Gerak Dinamis" : "Gestur Statis"}
                      </span>
                    </div>

                    {/* Difficulty Badge */}
                    <span
                      className={`tag text-[10px] ${
                        item.difficulty === "easy"
                          ? "tag-mint"
                          : item.difficulty === "medium"
                          ? "tag-yellow"
                          : "tag-coral"
                      }`}
                    >
                      {item.difficulty === "easy" ? "★ Mudah" : item.difficulty === "medium" ? "★★ Sedang" : "★★★ Sulit"}
                    </span>
                  </div>

                  {/* Big Letter Feature */}
                  <div className="my-3 flex items-center justify-between">
                    <div>
                      <span className="font-display font-black text-6xl text-ink leading-none block tracking-tight group-hover:scale-105 group-hover:text-yellow-dark transition-all origin-left">
                        {item.letter}
                      </span>
                      <span className="text-xs font-mono font-bold text-ink/40 mt-1 block">
                        Huruf {item.letter}
                      </span>
                    </div>

                    {/* Mini Tag Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {isVowel && (
                        <span className="tag tag-cobalt text-[9px]">
                          Vokal
                        </span>
                      )}
                      {needsAttention && (
                        <span className="tag tag-coral text-[9px]">
                          ⚠️ Rawan Salah
                        </span>
                      )}
                      {isDynamic && (
                        <span className="tag tag-yellow text-[9px]">
                          Gerak Tangan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Finger Description */}
                  <p className="font-sans text-xs text-ink/70 leading-relaxed line-clamp-3 mb-5 border-l-2 border-ink/20 pl-2.5">
                    {item.description}
                  </p>

                  {/* Action Buttons: Detail & Test in Camera */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-ink">
                    <button
                      onClick={() => setSelectedAlphabet(item)}
                      className="btn bg-paper-2 hover:bg-paper-3 text-ink text-xs font-mono py-2 px-2"
                      aria-label={`Buka panduan huruf ${item.letter}`}
                    >
                      Panduan 📖
                    </button>
                    <Link
                      to={`/latihan?letter=${item.letter}`}
                      className="btn btn-yellow text-ink text-xs font-mono py-2 px-2 flex items-center justify-center gap-1 hover:shadow-[3px_3px_0_#111]"
                      aria-label={`Latih huruf ${item.letter} di kamera`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Tes Huruf
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* Empty State */
          <div className="card p-12 text-center max-w-lg mx-auto bg-paper-2 nb-thick">
            <div className="w-16 h-16 bg-coral border-2 border-ink shadow-[4px_4px_0_#111] mx-auto mb-4 flex items-center justify-center font-display font-black text-2xl text-white">
              ?
            </div>
            <h3 className="font-display font-black text-2xl text-ink mb-2">
              Huruf &ldquo;{searchQuery}&rdquo; Tidak Ditemukan!
            </h3>
            <p className="font-sans text-sm text-ink/70 mb-6">
              Tidak ada huruf yang cocok dengan pencarianmu. Coba kata kunci lain atau reset filter untuk kembali ke 26 alfabet lengkap.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
              className="btn btn-yellow text-xs font-mono uppercase"
            >
              Tampilkan Semua Huruf (26)
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal with Neobrutalism Window Look */}
      {selectedAlphabet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs"
          onClick={() => setSelectedAlphabet(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Detail panduan huruf ${selectedAlphabet.letter}`}
        >
          <div
            className="relative w-full max-w-2xl bg-paper border-[3px] border-ink shadow-[8px_8px_0_#111] max-h-[90vh] flex flex-col overflow-hidden z-20"
            style={{ backgroundColor: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Window Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-ink bg-yellow">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 border-2 border-ink bg-paper flex items-center justify-center font-display font-black text-2xl text-ink shadow-[2px_2px_0_#111]">
                  {selectedAlphabet.letter}
                </span>
                <div>
                  <h3 className="font-display font-black text-xl text-ink leading-none">
                    Panduan Huruf {selectedAlphabet.letter}
                  </h3>
                  <span className="font-mono text-xs font-bold text-ink/70 uppercase">
                    {selectedAlphabet.gestureType === "dynamic" ? "Gerak Dinamis (J/Z)" : "Gestur Statis"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlphabet(null)}
                className="w-9 h-9 border-2 border-ink bg-coral text-white hover:bg-ink hover:text-paper font-bold flex items-center justify-center shadow-[2px_2px_0_#111] transition-colors"
                aria-label="Tutup jendela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-paper" style={{ backgroundColor: "#ffffff" }}>
              {/* Remotion Hand Simulation Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1.5">
                    <Hand className="w-4 h-4 text-cobalt" />
                    Simulasi Bentuk Tangan:
                  </span>
                  <span className="tag tag-yellow text-[10px]">
                    Tingkat: {selectedAlphabet.difficulty}
                  </span>
                </div>
                <div className="border-[2.5px] border-ink bg-paper-2 p-2 shadow-[3px_3px_0_#111]">
                  <GuidePlayer
                    letter={selectedAlphabet.letter}
                    isDynamic={selectedAlphabet.gestureType === "dynamic"}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-ink/70 mb-2 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-coral" />
                  Instruksi Pembentukan Jemari:
                </h4>
                <div className="p-4 bg-paper-2 border-[2px] border-ink text-sm font-sans font-medium text-ink leading-relaxed">
                  {selectedAlphabet.description}
                </div>
              </div>

              {/* Pro Tips / Warning */}
              {selectedAlphabet.tips && (
                <div className="p-4 bg-yellow/20 border-[2px] border-ink flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <h5 className="font-mono text-xs font-bold uppercase text-ink mb-1">
                      Tips Orientasi & Supaya Tidak Tertukar:
                    </h5>
                    <p className="font-sans text-xs text-ink/80 leading-relaxed font-medium">
                      {selectedAlphabet.tips}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer CTA */}
            <div className="px-6 py-4 border-t-[3px] border-ink flex items-center justify-between gap-4 bg-paper-2">
              <button
                onClick={() => setSelectedAlphabet(null)}
                className="btn bg-paper hover:bg-paper-3 text-xs font-mono py-2.5 px-4"
              >
                Tutup
              </button>

              <Link
                to={`/latihan?letter=${selectedAlphabet.letter}`}
                className="btn btn-coral text-xs font-mono py-2.5 px-5 flex items-center gap-2 shadow-[4px_4px_0_#111]"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Tes Huruf Ini di Kamera!</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
