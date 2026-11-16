import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TELEMETRY_FILE_PATH = path.resolve(__dirname, "../data/telemetry_store.json");

// Helper muat log dari file
const loadTelemetryFromFile = () => {
  try {
    if (fs.existsSync(TELEMETRY_FILE_PATH)) {
      const raw = fs.readFileSync(TELEMETRY_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[AJIN Telemetry] Gagal membaca telemetry_store.json:", err.message);
  }
  return [];
};

// Helper simpan log ke file
const saveTelemetryToFile = (logs) => {
  try {
    fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify(logs.slice(0, 1000), null, 2), "utf8");
  } catch (err) {
    console.warn("[AJIN Telemetry] Gagal menulis telemetry_store.json:", err.message);
  }
};

// In-memory cache yang tersinkronisasi dengan file
const telemetryLogs = loadTelemetryFromFile();

export const logTelemetry = async (req, res) => {
  try {
    const {
      userId = "guest-user",
      sessionType = "practice",
      targetLabel,
      predictedLabel,
      confidence = 0,
      latencyMs = 0,
      fps = 0,
      lightingCond = "normal",
      isSuccess = true
    } = req.body;

    const logEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId,
      sessionType,
      targetLabel: targetLabel || "-",
      predictedLabel: predictedLabel || "-",
      confidence: Number(confidence),
      latencyMs: Number(latencyMs),
      fps: Number(fps),
      lightingCond,
      isSuccess: Boolean(isSuccess),
      createdAt: new Date().toISOString()
    };

    telemetryLogs.unshift(logEntry);

    // Batasi log maksimum 1000 entri terbaru
    if (telemetryLogs.length > 1000) {
      telemetryLogs.pop();
    }

    // Simpan ke file disk agar tidak hilang saat server restart
    saveTelemetryToFile(telemetryLogs);

    if (isSupabaseConfigured && supabase) {
      await supabase.from("session_telemetries").insert({
        user_id: userId !== "guest-user" ? userId : null,
        session_type: sessionType,
        target_label: targetLabel,
        predicted_label: predictedLabel,
        confidence: logEntry.confidence,
        latency_ms: logEntry.latencyMs,
        fps: logEntry.fps,
        lighting_cond: lightingCond,
        is_success: logEntry.isSuccess
      });
    }

    return res.json({
      success: true,
      message: "Data telemetri berhasil direkam.",
      entry: logEntry
    });
  } catch (err) {
    console.error("Error logging telemetry:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mencatat telemetri."
    });
  }
};

export const getTelemetrySummary = async (req, res) => {
  try {
    const { userId, guestId } = req.query;

    let logs = [...telemetryLogs];
    if (userId && userId !== "all") {
      logs = logs.filter((l) => l.userId === userId || (guestId && l.userId === guestId));
    }

    // Jika Supabase aktif dan user bukan guest, ambil juga dari database
    if (isSupabaseConfigured && supabase && userId && userId !== "guest-user" && !userId.startsWith("guest_")) {
      try {
        const { data: dbLogs } = await supabase
          .from("session_telemetries")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500);

        if (dbLogs && dbLogs.length > 0) {
          const mappedDbLogs = dbLogs.map((d) => ({
            id: d.id,
            userId: d.user_id,
            sessionType: d.session_type,
            targetLabel: d.target_label,
            predictedLabel: d.predicted_label,
            confidence: Number(d.confidence || 0),
            latencyMs: Number(d.latency_ms || 0),
            fps: Number(d.fps || 0),
            isSuccess: Boolean(d.is_success),
            createdAt: d.created_at
          }));

          const existingIds = new Set(logs.map((l) => l.id));
          for (const dbEntry of mappedDbLogs) {
            if (!existingIds.has(dbEntry.id)) {
              logs.push(dbEntry);
            }
          }
        }
      } catch (dbErr) {
        console.warn("[AJIN Telemetry] Gagal memuat telemetri dari Supabase:", dbErr.message);
      }
    }

    if (logs.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalFrames: 0,
          avgLatencyMs: 0,
          avgFps: 0,
          avgConfidence: 0,
          successRate: 0,
          classMetrics: []
        },
        recentLogs: []
      });
    }

    const totalFrames = logs.length;
    const avgLatencyMs = +(logs.reduce((acc, curr) => acc + curr.latencyMs, 0) / totalFrames).toFixed(2);
    const avgFps = +(logs.reduce((acc, curr) => acc + curr.fps, 0) / totalFrames).toFixed(1);
    const avgConfidence = +(logs.reduce((acc, curr) => acc + curr.confidence, 0) / totalFrames).toFixed(2);
    const successfulCount = logs.filter((l) => l.isSuccess).length;
    const successRate = +((successfulCount / totalFrames) * 100).toFixed(1);

    // Agregasi per kelas huruf (A-Z)
    const classMetrics = {};
    for (const log of logs) {
      const lbl = log.targetLabel || log.predictedLabel;
      if (!lbl || lbl === "-") continue;
      if (!classMetrics[lbl]) {
        classMetrics[lbl] = { count: 0, successCount: 0, totalConfidence: 0 };
      }
      classMetrics[lbl].count += 1;
      if (log.isSuccess) classMetrics[lbl].successCount += 1;
      classMetrics[lbl].totalConfidence += log.confidence;
    }

    const formattedClassMetrics = Object.entries(classMetrics).map(([letter, data]) => ({
      letter,
      testsCount: data.count,
      accuracyPct: +((data.successCount / data.count) * 100).toFixed(1),
      avgConfidencePct: +(data.totalConfidence / data.count).toFixed(1)
    }));

    return res.json({
      success: true,
      summary: {
        totalFrames,
        avgLatencyMs,
        avgFps,
        avgConfidence,
        successRate,
        classMetrics: formattedClassMetrics
      },
      recentLogs: logs.slice(0, 50)
    });
  } catch (err) {
    console.error("Error generating telemetry summary:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal merangkum telemetri."
    });
  }
};
