# Componentes UI — specs

Reemplaza estos archivos en `src/components/ui/` por las versiones de abajo. Mantienen la misma API pública (mismas props) — solo cambia la presentación.

## `button.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:   "bg-ink-950 text-white hover:bg-ink-800",
  secondary: "bg-brand-400 text-ink-950 hover:bg-brand-500 border border-brand-500",
  ghost:     "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  outline:   "bg-white border border-ink-200 text-ink-800 hover:border-ink-300 hover:bg-ink-50",
  danger:    "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12.5px] rounded-md",
  md: "h-8 px-3 text-[13px] rounded-md",
  lg: "h-10 px-4 text-sm rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        variants[variant], sizes[size], className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
```

**Cambios clave:** `h-10` → `h-8`. `bg-ink-900` → `bg-ink-950`. Radios más pequeños. Gap reducido.

---

## `card.tsx`

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md bg-white border border-ink-200", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-[18px] py-3.5 border-b border-ink-200", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[13.5px] font-semibold text-ink-900 tracking-tight flex items-center gap-1.5", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-[18px] py-4", className)} {...props} />;
}
```

**Sin `shadow-soft`**, radios `rounded-md`, padding más tight.

---

## `badge.tsx`

```tsx
const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand:   "bg-brand-100 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger:  "bg-red-50 text-red-700",
  info:    "bg-sky-50 text-sky-700",
  muted:   "bg-ink-50 text-ink-500",
  dark:    "bg-ink-900 text-white",
};

// Container:
"inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium"
```

**Importante:** elimina los `ring-1 ring-emerald-100` etc — más limpio sin el ring.

Y un `<Dot/>` semántico antes del texto:
```tsx
<Badge tone="success">
  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
  Activo
</Badge>
```

---

## `table.tsx`

```tsx
export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto rounded-md border border-ink-200 bg-white">
      <table className={cn("w-full text-[13px]", className)} {...props} />
    </div>
  );
}
export function THead(props) {
  return <thead className="bg-ink-100 text-ink-500 text-[11px] uppercase tracking-wider font-medium" {...props} />;
}
export function TBody(props) {
  return <tbody className="divide-y divide-ink-200" {...props} />;
}
export function TR({ className, ...props }) {
  return <tr className={cn("hover:bg-ink-50 transition-colors", className)} {...props} />;
}
export function TH({ className, ...props }) {
  return <th className={cn("text-left px-3.5 py-2.5 font-medium border-b border-ink-200 whitespace-nowrap", className)} {...props} />;
}
export function TD({ className, ...props }) {
  return <td className={cn("px-3.5 py-2.5 text-ink-800 align-middle", className)} {...props} />;
}
```

**Cambios clave:** filas más bajas (`py-2.5` en vez de `py-3.5`), header con bg sólido `bg-ink-100`, sin `shadow-soft`, sin `rounded-2xl`.

---

## `input.tsx`

```tsx
const baseField =
  "w-full rounded-md border border-ink-200 bg-white px-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100 disabled:bg-ink-50";

// Input: h-8 (era h-10)
// Label: text-[11.5px] font-medium uppercase tracking-wider text-ink-500
```

---

## Componentes nuevos a crear

### `src/components/ui/kpi.tsx` — KPI grid horizontal sin sombras
```tsx
// Grid con divisores verticales internos en vez de cards separadas
// Ver prototipo Dashboard para el comportamiento exacto
```

### `src/components/ui/seg.tsx` — Segmented control para tabs/filtros
```tsx
// Reemplaza los botones-tab actuales en /payments (presets 7d/30d/90d/all)
// Ver prototipo para el look exacto: pill background con item activo elevado
```

### `src/components/ui/avatar.tsx` — Avatar con iniciales
```tsx
// Sm 22px, md 28px, lg 36px, xl 56px
// Variantes: default (ink), gold (gradient brand), dark (ink-950 + brand text)
```
