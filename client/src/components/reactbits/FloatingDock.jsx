import { motion } from "framer-motion";

export const FloatingDock = ({ items = [], className = "" }) => {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-3 py-2 border-[2.5px] border-ink bg-paper shadow-[5px_5px_0_#111] flex items-center gap-2 ${className}`}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={index}
            onClick={item.onClick}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            title={item.title}
            aria-label={item.title}
            disabled={item.disabled}
            className={`relative p-2.5 border-2 border-ink flex items-center justify-center transition-all ${
              item.active
                ? "bg-yellow text-ink shadow-[2px_2px_0_#111]"
                : item.disabled
                ? "bg-paper-2 text-ink/30 border-ink/30 cursor-not-allowed"
                : "bg-paper text-ink hover:bg-yellow hover:shadow-[2px_2px_0_#111]"
            }`}
          >
            {Icon && <Icon className="w-5 h-5" />}
            {item.badge && (
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 border border-ink text-[9px] font-mono font-black bg-coral text-white">
                {item.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
