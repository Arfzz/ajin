import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROGRESS_FILE_PATH = path.resolve(__dirname, "../data/progress_store.json");

// Helper muat progres dari file
const loadProgressFromFile = () => {
  const store = new Map();
  try {
    if (fs.existsSync(PROGRESS_FILE_PATH)) {
      const raw = fs.readFileSync(PROGRESS_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          const key = `${item.userId}-${item.letter || item.alphabetId}`;
          store.set(key, item);
        });
      }
    }
  } catch (err) {
    console.warn("[AJIN Progress] Gagal membaca progress_store.json:", err.message);
  }
  return store;
};

// Helper simpan progres ke file
const saveProgressToFile = (store) => {
  try {
    const list = Array.from(store.values());
    fs.writeFileSync(PROGRESS_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.warn("[AJIN Progress] Gagal menulis progress_store.json:", err.message);
  }
};

// In-memory store untuk progress saat Supabase belum dikonfigurasi
const memoryProgressStore = loadProgressFromFile();

export const updateProgress = async (req, res) => {
  try {
    const { userId = "guest-user", alphabetId, letter, isMastered, confidence } = req.body;

    if (!letter && !alphabetId) {
      return res.status(400).json({
        success: false,
        message: "Parameter letter atau alphabetId wajib dikirim."
      });
    }

    const key = `${userId}-${letter || alphabetId}`;
    const prev = memoryProgressStore.get(key) || {
      userId,
      letter: letter || String(alphabetId),
      isMastered: false,
      bestConfidence: 0,
      attemptsCount: 0,
      updatedAt: new Date().toISOString()
    };

    const updated = {
      ...prev,
      isMastered: Boolean(isMastered || prev.isMastered),
      bestConfidence: Math.max(prev.bestConfidence, Number(confidence || 0)),
      attemptsCount: prev.attemptsCount + 1,
      updatedAt: new Date().toISOString()
    };

    memoryProgressStore.set(key, updated);
    saveProgressToFile(memoryProgressStore);

    if (isSupabaseConfigured && supabase && userId !== "guest-user") {
      await supabase.from("user_progress").upsert({
        user_id: userId,
        alphabet_id: alphabetId,
        is_mastered: updated.isMastered,
        best_confidence: updated.bestConfidence,
        attempts_count: updated.attemptsCount,
        updated_at: updated.updatedAt
      });
    }

    return res.json({
      success: true,
      message: "Progres latihan berhasil diperbarui.",
      data: updated
    });
  } catch (err) {
    console.error("Error updating progress:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui progres latihan."
    });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const { userId = "guest-user" } = req.params;

    if (isSupabaseConfigured && supabase && userId !== "guest-user") {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*, sibi_alphabets(*)")
        .eq("user_id", userId);

      if (!error && data) {
        return res.json({
          success: true,
          source: "supabase",
          data
        });
      }
    }

    const userProgressList = Array.from(memoryProgressStore.values()).filter(
      (item) => item.userId === userId
    );

    return res.json({
      success: true,
      source: "memory-store",
      data: userProgressList
    });
  } catch (err) {
    console.error("Error fetching progress:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat progres pengguna."
    });
  }
};
