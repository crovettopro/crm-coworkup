import { formatCurrency } from "@/lib/utils";

type Point = { month: string; label: string; value: number };

// Formato determinista (sin Intl) para usar en los tooltips SVG y evitar
// hydration mismatches por diferencias de ICU entre Node y el navegador.
function formatEuroPlain(n: number): string {
  const rounded = Math.round(n);
  const s = String(rounded);
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " EUR";
}

export function SalesChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-[13px] text-ink-500">Sin datos</p>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const total = points.reduce((a, p) => a + p.value, 0);
  const lastIdx = points.length - 1;

  return (
    <div>
      <div className="flex items-end gap-2 h-[200px] pt-3">
        {points.map((p, i) => {
          const heightPct = max > 0 ? (p.value / max) * 86 : 0;
          const isLast = i === lastIdx;
          return (
            <div key={p.month} className="group relative flex-1 flex flex-col items-center justify-end h-full">
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded bg-ink-950 px-2 py-1 text-[11.5px] font-medium tabular text-white opacity-0 transition-opacity group-hover:opacity-100">
                {formatEuroPlain(p.value)}
              </div>
              {/* Bar */}
              <div
                className={
                  "w-full max-w-[32px] rounded-t-sm transition-colors " +
                  (isLast
                    ? "bg-gradient-to-b from-brand-300 to-brand-500 group-hover:from-brand-200 group-hover:to-brand-400"
                    : "bg-ink-100 group-hover:bg-ink-200")
                }
                style={{ height: `${Math.max(2, heightPct)}%` }}
                aria-label={`${p.label}: ${formatEuroPlain(p.value)}`}
              />
              <div className="mt-1.5 text-[10.5px] uppercase tracking-[0.04em] text-ink-500">{p.label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11.5px] text-ink-500">
        <span>Total 12 meses: <strong className="text-ink-950 tabular">{formatCurrency(total)}</strong></span>
        <span>Media: <strong className="text-ink-950 tabular">{formatCurrency(total / points.length)}</strong></span>
      </div>
    </div>
  );
}
