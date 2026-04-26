import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — gold (mantenido)
        brand: {
          50:  "#fffbea", 100: "#fff3c4", 200: "#fce588", 300: "#fadb5f",
          400: "#f7c948", 500: "#f0b429", 600: "#de911d", 700: "#cb6e17",
          800: "#9c4d10", 900: "#7c3a0a",
        },
        // Ink — cool slate (zinc-aligned, ajustado)
        ink: {
          50:  "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#d4d4d8",
          400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46",
          800: "#27272a", 900: "#18181b", 950: "#09090b",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        xxs: ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
      },
      boxShadow: {
        overlay: "0 12px 32px -12px rgba(9, 9, 11, 0.18), 0 0 0 1px rgba(9, 9, 11, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
