"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Segmented control para tabs/filtros (presets, etc.).
 * Versión "client" interactiva (state local) y versión "Link" para tabs URL-driven.
 */
export function Seg({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-px rounded-md bg-ink-100 p-0.5", className)}>
      {children}
    </div>
  );
}

const itemBase =
  "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12.5px] font-medium transition-colors whitespace-nowrap";
const itemActive = "bg-white text-ink-950 shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(0,0,0,0.04)]";
const itemInactive = "bg-transparent text-ink-600 hover:text-ink-900";

export function SegButton({
  active,
  onClick,
  children,
  className,
  type = "button",
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(itemBase, active ? itemActive : itemInactive, className)}
    >
      {children}
    </button>
  );
}

export function SegLink({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(itemBase, active ? itemActive : itemInactive, className)}>
      {children}
    </Link>
  );
}
