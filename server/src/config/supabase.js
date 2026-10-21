import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes("your-project-id")
);

let supabaseClient = null;

if (isSupabaseConfigured) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log("[AJIN Server] Supabase client terhubung:", supabaseUrl);
  } catch (err) {
    console.warn("[AJIN Server] Paket @supabase/supabase-js belum terpasang. Menjalankan fallback in-memory.");
  }
} else {
  console.log("[AJIN Server] Mode Standalone: In-Memory Fallback aktif (Supabase env belum diisi).");
}

export const supabase = supabaseClient;
