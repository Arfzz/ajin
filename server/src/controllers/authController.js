import { OAuth2Client } from "google-auth-library";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

// Helper menentukan origin aktif (mendukung otomatis domain Vercel & development lokal)
const resolveClientUrl = (req) => {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/^"|"$/g, "").trim().replace(/\/$/, "");
  }
  const forwardedHost = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  if (forwardedHost && !forwardedHost.includes("localhost:5001") && !forwardedHost.includes("localhost:8000")) {
    const proto = req?.headers?.["x-forwarded-proto"] || "https";
    return `${proto}://${forwardedHost}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:5173";
};

// Helper inisialisasi OAuth2Client Google
const getOAuth2Client = (req = null) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").replace(/^"|"$/g, "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").replace(/^"|"$/g, "").trim();
  let redirectUri = (process.env.GOOGLE_REDIRECT_URI || "").replace(/^"|"$/g, "").trim();

  if (!redirectUri) {
    const forwardedHost = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
    if (process.env.VERCEL && forwardedHost) {
      const proto = req?.headers?.["x-forwarded-proto"] || "https";
      redirectUri = `${proto}://${forwardedHost}/api/auth/google/callback`;
    } else if (process.env.VERCEL_URL) {
      redirectUri = `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
    } else {
      redirectUri = "http://localhost:8000/auth/google/callback";
    }
  }

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di environment variables");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

/**
 * GET /api/auth/google
 * Mengarahkan pengguna ke halaman persetujuan (consent screen) Google OAuth2
 */
export const googleAuthRedirect = (req, res) => {
  try {
    const oauth2Client = getOAuth2Client(req);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
      ],
      prompt: "select_account",
    });

    // Jika dipanggil via JSON request
    if (req.headers.accept?.includes("application/json") && !req.query.redirect) {
      return res.json({ success: true, url: authUrl });
    }

    // Direct browser redirect
    return res.redirect(authUrl);
  } catch (err) {
    console.error("[AJIN Auth] Error menginisialisasi Google Auth:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Gagal membuat URL autentikasi Google.",
    });
  }
};

/**
 * GET /auth/google/callback atau /api/auth/google/callback
 * Menerima authorization code dari Google, menukarkan dengan token dan data profil pengguna
 */
export const googleAuthCallback = async (req, res) => {
  const clientUrl = resolveClientUrl(req);
  const { code, error } = req.query;

  if (error) {
    console.warn("[AJIN Auth] Google OAuth dibatalkan pengguna atau error:", error);
    return res.redirect(`${clientUrl}/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${clientUrl}/?auth_error=${encodeURIComponent("Authorization code tidak ditemukan.")}`);
  }

  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    // Verifikasi ID Token untuk mendapatkan profil aman
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").replace(/^"|"$/g, "").trim();
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    const userData = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || "Pelajar SIBI",
      picture: payload.picture || "",
      role: "student",
      provider: "google",
    };

    // Sinkronkan & perbarui profil pengguna ke tabel public.users di Supabase setiap kali login
    if (isSupabaseConfigured && supabase) {
      const nowIso = new Date().toISOString();
      const { error: upsertErr } = await supabase
        .from("users")
        .upsert(
          {
            id: String(payload.sub),
            name: userData.name,
            email: userData.email,
            picture: userData.picture,
            role: "student",
            provider: "google",
            last_login_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "id" }
        );

      if (upsertErr) {
        console.error(
          `[AJIN Auth] Gagal sinkronisasi user ke Supabase (${upsertErr.code || "ERR"}):`,
          upsertErr.message
        );
      }
    }

    console.log(`[AJIN Auth] Login Google berhasil: ${userData.name} (${userData.email})`);

    // Redirect kembali ke client dengan data user & token
    const userParam = encodeURIComponent(JSON.stringify(userData));
    const tokenParam = encodeURIComponent(tokens.id_token || "google-auth-token");
    return res.redirect(`${clientUrl}/?auth_success=true&user=${userParam}&token=${tokenParam}`);
  } catch (err) {
    console.error("[AJIN Auth] Gagal memproses callback Google OAuth:", err.message);
    return res.redirect(`${clientUrl}/?auth_error=${encodeURIComponent(err.message)}`);
  }
};

/**
 * GET /api/auth/me
 * Mengembalikan data profil user yang sedang login
 */
export const getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Token otentikasi tidak ditemukan." });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Jika token adalah Google ID Token, verifikasi dengan Google
    try {
      const clientId = (process.env.GOOGLE_CLIENT_ID || "").replace(/^"|"$/g, "").trim();
      const oauth2Client = getOAuth2Client();
      const ticket = await oauth2Client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      return res.json({
        success: true,
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          role: "student",
          provider: "google",
        },
      });
    } catch {
      // Fallback jika token lokal
      return res.json({
        success: true,
        user: {
          id: "authenticated-user",
          name: "Pelajar SIBI",
          role: "student",
        },
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = (req, res) => {
  return res.json({
    success: true,
    message: "Berhasil keluar dari akun AJIN.",
  });
};

/**
 * Endpoint bawaan email/password pendaftaran
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email dan kata sandi wajib diisi." });
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || "Pelajar SIBI" } },
      });
      if (error) return res.status(400).json({ success: false, message: error.message });
      return res.json({ success: true, message: "Pendaftaran berhasil via Supabase Auth.", user: data.user });
    }

    return res.json({
      success: true,
      message: "Pendaftaran berhasil (Mode Demo Lokal).",
      user: { id: "mock-student-uuid", name: name || "Pelajar SIBI", email, role: "student" },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan pada registrasi." });
  }
};

/**
 * Endpoint bawaan email/password login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email dan kata sandi wajib diisi." });
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ success: false, message: error.message });
      return res.json({ success: true, message: "Login berhasil via Supabase Auth.", session: data.session, user: data.user });
    }

    return res.json({
      success: true,
      message: "Login berhasil (Mode Demo Lokal).",
      user: { id: "mock-student-uuid", name: "Pelajar SIBI", email, role: "student" },
      token: "mock-jwt-token-ajin",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan pada login." });
  }
};
