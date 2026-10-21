/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-theme-yellow",
    "bg-theme-coral",
    "bg-theme-cobalt",
    "bg-theme-mint",
    "bg-theme-ink",
    "bg-yellow",
    "bg-coral",
    "bg-cobalt",
    "bg-mint",
    "bg-ink",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#ffffff",
        "paper-2": "#f8f8f8",
        "paper-3": "#eeeeee",
        yellow: {
          DEFAULT: "#FFD000",
          dark: "#c9a500",
        },
        coral: "#FF4D4D",
        cobalt: "#0055FF",
        mint: "#00C68E",
        "nb-purple": "#7C3AED",
        /* CV state — fungsional */
        "cv-locked":  "#00C68E",
        "cv-holding": "#FFD000",
        "cv-alert":   "#FF4D4D",
        "cv-scan":    "#0055FF",
      },
      fontFamily: {
        sans:    ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        nb:      "5px 5px 0px #111111",
        "nb-sm": "3px 3px 0px #111111",
        "nb-lg": "7px 7px 0px #111111",
        "nb-xl": "10px 10px 0px #111111",
        "nb-y":  "5px 5px 0px #FFD000",
        "nb-r":  "5px 5px 0px #FF4D4D",
        "nb-b":  "5px 5px 0px #0055FF",
        "nb-g":  "5px 5px 0px #00C68E",
      },
      borderWidth: {
        "3": "3px",
      },
      animation: {
        ticker:  "ticker 30s linear infinite",
        ticker2: "ticker 22s linear infinite",
        blink:   "blink 1.1s step-end infinite",
        "spin-slow": "spin 8s linear infinite",
        wiggle:  "wiggle 0.4s ease-in-out",
      },
      keyframes: {
        ticker: {
          "0%":   { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%":      { transform: "rotate(2deg)" },
        },
      },
    },
  },
  plugins: [],
};
