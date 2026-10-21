import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export const CustomCursor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [cursorType, setCursorType] = useState("default"); // "default" | "hover" | "text" | "camera"

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics for trail
  const springX = useSpring(mouseX, { stiffness: 450, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 450, damping: 28 });

  useEffect(() => {
    // Only run on devices with precision pointer (mouse)
    const mediaQuery = window.matchMedia("(pointer: fine)");
    if (!mediaQuery.matches) return;

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Check what element is currently hovered
      const target = e.target;
      const clickable = target.closest("a, button, input, select, textarea, [role='button'], .btn, .card");

      if (clickable) {
        if (clickable.tagName === "INPUT" || clickable.tagName === "TEXTAREA") {
          setCursorType("text");
        } else if (clickable.getAttribute("href")?.includes("/latihan") || clickable.textContent?.includes("Kamera")) {
          setCursorType("camera");
        } else {
          setCursorType("hover");
        }
      } else {
        setCursorType("default");
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden hidden md:block">
      {/* Outer Spring Follower Box (Neobrutalist Chunky Badge) */}
      <motion.div
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: cursorType === "hover" ? 1.6 : cursorType === "camera" ? 1.8 : cursorType === "text" ? 0.8 : 1,
          rotate: cursorType === "hover" ? 6 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`fixed flex items-center justify-center transition-colors duration-150 ${
          cursorType === "hover"
            ? "w-10 h-10 border-2 border-ink bg-yellow shadow-[2px_2px_0_#111]"
            : cursorType === "camera"
            ? "w-12 h-12 border-2 border-ink bg-coral text-white shadow-[3px_3px_0_#111]"
            : cursorType === "text"
            ? "w-6 h-6 border-2 border-ink bg-white shadow-[1px_1px_0_#111]"
            : "w-8 h-8 border-2 border-ink bg-transparent shadow-[2px_2px_0_#111]"
        }`}
      >
        {cursorType === "hover" && (
          <span className="font-mono text-[8px] font-black uppercase text-ink select-none tracking-tighter">
            KLIK
          </span>
        )}
        {cursorType === "camera" && (
          <span className="font-mono text-[9px] font-black uppercase text-white select-none">
            📷
          </span>
        )}
      </motion.div>

      {/* Center Precise Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        className="fixed w-2.5 h-2.5 bg-ink border border-white rounded-none"
      />
    </div>
  );
};
