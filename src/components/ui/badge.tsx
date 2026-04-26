import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "muted" | "dark" | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand:   "bg-brand-100 text-brand-700",
  gold:    "bg-brand-100 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger:  "bg-red-50 text-red-700",
  info:    "bg-sky-50 text-sky-700",
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
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium leading-[1.4]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const dotColors: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-sky-500",
  neutral: "bg-ink-400",
  brand:   "bg-brand-500",
  gold:    "bg-brand-500",
  muted:   "bg-ink-400",
  dark:    "bg-ink-300",
};

export function Dot({
  tone = "neutral",
  className,
}: {
  tone?: "success" | "warning" | "danger" | "info" | "neutral" | "brand" | "gold" | "muted" | "dark";
  className?: string;
}) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dotColors[tone], className)} />;
}
