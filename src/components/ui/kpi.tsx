import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * KPIs en un grid horizontal compartido — divisores verticales internos
 * en vez de cards separadas. Más denso y "Linear-like".
 *
 * Uso:
 *   <KpiGrid>
 *     <Kpi label="ARR YTD" value="€140k" hint="vs. 2025" accent />
 *     <Kpi label="MRR"     value="€32k" />
 *     ...
 *   </KpiGrid>
 */
export function KpiGrid({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}) {
  const gridCols = cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div
      className={cn(
        "grid grid-cols-1 rounded-md border border-ink-200 bg-white overflow-hidden",
        gridCols,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  icon,
  accent = false,
  trend,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  trend?: { value: string; direction: "up" | "down" };
  valueClassName?: string;
}) {
  return (
    <div className="relative px-[18px] py-4 border-r border-b border-ink-200 last:border-r-0 lg:[&:nth-child(4n)]:border-r-0">
      {accent && (
        <span className="absolute left-0 right-0 top-0 h-[2px] bg-brand-400" aria-hidden />
      )}
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wider text-ink-500">
        {icon && <span className="text-ink-400">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className={cn("mt-2 text-[26px] font-semibold tracking-tight tabular text-ink-950", valueClassName)}>
        {value}
        {trend && (
          <span
            className={cn(
              "ml-1.5 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
              trend.direction === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-ink-500">{hint}</div>}
    </div>
  );
}
