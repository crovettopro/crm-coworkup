import * as React from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label, value, hint, tone = "default", icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "brand" | "success" | "warning" | "danger" | "dark";
  icon?: React.ReactNode;
}) {
  const tones = {
    default: "text-ink-900",
    brand:   "text-brand-700",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger:  "text-red-600",
    dark:    "text-ink-900",
  } as const;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-ink-500">{label}</p>
        {icon && <div className="text-ink-400">{icon}</div>}
      </div>
      <p className={cn("font-display mt-3 text-[26px] font-semibold tracking-tight", tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
