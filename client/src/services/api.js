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

export const getSessionGuestId = () => {
  try {
    return sessionStorage.getItem("ajin_session_id") || "guest-user";
  } catch {
    return "guest-user";
  }
};

export const getLocalTelemetryLogs = () => {
  try {
    const raw = localStorage.getItem("ajin_telemetry_logs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalTelemetryLog = (entry) => {
  try {
    const logs = getLocalTelemetryLogs();
    logs.unshift(entry);
    localStorage.setItem("ajin_telemetry_logs", JSON.stringify(logs.slice(0, 500)));
  } catch (e) {
    console.warn("[AJIN Storage] Gagal menyimpan log telemetri lokal:", e);
  }
};

export const saveProgress = async (payload) => {
  try {
    const userId = payload.userId || getCurrentUserIdentifier();
    // Simpan salinan lokal ke browser
    try {
      const raw = localStorage.getItem("ajin_user_progress") || "[]";
      const list = JSON.parse(raw);
      list.unshift({ ...payload, userId, updatedAt: new Date().toISOString() });
      localStorage.setItem("ajin_user_progress", JSON.stringify(list.slice(0, 200)));
    } catch {}

    const res = await api.post("/progress/update", { ...payload, userId });
    return res.data;
  } catch (err) {
    console.warn("[AJIN API] Server belum terhubung, progres tersimpan di cache lokal browser.");
    return { success: true, localSaved: true };
  }
};

export const sendTelemetry = async (payload) => {
  const userId = payload.userId || getCurrentUserIdentifier();
  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    userId,
    sessionType: payload.sessionType || "practice",
    targetLabel: payload.targetLabel || "-",
    predictedLabel: payload.predictedLabel || "-",
    confidence: Number(payload.confidence || 0),
    latencyMs: Number(payload.latencyMs || 0),
    fps: Number(payload.fps || 0),
    isSuccess: Boolean(payload.isSuccess),
    createdAt: new Date().toISOString(),
  };

  // Selalu simpan di LocalStorage browser
  saveLocalTelemetryLog(entry);

  try {
    const res = await api.post("/telemetry", { ...payload, userId });
    return res.data;
  } catch (err) {
    return { success: true, localSaved: true, entry };
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

// Helper menghitung rangkuman dari kumpulan log telemetri
export const computeSummaryFromLogs = (logs) => {
  if (!logs || logs.length === 0) {
    return {
      totalFrames: 0,
      avgLatencyMs: 0,
      avgFps: 0,
      avgConfidence: 0,
      successRate: 0,
      classMetrics: [],
    };
  }

  const totalFrames = logs.length;
  const avgLatencyMs = +(logs.reduce((acc, curr) => acc + (Number(curr.latencyMs) || 0), 0) / totalFrames).toFixed(2);
  const avgFps = +(logs.reduce((acc, curr) => acc + (Number(curr.fps) || 0), 0) / totalFrames).toFixed(1);
  const avgConfidence = +(logs.reduce((acc, curr) => acc + (Number(curr.confidence) || 0), 0) / totalFrames).toFixed(2);
  const successfulCount = logs.filter((l) => l.isSuccess).length;
  const successRate = +((successfulCount / totalFrames) * 100).toFixed(1);

  const classMap = {};
  for (const log of logs) {
    const lbl = log.targetLabel || log.predictedLabel;
    if (!lbl || lbl === "-") continue;
    if (!classMap[lbl]) {
      classMap[lbl] = { count: 0, successCount: 0, totalConfidence: 0 };
    }
    classMap[lbl].count += 1;
    if (log.isSuccess) classMap[lbl].successCount += 1;
    classMap[lbl].totalConfidence += Number(log.confidence || 0);
  }

  const classMetrics = Object.entries(classMap).map(([letter, d]) => ({
    letter,
    testsCount: d.count,
    accuracyPct: +((d.successCount / d.count) * 100).toFixed(1),
    avgConfidencePct: +(d.totalConfidence / d.count).toFixed(1),
  }));

  return {
    totalFrames,
    avgLatencyMs,
    avgFps,
    avgConfidence,
    successRate,
    classMetrics,
  };
};

export const fetchTelemetrySummary = async (userId) => {
  const targetUserId = userId || getCurrentUserIdentifier();
  const guestId = getSessionGuestId();

  let serverData = null;
  try {
    const res = await api.get("/telemetry/summary", {
      params: { userId: targetUserId, guestId },
    });
    if (res.data && res.data.summary) {
      serverData = res.data;
    }
  } catch (err) {
    console.warn("[AJIN API] Server telemetri belum merespons, memuat dari penyimpanan lokal.");
  }

  // Ambil log lokal di browser
  const allLocalLogs = getLocalTelemetryLogs();
  const relevantLocalLogs = allLocalLogs.filter((l) =>
    targetUserId === "all" ||
    l.userId === targetUserId ||
    (guestId && l.userId === guestId) ||
    l.userId.startsWith("guest_")
  );

  // Jika server memiliki data aktif dan totalFrames > 0
  if (serverData && serverData.summary && serverData.summary.totalFrames > 0) {
    if (!Array.isArray(serverData.summary.classMetrics)) {
      serverData.summary.classMetrics = [];
    }
    return serverData;
  }

  // Jika server kosong (misal baru restart), gunakan rekapan dari LocalStorage browser
  if (relevantLocalLogs.length > 0) {
    const localSummary = computeSummaryFromLogs(relevantLocalLogs);
    return {
      success: true,
      summary: localSummary,
      recentLogs: relevantLocalLogs.slice(0, 50),
      isLocalFallback: true,
    };
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

