import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f7f4",
          100: "#dcece2",
          200: "#b8d8c6",
          300: "#8bbea3",
          400: "#5c9d7d",
          500: "#3c805f",
          600: "#2b6448",
          700: "#22503a",
          800: "#1c4030",
          900: "#173528",
          950: "#0b1e17",
        },
        ink: {
          50: "#f6f7f6",
          100: "#e8eae7",
          200: "#d1d5d0",
          300: "#aab2a8",
          400: "#7c877c",
          500: "#5f6a5f",
          600: "#4a534a",
          700: "#3d443d",
          800: "#2f342f",
          900: "#1f231f",
          950: "#12140f",
        },
        semaforo: {
          verde: "#207a4f",
          amarillo: "#b8790c",
          rojo: "#bd3d3d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Newsreader", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 22 / 0.04), 0 1px 3px 0 rgb(15 23 22 / 0.06)",
        elevated: "0 4px 16px -4px rgb(15 23 22 / 0.10), 0 2px 6px -2px rgb(15 23 22 / 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
