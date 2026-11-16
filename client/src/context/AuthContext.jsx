import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("ajin_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authNotification, setAuthNotification] = useState(null);

  // Tangani callback redirect Google OAuth dari URL saat aplikasi pertama kali dimuat
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isSuccess = params.get("auth_success");
      const userParam = params.get("user");
      const tokenParam = params.get("token");
      const errorParam = params.get("auth_error");

      if (isSuccess === "true" && userParam) {
        const parsedUser = JSON.parse(decodeURIComponent(userParam));
        setUser(parsedUser);
        localStorage.setItem("ajin_user", JSON.stringify(parsedUser));
        if (tokenParam) {
          localStorage.setItem("ajin_token", decodeURIComponent(tokenParam));
        }

        setAuthNotification({
          type: "success",
          message: `Selamat datang, ${parsedUser.name}! Berhasil masuk dengan Google.`,
        });

        // Bersihkan query string dari address bar browser tanpa me-reload halaman
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (errorParam) {
        setAuthNotification({
          type: "error",
          message: `Gagal login dengan Google: ${decodeURIComponent(errorParam)}`,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.warn("[AJIN Auth] Gagal memproses parameter auth di URL:", err.message);
    }
  }, []);

  // Otomatis hilangkan notifikasi setelah 5 detik
  useEffect(() => {
    if (authNotification) {
      const t = setTimeout(() => setAuthNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [authNotification]);

  // Fungsi mengarahkan browser ke alur login Google
  const loginWithGoogle = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // Fungsi logout akun
  const logout = async () => {
    try {
      const token = localStorage.getItem("ajin_token");
      if (token) {
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      localStorage.removeItem("ajin_user");
      localStorage.removeItem("ajin_token");
      setAuthNotification({
        type: "info",
        message: "Kamu telah keluar dari akun AJIN.",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginWithGoogle,
        logout,
        authNotification,
        clearNotification: () => setAuthNotification(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam <AuthProvider>");
  }
  return context;
};
