import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f4",
          100: "#dcf1e3",
          200: "#bbe3ca",
          300: "#8ccdaa",
          400: "#57ae83",
          500: "#349166",
          600: "#237451",
          700: "#1c5d42",
          800: "#194a36",
          900: "#153d2d",
        },
        semaforo: {
          verde: "#1c9a5b",
          amarillo: "#d69e0e",
          rojo: "#d64545",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
