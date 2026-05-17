import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#07090d",
          900: "#0b0f17",
          850: "#101620",
          800: "#151d29",
          700: "#223044",
        },
        signal: {
          green: "#37d17b",
          yellow: "#f2c94c",
          red: "#ff5c7a",
          blue: "#60a5fa",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(96, 165, 250, 0.14)",
        risk: "0 0 28px rgba(255, 92, 122, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
