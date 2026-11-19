import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRESS_FILE = path.resolve(__dirname, "../data/progress_store.json");
const TELEMETRY_FILE = path.resolve(__dirname, "../data/telemetry_store.json");

if (!isSupabaseConfigured || !supabase) {
  console.error("[Sync] Supabase belum dikonfigurasi di server/.env.");
  process.exit(1);
}

console.log("====================================================");
console.log("  AJIN: Sinkronisasi Data Lokal ke Supabase v2");
console.log("====================================================");

// 1. Ambil peta huruf -> alphabet_id dari sibi_alphabets
const { data: alphaRows, error: alphaErr } = await supabase
  .from("sibi_alphabets")
  .select("id, letter");

if (alphaErr || !alphaRows || alphaRows.length === 0) {
  console.error("[Sync] Gagal membaca tabel sibi_alphabets:", alphaErr?.message || "Tabel kosong");
  process.exit(1);
}

const alphabetIdByLetter = {};
for (const row of alphaRows) {
  alphabetIdByLetter[String(row.letter).toUpperCase()] = row.id;
}

// 2. Sinkronisasi progress_store.json -> public.user_progress
if (fs.existsSync(PROGRESS_FILE)) {
  const localProgress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  if (Array.isArray(localProgress) && localProgress.length > 0) {
    let okCount = 0;
    for (const item of localProgress) {
      const letter = String(item.letter || "").toUpperCase().trim();
      if (!letter || !alphabetIdByLetter[letter]) continue;

      const { error } = await supabase.from("user_progress").upsert(
        {
          user_id: String(item.userId || "guest-user").trim(),
          alphabet_id: alphabetIdByLetter[letter],
          letter,
          is_mastered: Boolean(item.isMastered),
          best_confidence: Number(item.bestConfidence || 0),
          attempts_count: Number(item.attemptsCount || 1),
          success_count: Number(item.successCount || (item.isMastered ? item.attemptsCount || 1 : 0)),
          last_practiced_at: item.updatedAt || new Date().toISOString(),
          updated_at: item.updatedAt || new Date().toISOString(),
        },
        { onConflict: "user_id,letter" }
      );

      if (error) {
        console.error(
          `[Sync] Gagal upsert user_progress (${item.userId} / ${letter}):`,
          error.message
        );
        console.error(
          "  -> Pastikan Anda sudah menjalankan file supabase/migration_v2.sql di Supabase SQL Editor!"
        );
        process.exit(1);
      } else {
        okCount += 1;
      }
    }
    console.log(`[Sync] user_progress berhasil disinkronkan: ${okCount} baris.`);
  }
}

// 3. Sinkronisasi telemetry_store.json -> public.session_telemetries
if (fs.existsSync(TELEMETRY_FILE)) {
  const localTelemetry = JSON.parse(fs.readFileSync(TELEMETRY_FILE, "utf8"));
  if (Array.isArray(localTelemetry) && localTelemetry.length > 0) {
    // Ambil daftar created_at yang sudah ada untuk mencegah duplikasi
    const { data: existingTel } = await supabase
      .from("session_telemetries")
      .select("created_at, user_id, target_label")
      .limit(2000);

    const existingKeys = new Set(
      (existingTel || []).map(
        (r) =>
          `${r.user_id || ""}|${r.target_label || ""}|${new Date(r.created_at).getTime()}`
      )
    );

    const rowsToInsert = [];
    for (const entry of localTelemetry) {
      const userId = String(entry.userId || "guest-user").trim();
      const targetLabel = entry.targetLabel && entry.targetLabel !== "-" ? entry.targetLabel : null;
      const createdAt = entry.createdAt || new Date().toISOString();
      const dedupKey = `${userId}|${targetLabel || ""}|${new Date(createdAt).getTime()}`;

      if (existingKeys.has(dedupKey)) continue;
      existingKeys.add(dedupKey);

      rowsToInsert.push({
        user_id: userId,
        session_type: entry.sessionType || "practice",
        target_label: targetLabel,
        predicted_label:
          entry.predictedLabel && entry.predictedLabel !== "-" ? entry.predictedLabel : null,
        confidence: Number(entry.confidence || 0),
        latency_ms: Number(entry.latencyMs || 0),
        fps: Number(entry.fps || 0),
        lighting_cond: entry.lightingCond || "normal",
        is_success: Boolean(entry.isSuccess),
        created_at: createdAt,
      });
    }

    if (rowsToInsert.length > 0) {
      // Insert dalam batch 100 baris agar cepat dan stabil
      let insertedTotal = 0;
      for (let i = 0; i < rowsToInsert.length; i += 100) {
        const batch = rowsToInsert.slice(i, i + 100);
        const { error } = await supabase.from("session_telemetries").insert(batch);
        if (error) {
          console.error("[Sync] Gagal insert batch session_telemetries:", error.message);
          console.error(
            "  -> Pastikan Anda sudah menjalankan file supabase/migration_v2.sql di Supabase SQL Editor!"
          );
          process.exit(1);
        }
        insertedTotal += batch.length;
      }
      console.log(`[Sync] session_telemetries baru ditambahkan: ${insertedTotal} baris.`);
    } else {
      console.log("[Sync] Semua data telemetry_store.json sudah ada di Supabase.");
    }
  }
}

// 4. Tampilkan ringkasan jumlah baris seluruh tabel Supabase
console.log("\n--- Ringkasan Tabel Supabase Saat Ini ---");
const allTables = [
  "users",
  "sibi_alphabets",
  "user_progress",
  "session_telemetries",
  "photo_scans",
  "chat_messages",
];
for (const tbl of allTables) {
  const { count, error } = await supabase
    .from(tbl)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.log(`  [ERROR] ${tbl}: ${error.message}`);
  } else {
    console.log(`  [OK]    ${tbl}: ${count} baris`);
  }
}
console.log("====================================================");
