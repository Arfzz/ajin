import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Camera, Sparkles, Activity, ShieldCheck } from "lucide-react";

/**
 * 21st.dev Scroll Media Expansion Hero
 * Menganimasikan kontainer media dari ukuran ringkas terpusat menjadi
 * kanvas visual penuh saat pengguna menggulir halaman ke bawah.
 */
export const MediaExpansionHero = ({ children, tagText, heading, description }) => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  // Transformasi ekspansi lebar dan radius
  const widthPct = useTransform(scrollYProgress, [0, 0.7], ["75%", "100%"]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.7], ["32px", "16px"]);
  const opacityText = useTransform(scrollYProgress, [0, 0.3], [1, 0.4]);

  return (
    <div ref={targetRef} className="relative min-h-[140vh] w-full px-4 sm:px-6 lg:px-8 py-12">
      <div className="sticky top-24 max-w-6xl mx-auto flex flex-col items-center">
        {/* Teks Pengantar dengan Animasi Opacity */}
        <motion.div style={{ opacity: opacityText }} className="text-center max-w-3xl mb-8">
          {tagText && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-brand-soft text-brand-deep border border-brand/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-dark" />
              <span>{tagText}</span>
            </div>
          )}

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-ink tracking-tight leading-tight">
            {heading}
          </h2>

          {description && (
            <p className="mt-4 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </motion.div>

        {/* Dynamic Expanding Container */}
        <motion.div
          style={{
            width: widthPct,
            borderRadius: borderRadius,
          }}
          className="relative h-[26rem] sm:h-[32rem] md:h-[38rem] bg-slate-950 border-2 border-slate-200 shadow-2xl overflow-hidden transition-shadow"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

