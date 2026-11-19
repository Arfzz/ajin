import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan selalu memuat server/.env sebelum inisialisasi client,
// walaupun server dijalankan dari folder root proyek (mengatasi hoisting ES Modules)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ""
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("your-project-id")
);

let supabaseClient = null;

if (isSupabaseConfigured) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log("[AJIN Server] Supabase client terhubung:", supabaseUrl);
  } catch (err) {
    console.warn(
      "[AJIN Server] Paket @supabase/supabase-js gagal dimuat. Menjalankan fallback in-memory:",
      err.message
    );
  }
} else {
  console.log(
    "[AJIN Server] Mode Standalone: In-Memory Fallback aktif (SUPABASE_URL / KEY belum diisi)."
  );
}

export const supabase = supabaseClient;
