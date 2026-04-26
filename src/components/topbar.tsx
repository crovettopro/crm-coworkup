"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Plus, Search } from "lucide-react";
import type { Coworking } from "@/lib/types";
import { CommandSearch } from "@/components/command-search";
import { NotificationsBell } from "@/components/notifications-bell";

const COOKIE_KEY = "active_cw";

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

const PAGE_TITLES: Record<string, string[]> = {
  "/dashboard":     ["Dashboard"],
  "/clients":       ["Operativa", "Clientes"],
  "/subscriptions": ["Operativa", "Suscripciones"],
  "/renewals":      ["Operativa", "Vencimientos"],
  "/calendar":      ["Operativa", "Calendario"],
  "/incidents":     ["Operativa", "Incidencias"],
  "/payments":      ["Finanzas", "Pagos"],
  "/invoices":      ["Finanzas", "Facturas"],
  "/cash":          ["Finanzas", "Control efectivo"],
  "/churn":         ["Finanzas", "Altas y bajas"],
  "/extras":        ["Espacio", "Monitores y taquillas"],
  "/settings":      ["Espacio", "Configuración"],
  "/import":        ["Espacio", "Importar CSV"],
  "/occupancy":     ["Operativa", "Ocupación"],
};

function crumbsFor(pathname: string): string[] {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return ["Dashboard"];
  // /clients/[id], /clients/new, etc.
  for (const base of Object.keys(PAGE_TITLES)) {
    if (pathname === base || pathname.startsWith(base + "/")) {
      const root = PAGE_TITLES[base];
      if (pathname === base) return root;
      // Sub-paths: append "Detalle" o "Nuevo"
      const tail = pathname.slice(base.length + 1);
      if (tail === "new") return [...root, "Nuevo"];
      return [...root, "Detalle"];
    }
  }
  return ["Cowork Up"];
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
  const [open, setOpen] = useState(false);

  // "Todos los coworkings" only allowed in Dashboard
  const allowAll =
    pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/dashboard/");

  // Auto-fix: si el cookie dice "all" y no estamos en Dashboard, pasar al primer coworking
  useEffect(() => {
    if (canSelectAll && !allowAll && currentValue === "all" && coworkings[0]) {
      setCookie(COOKIE_KEY, coworkings[0].id);
      router.refresh();
    }
  }, [allowAll, canSelectAll, currentValue, coworkings, router]);

  const crumbs = useMemo(() => crumbsFor(pathname), [pathname]);

  function setCw(value: string) {
    setCookie(COOKIE_KEY, value);
    setOpen(false);
    const next = new URLSearchParams(params.toString());
    next.delete("cw");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  const allLabel = "Todos los coworkings";
  const cw = coworkings.find((c) => c.id === currentValue);
  const cwLabel = !canSelectAll
    ? coworkings.find((c) => c.id === fixedCw)?.name ?? coworkings[0]?.name ?? "—"
    : currentValue === "all" && allowAll
    ? allLabel
    : cw?.name ?? coworkings[0]?.name ?? "—";

  return (
    <div className="sticky top-0 z-10 flex h-12 items-center gap-3.5 border-b border-ink-200 bg-white px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[13px] text-ink-500">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-300">/</span>}
            <span className={i === crumbs.length - 1 ? "text-ink-900 font-medium" : "text-ink-500"}>
              {c}
            </span>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search ⌘K (funcional) */}
      <CommandSearch
        trigger={
          <div className="hidden md:flex items-center gap-2 h-[30px] px-2.5 rounded-md bg-ink-100 text-[12.5px] text-ink-500 cursor-pointer hover:bg-ink-200 min-w-[220px]">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar clientes…</span>
            <span className="ml-auto font-mono text-[10.5px] text-ink-500 bg-white border border-ink-200 px-1.5 py-px rounded">⌘K</span>
          </div>
        }
      />

      {/* CW selector */}
      <div className="relative">
        {canSelectAll ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 h-[30px] px-2.5 rounded-md bg-white border border-ink-200 text-[12.5px] text-ink-800 hover:border-ink-300 hover:bg-[#f5f5f5]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              <span>{cwLabel}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-9 z-20 w-56 rounded-md border border-ink-200 bg-white shadow-overlay py-1">
                  {allowAll && (
                    <button
                      onClick={() => setCw("all")}
                      className={
                        "w-full text-left px-3 py-1.5 text-[13px] hover:bg-ink-50 " +
                        (currentValue === "all" ? "bg-ink-50 text-ink-950 font-medium" : "text-ink-700")
                      }
                    >
                      {allLabel}
                    </button>
                  )}
                  {coworkings.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCw(c.id)}
                      className={
                        "w-full text-left px-3 py-1.5 text-[13px] hover:bg-ink-50 " +
                        (currentValue === c.id ? "bg-ink-50 text-ink-950 font-medium" : "text-ink-700")
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 h-[30px] px-2.5 rounded-md bg-white border border-ink-200 text-[12.5px] text-ink-800">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span>{cwLabel}</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <NotificationsBell />

      {/* Quick action */}
      <Link
        href="/clients/new"
        title="Nuevo cliente"
        className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-md bg-ink-950 text-white text-[12.5px] font-medium hover:bg-ink-800"
      >
        <Plus className="h-3.5 w-3.5" /> Nuevo
      </Link>
    </div>
  );
}
