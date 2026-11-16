import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Camera, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

const NAV_LINKS = [
  { label: "Kamus Huruf",  path: "/kamus" },
  { label: "Latih Kamera", path: "/latihan" },
  { label: "Asisten SIBI", path: "/narasi" },
  { label: "Kuis Eja",     path: "/kuis" },
  { label: "Analitik",     path: "/analitik" },
];

export const Navbar = ({ isSimulationMode = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const {
    user,
    isAuthenticated,
    loginWithGoogle,
    logout,
    authNotification,
    clearNotification,
  } = useAuth();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [userMenuOpen]);

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

          {/* CTA & Auth desktop */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 border-[2px] border-ink py-1 px-2.5 transition-all shadow-[2px_2px_0_#111] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 ${
                    pastHero ? "bg-white text-ink" : "bg-paper text-ink"
                  }`}
                  aria-label="Menu Pengguna"
                  aria-expanded={userMenuOpen}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "Foto profil"}
                      className="w-5 h-5 border border-ink object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-5 h-5 bg-yellow border border-ink font-mono font-bold text-[10px] flex items-center justify-center text-ink">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                  <span className="font-mono text-xs font-bold max-w-[100px] truncate">
                    {user.name ? user.name.split(" ")[0] : "Akun"}
                  </span>
                </button>

                {/* Dropdown Menu Akun */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-paper border-[2.5px] border-ink shadow-[4px_4px_0_#111] py-2 z-50">
                    <div className="px-3 py-1.5 border-b border-ink/20 mb-1">
                      <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                      <p className="text-[10px] font-mono text-ink/60 truncate">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono font-bold text-coral hover:bg-coral/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={loginWithGoogle}
                className={`btn text-xs font-mono font-bold py-1.5 px-3 flex items-center border-[2px] border-ink shadow-[2px_2px_0_#111] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                  pastHero
                    ? "bg-white text-ink hover:bg-yellow"
                    : "bg-paper text-ink hover:bg-yellow"
                }`}
                aria-label="Masuk dengan Google"
              >
                <GoogleIcon />
                <span>Masuk Google</span>
              </button>
            )}

            <Link
              to="/latihan"
              className={`btn text-xs font-mono uppercase tracking-wider py-1.5 px-3.5 transition-all ${
                pastHero
                  ? "btn-ink text-paper shadow-[3px_3px_0_#FF4D4D] hover-invert-coral"
                  : "btn btn-coral shadow-[2px_2px_0_#111]"
              }`}
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Latih Kamera
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
            {/* Mobile Auth Section */}
            <div className="p-4 border-b border-ink/10">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between bg-paper-2 border-[2px] border-ink p-2.5 shadow-[2px_2px_0_#111]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || "Foto profil"}
                        className="w-8 h-8 border border-ink object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-8 h-8 bg-yellow border border-ink font-mono font-bold text-xs flex items-center justify-center text-ink flex-shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                      <p className="text-[10px] font-mono text-ink/60 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1.5 border border-ink bg-coral text-white hover:bg-coral/80 transition-colors flex-shrink-0"
                    aria-label="Keluar akun"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="btn w-full text-xs font-mono font-bold py-2.5 px-4 flex items-center justify-center border-[2px] border-ink bg-white text-ink shadow-[2px_2px_0_#111] hover:bg-yellow transition-colors"
                >
                  <GoogleIcon />
                  <span>Masuk dengan Google</span>
                </button>
              )}
            </div>

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

      {/* Toast Notifikasi Autentikasi */}
      {authNotification && (
        <div
          className={`fixed top-16 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2.5 border-[2.5px] border-ink shadow-[4px_4px_0_#111] font-mono text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
            authNotification.type === "error"
              ? "bg-coral text-white"
              : authNotification.type === "info"
              ? "bg-paper text-ink"
              : "bg-mint text-ink"
          }`}
          role="status"
        >
          {authNotification.type === "error" ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{authNotification.message}</span>
          <button
            type="button"
            onClick={clearNotification}
            className="ml-2 hover:opacity-75"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
