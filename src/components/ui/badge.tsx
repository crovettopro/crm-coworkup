import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "muted" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand:   "bg-brand-100 text-brand-800",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  danger:  "bg-red-50 text-red-700 ring-1 ring-red-100",
  info:    "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  muted:   "bg-ink-50 text-ink-500",
  dark:    "bg-ink-900 text-white",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-sky-500",
    neutral: "bg-ink-400",
  } as const;
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[tone])} />;
}
