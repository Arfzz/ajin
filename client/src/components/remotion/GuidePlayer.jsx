import { useState, useEffect, useRef } from "react";
import { SibiGuideVideo } from "./SibiGuideVideo";
import { Play, Pause, RotateCcw } from "lucide-react";

export const GuidePlayer = ({
  letter = "A",
  isDynamic = false,
  autoPlay = true,
  className = "",
}) => {
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

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
    <div className={`relative border-[2.5px] border-ink bg-paper shadow-[4px_4px_0_#111] overflow-hidden ${className}`}>
      {/* Canvas Player Area */}
      <div className="w-full aspect-video sm:aspect-auto sm:h-80 md:h-96">
        <SibiGuideVideo currentLetter={letter} isDynamic={isDynamic} frame={frame} />
      </div>

      {/* Mini Controls Bar Neobrutalism */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-paper p-1 border-[2px] border-ink shadow-[2px_2px_0_#111] z-20">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 border border-ink text-ink font-mono transition-transform hover:translate-x-[1px] hover:translate-y-[1px] ${
            isPlaying ? "bg-yellow" : "bg-mint"
          }`}
          title={isPlaying ? "Jeda Simulasi" : "Putar Simulasi"}
          aria-label={isPlaying ? "Jeda Simulasi" : "Putar Simulasi"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setFrame(0)}
          className="p-1.5 border border-ink bg-paper-2 hover:bg-yellow text-ink transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
          title="Ulangi dari Awal"
          aria-label="Ulangi dari Awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
