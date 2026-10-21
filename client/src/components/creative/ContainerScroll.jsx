import { useRef, useEffect, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

/**
 * 21st.dev Container Scroll Animation
 * Mengubah perspektif 3D kartu saat pengguna menggulir layar,
 * dari kemiringan 20 derajat menjadi mendatar sempurna pada skala penuh.
 */
export const ContainerScroll = ({ titleComponent, children }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.8, 0.95] : [1.02, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 0.6], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.6], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 0.6], [0, -40]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-10 md:py-24"
      style={{ perspective: "1000px" }}
    >
      <div className="w-full relative py-6 md:py-10">
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

const Header = ({ translate, titleComponent }) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="max-w-5xl mx-auto text-center px-4 mb-6 md:mb-12"
    >
      {titleComponent}
    </motion.div>
  );
};

const Card = ({ rotate, scale, children }) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-6 md:-mt-10 mx-auto h-[32rem] sm:h-[38rem] md:h-[42rem] w-full border-4 border-slate-200/80 p-2 md:p-4 bg-white rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden"
    >
      <div className="h-full w-full overflow-hidden rounded-[16px] md:rounded-[24px] bg-slate-950 border border-slate-800 relative">
        {children}
      </div>
    </motion.div>
  );
};
