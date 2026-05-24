/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#121212",
        card: "#1a1a1a",
        cardHover: "#222222",
        critical: "#ff4d4d",
        high: "#ffb347",
        optimised: "#4caf50",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        flash: {
          "0%": { backgroundColor: "rgba(255, 77, 77, 0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out forwards",
        pulseDot: "pulseDot 2s ease-in-out infinite",
        flash: "flash 1.2s ease-out",
      },
    },
  },
  plugins: [],
};
