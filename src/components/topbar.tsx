"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import type { Coworking } from "@/lib/types";

const COOKIE_KEY = "active_cw";

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function Topbar({
  coworkings,
  canSelectAll,
  fixedCw,
  currentValue,
}: {
  coworkings: Coworking[];
  canSelectAll: boolean;
  fixedCw?: string | null;
  currentValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // "Todos los coworkings" only allowed in Dashboard
  const allowAll = pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/dashboard/");

  // Auto-fix: si el cookie dice "all" y no estamos en Dashboard, pasar al primer coworking
  useEffect(() => {
    if (canSelectAll && !allowAll && currentValue === "all" && coworkings[0]) {
      setCookie(COOKIE_KEY, coworkings[0].id);
      router.refresh();
    }
  }, [allowAll, canSelectAll, currentValue, coworkings, router]);

  function setCw(value: string) {
    setCookie(COOKIE_KEY, value);
    const next = new URLSearchParams(params.toString());
    next.delete("cw");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  // Worker / manager → fixed coworking, no selector
  if (!canSelectAll) {
    const cw = coworkings.find((c) => c.id === fixedCw) ?? coworkings[0];
    return (
      <div className="flex h-14 items-center justify-between border-b border-ink-100 bg-white px-6">
        <div className="flex items-center gap-2 text-[13px]">
          <Building2 className="h-4 w-4 text-ink-400" />
          <span className="font-medium text-ink-900">{cw?.name ?? "—"}</span>
        </div>
      </div>
    );
  }

  // Admin con selector
  return (
    <div className="flex h-14 items-center justify-between border-b border-ink-100 bg-white px-6">
      <div className="relative">
        <select
          value={allowAll ? currentValue : (currentValue === "all" ? coworkings[0]?.id ?? "" : currentValue)}
          onChange={(e) => setCw(e.target.value)}
          className="appearance-none rounded-lg border border-ink-200 bg-white pl-9 pr-9 h-9 text-[13px] font-medium text-ink-900 hover:border-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-100"
        >
          {allowAll && <option value="all">Todos los coworkings</option>}
          {coworkings.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
      {!allowAll && (
        <p className="text-[11px] text-ink-500">La vista global está disponible solo en el Dashboard</p>
      )}
    </div>
  );
}
