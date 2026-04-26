import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";
type Variant = "default" | "gold" | "dark";

const sizes: Record<Size, string> = {
  sm: "h-[22px] w-[22px] text-[10px] rounded-full",
  md: "h-7 w-7 text-[11.5px] rounded-full",
  lg: "h-9 w-9 text-[13px] rounded-md",
  xl: "h-14 w-14 text-[18px] rounded-lg",
};

const variants: Record<Variant, string> = {
  default: "bg-ink-200 text-ink-700",
  gold:    "bg-gradient-to-br from-brand-300 to-brand-500 text-ink-950",
  dark:    "bg-ink-900 text-brand-400",
};

export function Avatar({
  name,
  size = "md",
  variant = "default",
  className,
  initials: explicit,
}: {
  name?: string;
  size?: Size;
  variant?: Variant;
  className?: string;
  initials?: string;
}) {
  const initials =
    explicit ??
    (name
      ? name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase()
      : "·");
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold flex-shrink-0",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {initials}
    </span>
  );
}
