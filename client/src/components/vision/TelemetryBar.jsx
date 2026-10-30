import { Activity, Zap, CheckCircle2 } from "lucide-react";

/* TelemetryBar: HUD empiris untuk kamera real-time
   Warna status = fungsional, bukan dekoratif:
   - cv-locked (hijau): gestur terkunci stabil
   - cv-holding (kuning): dalam proses penahanan
   - teks abu: memindai
*/
export const TelemetryBar = ({
  fps = 0,
  latencyMs = 0,
  confidence = 0,
  predictedLetter = "-",
  isHolding = false,
  isLocked = false,
  isSimulationMode = false,
  className = "",
}) => {
  return (
    <div
      className={`w-full bg-ink text-paper border-2 border-ink px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${className}`}
    >
      {/* Status + mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Status indicator: hanya muncul ketika ada state real */}
          <span
            className={`w-2 h-2 ${
              isLocked ? "bg-cv-locked" : isHolding ? "bg-cv-holding" : "bg-paper/30"
            }`}
            aria-hidden="true"
          />
          <span className="font-bold text-paper/80 uppercase tracking-wider text-[10px]">
            {isLocked
              ? "Gestur Terkunci"
              : isHolding
              ? "Menahan Gestur (1,5 Detik)..."
              : "Memindai Gestur Tangan"}
          </span>
        </div>

        {isSimulationMode && (
          <span className="border border-paper/20 text-paper/40 px-2 py-0.5 text-[10px] uppercase tracking-wider">
            Mode Simulasi
          </span>
        )}
      </div>

      {/* Metrik telemetri */}
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="flex items-center gap-1.5" title="Waktu inferensi per frame">
          <Zap className="w-3 h-3 text-cv-holding" aria-hidden="true" />
          <span className="text-paper/40">Latensi:</span>
          <span className="tabular-nums font-bold text-paper">{latencyMs} ms</span>
        </div>

        <div className="flex items-center gap-1.5" title="Frame per detik">
          <Activity className="w-3 h-3 text-cv-scan" aria-hidden="true" />
          <span className="text-paper/40">FPS:</span>
          <span className="tabular-nums font-bold text-paper">{fps}</span>
        </div>

        <div className="flex items-center gap-1.5" title="Tingkat keyakinan model">
          <CheckCircle2 className="w-3 h-3 text-cv-locked" aria-hidden="true" />
          <span className="text-paper/40">Keyakinan:</span>
          <span
            className={`tabular-nums font-bold ${
              confidence >= 80
                ? "text-cv-locked"
                : confidence >= 60
                ? "text-cv-holding"
                : "text-paper/40"
            }`}
          >
            {confidence}%
          </span>
        </div>

        {/* Huruf terdeteksi */}
        <div className="flex items-center gap-2 pl-3 border-l border-paper/10">
          <span className="text-paper/30">Hasil:</span>
          <span className="text-lg font-black text-yellow leading-none">
            {predictedLetter}
          </span>
        </div>
      </div>
    </div>
  );
};
