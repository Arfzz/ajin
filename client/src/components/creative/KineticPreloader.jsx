import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDMARK_TAIL = ["J", "I", "N"];
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1];
const EASE_SHUTTER = [0.76, 0, 0.24, 1];

export const KineticPreloader = ({ onFinish, forceShow = false }) => {
  const [shouldShow, setShouldShow] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
    if (forceShow) return true;
    try {
      return !sessionStorage.getItem("ajin_preloader_seen");
    } catch {
      return true;
    }
  });

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(shouldShow);
  const rafRef = useRef(null);
  const holdTimerRef = useRef(null);
  const dismissedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    try {
      sessionStorage.setItem("ajin_preloader_seen", "true");
    } catch {}
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!shouldShow) {
      onFinishRef.current?.();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const durationMs = 950;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const linear = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - linear, 3);
      const pct = Math.round(eased * 100);
      setProgress(pct);

      if (linear < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        holdTimerRef.current = setTimeout(() => {
          dismiss();
        }, 180);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shouldShow, dismiss]);

  const handleExitComplete = () => {
    document.body.style.overflow = "";
    setShouldShow(false);
    onFinishRef.current?.();
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          key="ajin-preloader"
          initial={{ y: 0 }}
          exit={{
            y: "-100%",
            transition: { duration: 0.55, ease: EASE_SHUTTER },
          }}
          className="fixed inset-0 z-[9999] bg-ink text-paper border-b-[4px] border-yellow flex flex-col justify-between select-none"
          role="progressbar"
          aria-label="Memuat AJIN Sistem Isyarat Bahasa Indonesia"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-10" aria-hidden="true" />

          <motion.div
            exit={{
              y: -24,
              opacity: 0,
              transition: { duration: 0.25, ease: EASE_OUT_EXPO },
            }}
            className="flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="flex items-center justify-center text-[clamp(3.75rem,13vw,8.25rem)] font-display font-black leading-none tracking-[-0.045em]">
              <span className="overflow-hidden inline-flex items-center mr-[0.09em] py-[0.04em]">
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                  className="inline-flex items-center justify-center w-[0.94em] h-[0.94em] bg-yellow text-ink"
                >
                  A
                </motion.span>
              </span>

              {WORDMARK_TAIL.map((char, idx) => (
                <span key={char} className="overflow-hidden inline-flex py-[0.04em]">
                  <motion.span
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{
                      duration: 0.5,
                      delay: 0.055 * (idx + 1),
                      ease: EASE_OUT_EXPO,
                    }}
                    className="inline-block text-paper"
                  >
                    {char}
                  </motion.span>
                </span>
              ))}
            </div>

            <div className="overflow-hidden mt-5">
              <motion.p
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.26, ease: EASE_OUT_EXPO }}
                className="font-sans text-xs sm:text-sm font-medium text-paper/65 tracking-normal"
              >
                Sistem Isyarat Bahasa Indonesia (SIBI)
              </motion.p>
            </div>
          </motion.div>

          <div className="w-full">
            <div className="flex items-center justify-between px-6 sm:px-10 pb-4">
              <button
                type="button"
                onClick={dismiss}
                className="font-mono text-xs text-paper/50 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow focus-visible:outline-offset-4 transition-colors cursor-pointer"
              >
                Lewati
              </button>

              <span className="font-mono text-xs font-bold tabular-nums text-paper/75">
                {String(progress).padStart(3, "0")}
              </span>
            </div>

            <div className="w-full h-[3px] bg-paper/15 overflow-hidden">
              <div
                className="h-full w-full bg-yellow origin-left will-change-transform"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
