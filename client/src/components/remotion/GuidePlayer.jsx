import { useState, useEffect, useRef } from "react";
import { SibiGuideVideo } from "./SibiGuideVideo";
import { Play, Pause, RefreshCw } from "lucide-react";

export const GuidePlayer = ({
  letter = "A",
  isDynamic = false,
  autoPlay = true,
  className = "",
}) => {
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const reqRef = useRef(null);

  useEffect(() => {
    let animId;
    if (isPlaying) {
      const loop = () => {
        setFrame((prev) => (prev + 1) % 240);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl ${className}`}>
      {/* Canvas Player Area */}
      <div className="w-full aspect-video sm:aspect-auto sm:h-80 md:h-96">
        <SibiGuideVideo currentLetter={letter} isDynamic={isDynamic} frame={frame} />
      </div>

      {/* Mini Controls Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/60 z-20">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1 text-white/70 hover:text-white transition-colors focus:outline-none"
          title={isPlaying ? "Jeda Animasi" : "Putar Animasi"}
          aria-label={isPlaying ? "Jeda Animasi" : "Putar Animasi"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setFrame(0)}
          className="p-1 text-white/70 hover:text-white transition-colors focus:outline-none"
          title="Ulangi Animasi"
          aria-label="Ulangi Animasi"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

