import { supabase, isSupabaseConfigured } from "../config/supabase.js";

// In-memory telemetry log buffer
const telemetryLogs = [];

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
      id: telemetryLogs.length + 1,
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

    // Batasi log memori maksimum 1000 entri terbaru
    if (telemetryLogs.length > 1000) {
      telemetryLogs.pop();
    }

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
    const logs = telemetryLogs;

    if (logs.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalFrames: 0,
          avgLatencyMs: 0,
          avgFps: 0,
          avgConfidence: 0,
          successRate: 0,
          classMetrics: {}
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
