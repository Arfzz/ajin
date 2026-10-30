import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Camera } from "lucide-react";

const NAV_LINKS = [
  { label: "Kamus Huruf",  path: "/kamus" },
  { label: "Latih Kamera", path: "/latihan" },
  { label: "Studio Narasi", path: "/narasi" },
  { label: "Kuis Eja",     path: "/kuis" },
  { label: "Analitik",     path: "/analitik" },
];

export const Navbar = ({ isSimulationMode = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const isHome = location.pathname === "/";
      const threshold = isHome ? (window.innerHeight ? window.innerHeight - 80 : 600) : 60;
      setPastHero(window.scrollY > threshold);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        pastHero
          ? "bg-yellow border-b-[3px] border-ink shadow-[0_4px_0_#111] text-ink"
          : "bg-paper/95 backdrop-blur-md border-b border-ink/20 text-ink"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            aria-label="AJIN: Beranda"
          >
            {/* Kotak logo berubah aksen saat transform */}
            <span
              className={`w-8 h-8 border-[2.5px] border-ink font-mono font-black text-sm flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                pastHero
                  ? "bg-ink text-yellow shadow-[2px_2px_0_#ffffff]"
                  : "bg-yellow text-ink shadow-[2px_2px_0_#111]"
              }`}
            >
              A
            </span>
            <span className="font-display font-black text-base text-ink tracking-tight">
              AJIN
            </span>
            {/* Mode indicator */}
            <span
              className={`hidden sm:block font-mono text-[9px] uppercase tracking-widest border px-1.5 py-0.5 transition-colors ${
                pastHero
                  ? "border-ink text-ink font-bold bg-white/40"
                  : "border-ink/20 text-ink/40"
              }`}
            >
              {isSimulationMode ? "simulasi" : "live cv"}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navigasi utama">
            {NAV_LINKS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 text-sm font-bold transition-all ${
                    pastHero
                      ? isActive
                        ? "bg-ink text-yellow border-2 border-ink shadow-[2px_2px_0_#111]"
                        : "text-ink hover:bg-ink hover:text-white"
                      : isActive
                        ? "border-b-2 border-ink text-ink"
                        : "border-b-2 border-transparent text-ink/70 hover:text-ink hover:border-ink/30"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA desktop */}
          <div className="hidden md:block">
            <Link
              to="/latihan"
              className={`btn text-xs font-mono uppercase tracking-wider py-2 px-4 transition-all ${
                pastHero
                  ? "btn-ink text-paper shadow-[3px_3px_0_#FF4D4D] hover-invert-coral"
                  : "btn btn-coral shadow-[2px_2px_0_#111]"
              }`}
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Latih di Kamera
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 border-[2.5px] border-ink transition-colors ${
              pastHero ? "bg-ink text-yellow hover:bg-white hover:text-ink" : "bg-paper text-ink hover:bg-yellow"
            }`}
            aria-label={isOpen ? "Tutup Menu" : "Buka Menu"}
            aria-expanded={isOpen}
            style={{ boxShadow: "2px 2px 0 #111" }}
          >
            {isOpen
              ? <X className="w-4 h-4" aria-hidden="true" />
              : <Menu className="w-4 h-4" aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div
          className={`md:hidden border-t-[2.5px] border-ink transition-colors ${
            pastHero ? "bg-yellow text-ink shadow-[0_6px_0_#111]" : "bg-paper text-ink"
          }`}
          role="navigation"
          aria-label="Menu mobile"
        >
          <nav className="flex flex-col">
            {NAV_LINKS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-5 py-3.5 text-sm font-bold border-b border-ink/10 transition-colors ${
                    isActive
                      ? pastHero ? "bg-ink text-yellow" : "bg-yellow text-ink"
                      : "text-ink hover:bg-black/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="p-4">
              <Link
                to="/latihan"
                className={`btn w-full text-sm font-mono uppercase tracking-wider py-3 ${
                  pastHero ? "btn-ink text-paper shadow-[3px_3px_0_#FF4D4D]" : "btn-coral"
                }`}
              >
                <Camera className="w-4 h-4 mr-2" aria-hidden="true" />
                Mulai Latihan di Kamera
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
