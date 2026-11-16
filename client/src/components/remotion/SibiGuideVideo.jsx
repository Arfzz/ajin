import { useMemo } from "react";

/**
 * Komposisi Prosedural Panduan SIBI Neobrutalism
 * Memvisualisasikan:
 * 1. Penempatan tangan di dalam kotak Region of Interest (ROI)
 * 2. Lintasan gestur isyarat dinamis J dan Z
 * 3. Indikator penahanan isyarat (Hold-to-Type) dengan kontras tinggi
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
    <div className="w-full h-full bg-paper-2 flex flex-col items-center justify-center p-4 sm:p-6 text-ink select-none relative overflow-hidden font-sans border-b-2 border-ink">
      {/* Retro Grid Dots Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

      {/* Viewfinder ROI Guide Box (Neobrutalist Paper Card) */}
      <div className="relative w-56 sm:w-64 h-56 sm:h-64 border-[3px] border-ink rounded-none flex items-center justify-center bg-white shadow-[6px_6px_0_#111]">
        {/* Sudut Siku Samping Neobrutalist */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-[3px] border-l-[3px] border-ink" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-[3px] border-r-[3px] border-ink" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-[3px] border-l-[3px] border-ink" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-[3px] border-r-[3px] border-ink" />

        {/* Dynamic Trajectory SVG untuk J atau Z */}
        {isDynamic ? (
          <svg className="w-44 h-44" viewBox="0 0 100 100">
            {currentLetter === "J" ? (
              <>
                {/* Lintasan Kait J */}
                <path
                  d="M 60 20 L 60 65 Q 60 85 40 85 Q 20 85 25 65"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                />
                {/* Titik gerak animasi */}
                <circle
                  cx={cycle < 0.5 ? 60 : 60 - (cycle - 0.5) * 60}
                  cy={cycle < 0.5 ? 20 + cycle * 90 : 65 + Math.sin(cycle * Math.PI) * 15}
                  r="6"
                  fill="#FF4D4D"
                  stroke="#111111"
                  strokeWidth="2"
                />
              </>
            ) : (
              <>
                {/* Lintasan Zig-Zag Z */}
                <path
                  d="M 25 30 L 75 30 L 25 70 L 75 70"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="4"
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
                  r="6"
                  fill="#FFD000"
                  stroke="#111111"
                  strokeWidth="2"
                />
              </>
            )}
            <text x="50" y="58" textAnchor="middle" fill="#111111" fontSize="26" fontWeight="900" fontFamily="monospace">
              {currentLetter}
            </text>
          </svg>
        ) : (
          /* Hand Silhouette & Letter Display */
          <div className="flex flex-col items-center justify-center text-center p-2">
            <span className="font-display font-black text-7xl sm:text-8xl text-ink leading-none tracking-tight">
              {currentLetter}
            </span>
            <span className="mt-2 text-xs font-mono font-bold uppercase text-ink/75 bg-paper px-2 py-0.5 border border-ink shadow-[2px_2px_0_#111]">
              Posisikan di dalam kotak
            </span>
          </div>
        )}

        {/* Hold-to-Type Badge Progress */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-yellow border-[2px] border-ink shadow-[2px_2px_0_#111] text-xs font-mono font-bold text-ink whitespace-nowrap">
          <svg className="w-3.5 h-3.5 -rotate-90">
            <circle cx="7" cy="7" r="5" stroke="#111111" strokeWidth="2" fill="none" opacity="0.25" />
            <circle
              cx="7" cy="7" r="5"
              stroke="#111111"
              strokeWidth="2"
              fill="none"
              strokeDasharray={31.4}
              strokeDashoffset={31.4 - 31.4 * holdProgress}
              strokeLinecap="square"
            />
          </svg>
          <span className="tabular-nums font-black text-[11px]">
            {holdProgress >= 1 ? "TERKUNCI!" : `${Math.round(holdProgress * 100)}% TAHAN`}
          </span>
        </div>
      </div>

      {/* Info Bar Bawah Kontras Tinggi */}
      <div className="mt-4 px-4 py-2 bg-white border-[2px] border-ink shadow-[3px_3px_0_#111] text-center max-w-sm">
        <p className="text-xs font-mono font-black text-ink uppercase tracking-wide">
          {isDynamic ? "Gestur Dinamis: Ikuti lintasan gerakan" : "Gestur Statis: Pertahankan posisi tangan"}
        </p>
        <p className="text-[11px] font-sans font-semibold text-ink/75 mt-0.5">
          Tahan selama 1 detik di kamera hingga indikator terisi penuh
        </p>
      </div>
    </div>
  );
};
