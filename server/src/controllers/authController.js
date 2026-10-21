import { supabase, isSupabaseConfigured } from "../config/supabase.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan kata sandi wajib diisi."
      });
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || "Pelajar SIBI" }
        }
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.json({
        success: true,
        message: "Pendaftaran berhasil via Supabase Auth.",
        user: data.user
      });
    }

    // Fallback Mock User
    return res.json({
      success: true,
      message: "Pendaftaran berhasil (Mode Demo Lokal).",
      user: {
        id: "mock-student-uuid",
        name: name || "Pelajar SIBI",
        email,
        role: "student"
      }
    });
  } catch (err) {
    console.error("Auth register error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada registrasi pengguna."
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan kata sandi wajib diisi."
      });
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      return res.json({
        success: true,
        message: "Login berhasil via Supabase Auth.",
        session: data.session,
        user: data.user
      });
    }

    // Fallback Mock Login
    return res.json({
      success: true,
      message: "Login berhasil (Mode Demo Lokal).",
      user: {
        id: "mock-student-uuid",
        name: "Pelajar SIBI",
        email,
        role: "student"
      },
      token: "mock-jwt-token-ajin"
    });
  } catch (err) {
    console.error("Auth login error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada login pengguna."
    });
  }
};
