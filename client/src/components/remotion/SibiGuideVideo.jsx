import { useMemo } from "react";

/**
 * Komposisi Prosedural Panduan SIBI
 * Memvisualisasikan:
 * 1. Penempatan tangan di dalam kotak Region of Interest (ROI)
 * 2. Lintasan gestur isyarat dinamis J dan Z
 * 3. Indikator penahanan isyarat (Hold-to-Type)
 */
export const SibiGuideVideo = ({
  currentLetter = "A",
  isDynamic = false,
  frame = 0,
}) => {
  // Progres siklus 0 sampai 1 dalam durasi 120 frame
  const cycle = (frame % 120) / 120;
  const holdProgress = Math.min(1, Math.max(0, (cycle - 0.2) / 0.6));

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none relative overflow-hidden font-sans">
      {/* Blueprint Grid Lines (Subtle) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />

      {/* Viewfinder ROI Guide Box */}
      <div className="relative w-64 h-64 border-2 border-brand-cyan/60 rounded-2xl flex items-center justify-center bg-slate-900/60 shadow-inner">
        {/* Sudut Siku Samping */}
        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-2 border-l-2 border-brand-cyan" />
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-2 border-r-2 border-brand-cyan" />
        <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-2 border-l-2 border-brand-cyan" />
        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-2 border-r-2 border-brand-cyan" />

        {/* Dynamic Trajectory SVG untuk J atau Z */}
        {isDynamic ? (
          <svg className="w-48 h-48" viewBox="0 0 100 100">
            {currentLetter === "J" ? (
              <>
                {/* Lintasan Kait J */}
                <path
                  d="M 60 20 L 60 65 Q 60 85 40 85 Q 20 85 25 65"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                />
                {/* Titik gerak animasi */}
                <circle
                  cx={cycle < 0.5 ? 60 : 60 - (cycle - 0.5) * 60}
                  cy={cycle < 0.5 ? 20 + cycle * 90 : 65 + Math.sin(cycle * Math.PI) * 15}
                  r="5"
                  fill="#F59E0B"
                />
              </>
            ) : (
              <>
                {/* Lintasan Zig-Zag Z */}
                <path
                  d="M 25 30 L 75 30 L 25 70 L 75 70"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                />
                <circle
                  cx={
                    cycle < 0.33
                      ? 25 + (cycle / 0.33) * 50
                      : cycle < 0.66
                      ? 75 - ((cycle - 0.33) / 0.33) * 50
                      : 25 + ((cycle - 0.66) / 0.34) * 50
                  }
                  cy={
                    cycle < 0.33
                      ? 30
                      : cycle < 0.66
                      ? 30 + ((cycle - 0.33) / 0.33) * 40
                      : 70
                  }
                  r="5"
                  fill="#F59E0B"
                />
              </>
            )}
            <text x="50" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="bold">
              {currentLetter}
            </text>
          </svg>
        ) : (
          /* Hand Silhouette & Letter Display */
          <div className="flex flex-col items-center justify-center">
            <span className="text-6xl font-display font-extrabold text-brand-soft drop-shadow">
              {currentLetter}
            </span>
            <span className="mt-2 text-xs font-mono text-ink/60">
              Posisikan tangan di dalam kotak
            </span>
          </div>
        )}

        {/* Hold-to-Type Circular Progress Ring */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-mono">
          <svg className="w-4 h-4 -rotate-90">
            <circle cx="8" cy="8" r="6" stroke="#334155" strokeWidth="2" fill="none" />
            <circle
              cx="8" cy="8" r="6"
              stroke={holdProgress >= 1 ? "#10B981" : "#2563EB"}
              strokeWidth="2"
              fill="none"
              strokeDasharray={37.7}
              strokeDashoffset={37.7 - 37.7 * holdProgress}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[11px] tabular-nums text-ink/60">
            {holdProgress >= 1 ? "Terkunci!" : `${Math.round(holdProgress * 100)}% Tahan`}
          </span>
        </div>
      </div>

      {/* Info Bar Bawah */}
      <div className="mt-5 text-center">
        <p className="text-sm font-semibold text-ink/60">
          {isDynamic ? "Gestur Dinamis: Ikuti lintasan panah kuning" : "Gestur Statis: Pertahankan posisi tangan stabil"}
        </p>
        <p className="text-xs text-ink/60 mt-1">
          Tahan selama 1.5 detik untuk mengetik huruf ke narasi
        </p>
      </div>
    </div>
  );
};

