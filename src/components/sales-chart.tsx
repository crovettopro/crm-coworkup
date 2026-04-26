import { formatCurrency } from "@/lib/utils";

type Point = { month: string; label: string; value: number };

// Formato determinista (sin Intl) para usar dentro del SVG y evitar hydration mismatches
// causados por diferencias de ICU entre Node y el navegador (NBSP vs space, símbolo, etc.).
function formatEuroPlain(n: number): string {
  const rounded = Math.round(n);
  const s = String(rounded);
  // Inserta puntos como separador de miles, estilo español
  const withDots = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots} EUR`;
}

export function SalesChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">Sin datos</p>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const totals = points.reduce((a, p) => a + p.value, 0);
  const avg = totals / points.length;

  // SVG layout
  const W = 600;
  const H = 180;
  const padX = 8;
  const padTop = 14;
  const padBottom = 24;
  const innerH = H - padTop - padBottom;
  const colW = (W - padX * 2) / points.length;
  const barW = Math.max(8, colW * 0.7);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" preserveAspectRatio="none">
        <line x1={padX} x2={W - padX} y1={H - padBottom} y2={H - padBottom} stroke="#e5e7eb" strokeWidth={1} />
        {points.map((p, i) => {
          const h = max > 0 ? (p.value / max) * innerH : 0;
          const x = padX + i * colW + (colW - barW) / 2;
          const y = H - padBottom - h;
          const isLast = i === points.length - 1;
          return (
            <g key={p.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                rx={2}
                className={isLast ? "fill-ink-900" : "fill-ink-300"}
              >
                <title>{`${p.label}: ${formatEuroPlain(p.value)}`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-ink-500"
                style={{ fontSize: 10 }}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
        <span>Total 12 meses: <strong className="text-ink-900">{formatCurrency(totals)}</strong></span>
        <span>Media mensual: <strong className="text-ink-900">{formatCurrency(avg)}</strong></span>
      </div>
    </div>
  );
}
