# Design Tokens

## 1. `tailwind.config.ts` — REEMPLAZA el archivo completo

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — dorado (mantenido tal cual)
        brand: {
          50:  "#fffbea", 100: "#fff3c4", 200: "#fce588", 300: "#fadb5f",
          400: "#f7c948", 500: "#f0b429", 600: "#de911d", 700: "#cb6e17",
          800: "#9c4d10", 900: "#7c3a0a",
        },
        // Ink — neutrals cool slate (zinc de Tailwind, ajustados)
        ink: {
          50:  "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#d4d4d8",
          400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46",
          800: "#27272a", 900: "#18181b", 950: "#09090b",
        },
      },
      fontFamily: {
        // Solo Inter — eliminamos Plus Jakarta Sans
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        xxs: ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        // Más pequeños que ahora — más sobrio
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
      },
      boxShadow: {
        // Una sola sombra, solo para overlays/dropdowns
        overlay: "0 12px 32px -12px rgba(9, 9, 11, 0.18), 0 0 0 1px rgba(9, 9, 11, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
```

## 2. Tipografía — añade en `app/layout.tsx`

```tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});
const jbm = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

// Aplica `${inter.variable} ${jbm.variable}` en <html>
// Quita la importación de Plus Jakarta Sans
```

En `globals.css`:
```css
html, body { font-family: var(--font-inter), system-ui, sans-serif; -webkit-font-smoothing: antialiased; font-feature-settings: 'cv11'; }
.font-mono { font-family: var(--font-mono); }
.tabular { font-variant-numeric: tabular-nums; }
::selection { background: theme('colors.brand.200'); color: theme('colors.ink.950'); }
```

## 3. Variables semánticas — en `globals.css`

```css
:root {
  --bg: theme('colors.ink.50');
  --bg-elev: white;
  --bg-sunken: theme('colors.ink.100');
  --bg-hover: #f5f5f5;
  --line: theme('colors.ink.200');
  --line-strong: theme('colors.ink.300');
  --shadow-overlay: 0 12px 32px -12px rgba(9, 9, 11, 0.18), 0 0 0 1px rgba(9, 9, 11, 0.06);
}
body { background: var(--bg); color: theme('colors.ink.900'); }
```

## 4. Mapping rápido — clases que cambian en TODO el código

| ANTES | DESPUÉS |
|---|---|
| `font-display` | (eliminar — todo Inter) |
| `shadow-soft` | (eliminar) |
| `rounded-2xl` | `rounded-md` o `rounded-lg` |
| `rounded-xl` | `rounded-md` |
| `border-ink-100` | `border-ink-200` |
| `bg-ink-50/40` (table headers) | `bg-ink-100` |
| `text-[15px] font-semibold` (CardTitle) | `text-[13.5px] font-semibold` |
| Botones `h-10` por defecto | `h-8` (32px) — más Linear |

> **Nota:** En tu config actual `--gold-*` no existe; el rediseño usa `brand-*` igual que antes pero con mucha menos área aplicada. **No introduzcas variables nuevas si ya hay `brand-*`**.
