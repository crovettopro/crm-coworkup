import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand: warm gold/yellow inspired by co-workup.com
        brand: {
          50:  "#fffbea",
          100: "#fff3c4",
          200: "#fce588",
          300: "#fadb5f",
          400: "#f7c948",
          500: "#f0b429",
          600: "#de911d",
          700: "#cb6e17",
          800: "#9c4d10",
          900: "#7c3a0a",
        },
        // Ink: cool slate (matches their dark sections)
        ink: {
          50:  "#f7f8fa",
          100: "#eef0f3",
          200: "#dde1e7",
          300: "#bcc3cd",
          400: "#8b95a4",
          500: "#5d6675",
          600: "#404956",
          700: "#2c333d",
          800: "#1d2229",
          900: "#11151a",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', '"Inter"', "ui-sans-serif", "sans-serif"],
      },
      fontSize: {
        xxs: ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(17, 21, 26, 0.04), 0 1px 1px 0 rgba(17, 21, 26, 0.03)",
        ring: "0 0 0 1px rgba(17, 21, 26, 0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
