import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TELEMETRY_FILE_PATH = path.resolve(__dirname, "../data/telemetry_store.json");

// Helper muat log dari file lokal
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

// Helper simpan log ke file lokal
const saveTelemetryToFile = (logs) => {
  try {
    fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify(logs.slice(0, 1000), null, 2), "utf8");
  } catch (err) {
    console.warn("[AJIN Telemetry] Gagal menulis telemetry_store.json:", err.message);
  }
};

// In-memory cache yang tersinkronisasi dengan file lokal
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
      isSuccess = true,
    } = req.body || {};

    const normalizedUserId = String(userId || "guest-user").trim();
    const normalizedTarget = targetLabel ? String(targetLabel).toUpperCase().trim() : "-";
    const normalizedPredicted = predictedLabel ? String(predictedLabel).toUpperCase().trim() : "-";

    const logEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: normalizedUserId,
      sessionType,
      targetLabel: normalizedTarget,
      predictedLabel: normalizedPredicted,
      confidence: Number(confidence || 0),
      latencyMs: Number(latencyMs || 0),
      fps: Number(fps || 0),
      lightingCond,
      isSuccess: Boolean(isSuccess),
      createdAt: new Date().toISOString(),
    };

    telemetryLogs.unshift(logEntry);
    if (telemetryLogs.length > 1000) {
      telemetryLogs.pop();
    }
    saveTelemetryToFile(telemetryLogs);

    let supabaseSaved = false;
    let supabaseError = null;

    if (isSupabaseConfigured && supabase) {
      const { data: insertedRow, error: insertErr } = await supabase
        .from("session_telemetries")
        .insert({
          user_id: normalizedUserId,
          session_type: sessionType,
          target_label: normalizedTarget === "-" ? null : normalizedTarget,
          predicted_label: normalizedPredicted === "-" ? null : normalizedPredicted,
          confidence: logEntry.confidence,
          latency_ms: logEntry.latencyMs,
          fps: logEntry.fps,
          lighting_cond: lightingCond,
          is_success: logEntry.isSuccess,
        })
        .select("id")
        .single();

      if (insertErr) {
        supabaseError = insertErr.message;
        console.error(
          `[AJIN Telemetry] Gagal insert ke Supabase (${insertErr.code || "ERR"}):`,
          insertErr.message
        );
      } else {
        supabaseSaved = true;
        if (insertedRow?.id) {
          logEntry.dbId = insertedRow.id;
        }
      }
    }

    return res.json({
      success: true,
      message: "Data telemetri berhasil direkam.",
      supabaseSaved,
      supabaseError: supabaseError || undefined,
      entry: logEntry,
    });
  } catch (err) {
    console.error("[AJIN Telemetry] Error logging telemetry:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mencatat telemetri.",
    });
  }
};

export const getTelemetrySummary = async (req, res) => {
  try {
    const { userId, guestId } = req.query;
    const isGlobal = userId === "all";

    let logs = [];
    let dataSource = "local-store";

    // Prioritaskan membaca data nyata langsung dari Supabase bila tersedia
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from("session_telemetries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!isGlobal && userId) {
        const targetIds = [userId];
        if (guestId && guestId !== userId && guestId !== "guest-user") {
          targetIds.push(guestId);
        }
        query = query.in("user_id", targetIds);
      }

      const { data: dbLogs, error: dbErr } = await query;

      if (dbErr) {
        console.error(
          `[AJIN Telemetry] Gagal memuat telemetri dari Supabase (${dbErr.code || "ERR"}):`,
          dbErr.message
        );
      } else if (Array.isArray(dbLogs)) {
        dataSource = "supabase";
        logs = dbLogs.map((d) => ({
          id: `db-${d.id}`,
          userId: d.user_id || "guest-legacy",
          sessionType: d.session_type,
          targetLabel: d.target_label || "-",
          predictedLabel: d.predicted_label || "-",
          confidence: Number(d.confidence || 0),
          latencyMs: Number(d.latency_ms || 0),
          fps: Number(d.fps || 0),
          isSuccess: Boolean(d.is_success),
          createdAt: d.created_at,
        }));
      }
    }

    // Jika Supabase kosong atau error (mis. migrasi SQL belum dijalankan), fallback ke telemetry_store.json
    if (logs.length === 0) {
      let localLogs = [...telemetryLogs];
      if (!isGlobal && userId) {
        localLogs = localLogs.filter(
          (l) => l.userId === userId || (guestId && l.userId === guestId)
        );
      }
      if (localLogs.length > 0) {
        logs = localLogs;
        dataSource = "local-fallback";
      }
    }

    if (logs.length === 0) {
      return res.json({
        success: true,
        source: dataSource,
        summary: {
          totalFrames: 0,
          avgLatencyMs: 0,
          avgFps: 0,
          avgConfidence: 0,
          successRate: 0,
          classMetrics: [],
        },
        recentLogs: [],
      });
    }

    const totalFrames = logs.length;
    const avgLatencyMs = +(
      logs.reduce((acc, curr) => acc + Number(curr.latencyMs || 0), 0) / totalFrames
    ).toFixed(2);
    const avgFps = +(
      logs.reduce((acc, curr) => acc + Number(curr.fps || 0), 0) / totalFrames
    ).toFixed(1);
    const avgConfidence = +(
      logs.reduce((acc, curr) => acc + Number(curr.confidence || 0), 0) / totalFrames
    ).toFixed(2);
    const successfulCount = logs.filter((l) => l.isSuccess).length;
    const successRate = +((successfulCount / totalFrames) * 100).toFixed(1);

    // Agregasi per kelas huruf (A-Z)
    const classMetrics = {};
    for (const log of logs) {
      const lbl =
        log.targetLabel && log.targetLabel !== "-"
          ? log.targetLabel
          : log.predictedLabel;
      if (!lbl || lbl === "-" || !/^[A-Z]$/.test(lbl)) continue;
      if (!classMetrics[lbl]) {
        classMetrics[lbl] = { count: 0, successCount: 0, totalConfidence: 0 };
      }
      classMetrics[lbl].count += 1;
      if (log.isSuccess) classMetrics[lbl].successCount += 1;
      classMetrics[lbl].totalConfidence += Number(log.confidence || 0);
    }

    const formattedClassMetrics = Object.entries(classMetrics).map(([letter, d]) => ({
      letter,
      testsCount: d.count,
      accuracyPct: +((d.successCount / d.count) * 100).toFixed(1),
      avgConfidencePct: +(d.totalConfidence / d.count).toFixed(1),
    }));

    return res.json({
      success: true,
      source: dataSource,
      summary: {
        totalFrames,
        avgLatencyMs,
        avgFps,
        avgConfidence,
        successRate,
        classMetrics: formattedClassMetrics,
      },
      recentLogs: logs.slice(0, 50),
    });
  } catch (err) {
    console.error("[AJIN Telemetry] Error generating telemetry summary:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal merangkum telemetri.",
    });
  }
};
