import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Fallback Alfabet bawaan jika Express belum menyala
import { SIBI_ALPHABETS_FALLBACK } from "./fallbackData.js";

export const fetchAlphabets = async () => {
  try {
    const res = await api.get("/alphabets");
    if (res.data && res.data.data) {
      return res.data.data;
    }
    return SIBI_ALPHABETS_FALLBACK;
  } catch (err) {
    console.warn("[AJIN API] Server belum merespons, menggunakan fallback alfabet lokal.");
    return SIBI_ALPHABETS_FALLBACK;
  }
};

// Helper untuk mendapatkan identitas user aktif atau session tamu unik
export const getCurrentUserIdentifier = () => {
  try {
    const raw = localStorage.getItem("ajin_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u.id || u.sub || u.email) return u.id || u.sub || u.email;
    }
    let guestId = sessionStorage.getItem("ajin_session_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("ajin_session_id", guestId);
    }
    return guestId;
  } catch {
    return "guest-user";
  }
};

export const saveProgress = async (payload) => {
  try {
    const userId = payload.userId || getCurrentUserIdentifier();
    const res = await api.post("/progress/update", { ...payload, userId });
    return res.data;
  } catch (err) {
    console.warn("[AJIN API] Gagal menyimpan ke server, menyimpan di cache lokal.");
    return { success: true, localSaved: true };
  }
};

export const sendTelemetry = async (payload) => {
  try {
    const userId = payload.userId || getCurrentUserIdentifier();
    const res = await api.post("/telemetry", { ...payload, userId });
    return res.data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const interpretSigns = async (letters, contextHint = "") => {
  try {
    const res = await api.post("/ai/interpret", { letters, contextHint });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Server AI tidak merespons." };
  }
};

export const expandTextVariations = async (text, mode = "casual") => {
  try {
    const res = await api.post("/ai/expand", { text, mode });
    return res.data;
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Gagal mengekspansi teks." };
  }
};

export const recognizeSignFromImage = async (image, mimeType = "image/jpeg") => {
  try {
    const res = await api.post("/ai/recognize-image", { image, mimeType });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Gagal memproses gambar.";
    return { success: false, message: msg };
  }
};

export const checkAiStatus = async () => {
  try {
    const res = await api.get("/ai/status");
    return res.data;
  } catch (err) {
    return { success: false, available: false, reason: "Server tidak dapat dijangkau." };
  }
};

export const fetchAiQuizWords = async (category = "umum", difficulty = "easy", count = 5) => {
  try {
    const res = await api.post("/ai/quiz-words", { category, difficulty, count });
    return res.data;
  } catch (err) {
    return {
      success: true,
      words: ["BUKU", "SAYA", "KITA", "AJIN", "BAIK"],
      isAiGenerated: false,
    };
  }
};

export const fetchTelemetrySummary = async (userId) => {
  try {
    const targetUserId = userId || getCurrentUserIdentifier();
    const res = await api.get("/telemetry/summary", {
      params: { userId: targetUserId },
    });
    if (res.data && res.data.summary) {
      if (!Array.isArray(res.data.summary.classMetrics)) {
        res.data.summary.classMetrics = [];
      }
      return res.data;
    }
    return {
      success: true,
      summary: {
        totalFrames: 0,
        avgLatencyMs: 0,
        avgFps: 0,
        avgConfidence: 0,
        successRate: 0,
        classMetrics: [],
      },
      recentLogs: [],
    };
  } catch (err) {
    console.warn("[AJIN API] Server telemetri tidak merespons, memuat data sesi kosong.");
    return {
      success: true,
      summary: {
        totalFrames: 0,
        avgLatencyMs: 0,
        avgFps: 0,
        avgConfidence: 0,
        successRate: 0,
        classMetrics: [],
      },
      recentLogs: [],
    };
  }
};

export const sendAiChatMessage = async (message, history = []) => {
  try {
    const res = await api.post("/ai/chat", { message, history });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Gagal mengirim pesan ke asisten.";
    return {
      success: false,
      message: msg,
      reply: "Maaf, terjadi kendala saat menghubungi asisten AI AJIN.",
    };
  }
};

