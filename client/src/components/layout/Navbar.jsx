import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Camera,
  LogOut,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Trophy,
  MessageSquare,
  Image as ImageIcon,
  BarChart2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const NAV_LINKS = [
  { label: "Kamus 3D", path: "/kamus", icon: BookOpen },
  { label: "Latihan Kamera", path: "/latihan", icon: Camera },
  { label: "Kuis Eja", path: "/kuis", icon: Trophy },
  { label: "Jembatan Narasi", path: "/narasi", icon: MessageSquare },
  { label: "Pindai Foto", path: "/foto", icon: ImageIcon },
  { label: "Rapor Belajar", path: "/analitik", icon: BarChart2 },
];

export const Navbar = () => {
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
      const threshold = isHome
        ? window.innerHeight
          ? window.innerHeight - 80
          : 600
        : 60;
      setPastHero(window.scrollY > threshold);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b-[3px] border-ink transition-colors duration-200 ${
        pastHero
          ? "bg-yellow shadow-[0_4px_0_#111] text-ink"
          : "bg-paper shadow-[0_3px_0_#111] text-ink"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Identitas Brand AJIN */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="AJIN: Kembali ke Beranda"
          >
            <span
              className={`w-9 h-9 border-[2.5px] border-ink font-mono font-black text-base flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:-translate-y-0.5 ${
                pastHero
                  ? "bg-ink text-yellow shadow-[2px_2px_0_#ffffff]"
                  : "bg-yellow text-ink shadow-[2px_2px_0_#111]"
              }`}
            >
              A
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-xl text-ink tracking-tight leading-none">
                AJIN
              </span>
              <span
                className={`hidden sm:inline-block font-mono text-[10px] font-black uppercase tracking-wider border-2 border-ink px-1.5 py-0.5 leading-none ${
                  pastHero ? "bg-paper text-ink" : "bg-paper-2 text-ink"
                }`}
              >
                SIBI A-Z
              </span>
            </div>
          </Link>

          {/* Navigasi Utama Desktop */}
          <nav
            className="hidden lg:flex items-center gap-1.5"
            aria-label="Navigasi utama"
          >
            {NAV_LINKS.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/foto" && location.pathname === "/scan");

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 font-mono text-xs font-black tracking-tight border-2 transition-all ${
                    isActive
                      ? pastHero
                        ? "bg-ink text-yellow border-ink shadow-[2px_2px_0_#ffffff] -translate-y-0.5"
                        : "bg-yellow text-ink border-ink shadow-[2px_2px_0_#111] -translate-y-0.5"
                      : pastHero
                      ? "border-transparent text-ink hover:bg-paper hover:border-ink"
                      : "border-transparent text-ink/80 hover:text-ink hover:bg-paper-2 hover:border-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Kontrol Akun Pengguna (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 border-2 border-ink bg-paper text-ink py-1.5 px-3 transition-all shadow-[2px_2px_0_#111] hover:-translate-y-0.5 cursor-pointer"
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
                    <span className="w-5 h-5 bg-yellow border border-ink font-mono font-black text-[10px] flex items-center justify-center text-ink">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                  <span className="font-mono text-xs font-black max-w-[110px] truncate">
                    {user.name ? user.name.split(" ")[0] : "Akun Saya"}
                  </span>
                </button>

                {/* Menu Dropdown Akun */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-paper border-[2.5px] border-ink shadow-[4px_4px_0_#111] py-2 z-50">
                    <div className="px-3.5 py-2 border-b-2 border-ink/15 mb-1">
                      <p className="text-xs font-bold text-ink truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] font-mono text-ink/65 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      to="/analitik"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-xs font-mono font-bold text-ink hover:bg-yellow/40 flex items-center gap-2 transition-colors"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Lihat Rapor Belajar</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-mono font-bold text-coral hover:bg-coral/10 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={loginWithGoogle}
                className={`text-xs font-mono font-black py-2 px-3.5 flex items-center border-2 border-ink shadow-[2px_2px_0_#111] hover:-translate-y-0.5 transition-all cursor-pointer ${
                  pastHero
                    ? "bg-paper text-ink hover:bg-ink hover:text-yellow"
                    : "bg-paper-2 text-ink hover:bg-yellow"
                }`}
                aria-label="Masuk dengan Google"
              >
                <GoogleIcon />
                <span>Masuk Google</span>
              </button>
            )}
          </div>

          {/* Tombol Menu Layar Kecil & Tablet */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`lg:hidden p-2 border-[2.5px] border-ink transition-colors shadow-[2px_2px_0_#111] cursor-pointer ${
              pastHero
                ? "bg-ink text-yellow hover:bg-paper hover:text-ink"
                : "bg-paper text-ink hover:bg-yellow"
            }`}
            aria-label={isOpen ? "Tutup Menu Navigasi" : "Buka Menu Navigasi"}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Laci Menu Mobile & Tablet */}
      {isOpen && (
        <div
          className={`lg:hidden border-t-[3px] border-ink ${
            pastHero
              ? "bg-yellow text-ink shadow-[0_6px_0_#111]"
              : "bg-paper text-ink shadow-[0_6px_0_#111]"
          }`}
          role="navigation"
          aria-label="Menu mobile"
        >
          <nav className="flex flex-col">
            {/* Bagian Akun di Mobile */}
            <div className="p-4 border-b-2 border-ink/15">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between bg-paper-2 border-2 border-ink p-3 shadow-[2px_2px_0_#111]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || "Foto profil"}
                        className="w-8 h-8 border border-ink object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-8 h-8 bg-yellow border border-ink font-mono font-black text-xs flex items-center justify-center text-ink flex-shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] font-mono text-ink/65 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-2 border-2 border-ink bg-coral text-white hover:bg-ink transition-colors flex-shrink-0 cursor-pointer"
                    aria-label="Keluar akun"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full text-xs font-mono font-black py-2.5 px-4 flex items-center justify-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_#111] hover:bg-yellow transition-colors cursor-pointer"
                >
                  <GoogleIcon />
                  <span>Masuk dengan Google</span>
                </button>
              )}
            </div>

            {/* Daftar Halaman */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-2 sm:p-3 divide-ink/15">
              {NAV_LINKS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/foto" && location.pathname === "/scan");

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-5 py-3.5 font-mono text-xs font-black flex items-center gap-2.5 sm:border-2 sm:border-ink transition-colors ${
                      isActive
                        ? "bg-ink text-yellow"
                        : "bg-paper text-ink hover:bg-yellow/40"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Notifikasi Status Login */}
      {authNotification && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 border-[2.5px] border-ink shadow-[4px_4px_0_#111] font-mono text-xs font-bold ${
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
            className="ml-2 hover:opacity-75 cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
