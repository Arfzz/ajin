import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROGRESS_FILE_PATH = path.resolve(__dirname, "../data/progress_store.json");

// Cache pemetaan huruf A-Z -> sibi_alphabets.id dari Supabase
let alphabetIdMapCache = null;

const getAlphabetIdForLetter = async (rawLetter, providedId) => {
  if (providedId && Number.isInteger(Number(providedId))) {
    return Number(providedId);
  }

  const letter = String(rawLetter || "").toUpperCase().trim();
  if (!letter || letter.length !== 1) return null;

  if (!alphabetIdMapCache && isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("sibi_alphabets")
      .select("id, letter");

    if (!error && Array.isArray(data) && data.length > 0) {
      alphabetIdMapCache = {};
      for (const row of data) {
        alphabetIdMapCache[String(row.letter).toUpperCase()] = row.id;
      }
    }
  }

  if (alphabetIdMapCache && alphabetIdMapCache[letter]) {
    return alphabetIdMapCache[letter];
  }

  // Fallback indeks alfabet standar A=1 .. Z=26
  const code = letter.charCodeAt(0) - 64;
  return code >= 1 && code <= 26 ? code : null;
};

// Helper muat progres dari file lokal
const loadProgressFromFile = () => {
  const store = new Map();
  try {
    if (fs.existsSync(PROGRESS_FILE_PATH)) {
      const raw = fs.readFileSync(PROGRESS_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          const letter = String(item.letter || item.alphabetId || "").toUpperCase();
          const key = `${item.userId}-${letter}`;
          store.set(key, { ...item, letter });
        });
      }
    }
  } catch (err) {
    console.warn("[AJIN Progress] Gagal membaca progress_store.json:", err.message);
  }
  return store;
};

// Helper simpan progres ke file lokal
const saveProgressToFile = (store) => {
  try {
    const list = Array.from(store.values());
    fs.writeFileSync(PROGRESS_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.warn("[AJIN Progress] Gagal menulis progress_store.json:", err.message);
  }
};

const memoryProgressStore = loadProgressFromFile();

/**
 * Helper terpusat untuk menyimpan progres penguasaan huruf ke Supabase & file lokal.
 * Dapat dipanggil baik dari POST /api/progress/update maupun otomatis dari telemetri.
 */
export const upsertLetterProgress = async ({
  userId = "guest-user",
  alphabetId = null,
  letter,
  isMastered = false,
  isSuccess = true,
  confidence = 0,
}) => {
  const normalizedUserId = String(userId || "guest-user").trim();
  const normalizedLetter = String(letter || "").toUpperCase().trim();
  if (!normalizedLetter || normalizedLetter === "-" || normalizedLetter.length > 2) {
    return { updated: null, supabaseSaved: false };
  }

  const resolvedAlphabetId = await getAlphabetIdForLetter(normalizedLetter, alphabetId);
  const nowIso = new Date().toISOString();
  const numericConf = Number(confidence || 0);
  const key = `${normalizedUserId}-${normalizedLetter}`;

  const prevLocal = memoryProgressStore.get(key) || {
    userId: normalizedUserId,
    alphabetId: resolvedAlphabetId,
    letter: normalizedLetter,
    isMastered: false,
    bestConfidence: 0,
    attemptsCount: 0,
    successCount: 0,
    updatedAt: nowIso,
  };

  const updated = {
    ...prevLocal,
    alphabetId: resolvedAlphabetId || prevLocal.alphabetId,
    letter: normalizedLetter,
    isMastered: Boolean(isMastered || prevLocal.isMastered),
    bestConfidence: Math.max(Number(prevLocal.bestConfidence || 0), numericConf),
    attemptsCount: Number(prevLocal.attemptsCount || 0) + 1,
    successCount: Number(prevLocal.successCount || 0) + (isSuccess ? 1 : 0),
    lastPracticedAt: nowIso,
    updatedAt: nowIso,
  };

  memoryProgressStore.set(key, updated);
  saveProgressToFile(memoryProgressStore);

  let supabaseSaved = false;
  let supabaseError = null;

  if (isSupabaseConfigured && supabase) {
    // Ambil nilai terbaru di Supabase agar attempts_count & success_count akurat antar perangkat
    const { data: existingRow, error: selectErr } = await supabase
      .from("user_progress")
      .select("id, is_mastered, best_confidence, attempts_count, success_count")
      .eq("user_id", normalizedUserId)
      .eq("letter", normalizedLetter)
      .maybeSingle();

    if (selectErr) {
      supabaseError = selectErr.message;
      console.error(
        `[AJIN Progress] Gagal membaca user_progress di Supabase (${selectErr.code || "ERR"}):`,
        selectErr.message
      );
    } else {
      const nextAttempts = Number(existingRow?.attempts_count || 0) + 1;
      const nextSuccess = Number(existingRow?.success_count || 0) + (isSuccess ? 1 : 0);
      const nextBestConf = Math.max(Number(existingRow?.best_confidence || 0), numericConf);
      const computedMastered =
        Boolean(isMastered || existingRow?.is_mastered) ||
        (nextAttempts > 0 && (nextSuccess / nextAttempts) * 100 >= 80 && nextBestConf >= 75);

      const { error: upsertErr } = await supabase
        .from("user_progress")
        .upsert(
          {
            user_id: normalizedUserId,
            alphabet_id: resolvedAlphabetId,
            letter: normalizedLetter,
            is_mastered: computedMastered,
            best_confidence: nextBestConf,
            attempts_count: nextAttempts,
            success_count: nextSuccess,
            last_practiced_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "user_id,letter" }
        );

      if (upsertErr) {
        supabaseError = upsertErr.message;
        console.error(
          `[AJIN Progress] Gagal upsert user_progress ke Supabase (${upsertErr.code || "ERR"}):`,
          upsertErr.message
        );
      } else {
        supabaseSaved = true;
      }
    }
  }

  return { updated, supabaseSaved, supabaseError };
};

export const updateProgress = async (req, res) => {
  try {
    const {
      userId = "guest-user",
      alphabetId,
      letter,
      isMastered = false,
      isSuccess = true,
      confidence = 0,
    } = req.body || {};

    if (!letter && !alphabetId) {
      return res.status(400).json({
        success: false,
        message: "Parameter letter atau alphabetId wajib dikirim.",
      });
    }

    const result = await upsertLetterProgress({
      userId,
      alphabetId,
      letter: letter || String(alphabetId),
      isMastered,
      isSuccess,
      confidence,
    });

    return res.json({
      success: true,
      message: "Progres latihan berhasil diperbarui.",
      supabaseSaved: result.supabaseSaved,
      supabaseError: result.supabaseError || undefined,
      data: result.updated,
    });
  } catch (err) {
    console.error("[AJIN Progress] Error updating progress:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui progres latihan.",
    });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const { userId = "guest-user" } = req.params;

    if (isSupabaseConfigured && supabase && userId) {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*, sibi_alphabets(*)")
        .eq("user_id", userId)
        .order("letter", { ascending: true });

      if (error) {
        console.error(
          `[AJIN Progress] Gagal memuat user_progress dari Supabase (${error.code || "ERR"}):`,
          error.message
        );
      } else if (data) {
        return res.json({
          success: true,
          source: "supabase",
          data,
        });
      }
    }

    const userProgressList = Array.from(memoryProgressStore.values()).filter(
      (item) => item.userId === userId
    );

    return res.json({
      success: true,
      source: "memory-store",
      data: userProgressList,
    });
  } catch (err) {
    console.error("[AJIN Progress] Error fetching progress:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat progres pengguna.",
    });
  }
};

/**
 * POST /api/progress/migrate-guest
 * Memindahkan data latihan sesi tamu (guest_...) ke akun Google pengguna saat login.
 */
export const migrateGuestData = async (req, res) => {
  try {
    const { guestId, userId } = req.body || {};
    if (!guestId || !userId || guestId === userId) {
      return res.json({ success: true, migrated: 0 });
    }

    let migratedCount = 0;

    if (isSupabaseConfigured && supabase) {
      // 1. Pindahkan session_telemetries milik guest ke userId baru
      const { data: telUpdated, error: telErr } = await supabase
        .from("session_telemetries")
        .update({ user_id: userId })
        .eq("user_id", guestId)
        .select("id");

      if (telErr) {
        console.warn("[AJIN Migrate] Gagal migrasi session_telemetries:", telErr.message);
      } else if (telUpdated) {
        migratedCount += telUpdated.length;
      }

      // 2. Pindahkan chat_messages & photo_scans milik guest
      await supabase
        .from("chat_messages")
        .update({ user_id: userId })
        .eq("user_id", guestId);

      await supabase
        .from("photo_scans")
        .update({ user_id: userId })
        .eq("user_id", guestId);

      // 3. Gabungkan user_progress guest ke akun userId
      const { data: guestRows } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", guestId);

      if (Array.isArray(guestRows) && guestRows.length > 0) {
        for (const row of guestRows) {
          const { data: existingTarget } = await supabase
            .from("user_progress")
            .select("*")
            .eq("user_id", userId)
            .eq("letter", row.letter)
            .maybeSingle();

          await supabase.from("user_progress").upsert(
            {
              user_id: userId,
              alphabet_id: row.alphabet_id,
              letter: row.letter,
              is_mastered: Boolean(row.is_mastered || existingTarget?.is_mastered),
              best_confidence: Math.max(
                Number(row.best_confidence || 0),
                Number(existingTarget?.best_confidence || 0)
              ),
              attempts_count:
                Number(row.attempts_count || 0) + Number(existingTarget?.attempts_count || 0),
              success_count:
                Number(row.success_count || 0) + Number(existingTarget?.success_count || 0),
              last_practiced_at: row.last_practiced_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,letter" }
          );

          await supabase.from("user_progress").delete().eq("id", row.id);
          migratedCount += 1;
        }
      }
    }

    return res.json({
      success: true,
      migrated: migratedCount,
    });
  } catch (err) {
    console.error("[AJIN Migrate] Error migrating guest data:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memindahkan data sesi tamu.",
    });
  }
};
