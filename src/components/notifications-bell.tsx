"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, AlarmClock, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";

type Item =
  | { kind: "overdue"; client: string; clientId: string; concept: string | null; amount: number; date: string }
  | { kind: "renewal"; client: string; clientId: string; plan: string; daysToEnd: number; endDate: string };

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const horizonDate = new Date();
      horizonDate.setDate(horizonDate.getDate() + 14);
      const horizon = horizonDate.toISOString().slice(0, 10);

      const [
        { data: overdue },
        { data: renewals },
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("client_id, concept, expected_amount, paid_amount, expected_payment_date, clients(name)")
          .eq("status", "pending")
          .not("expected_payment_date", "is", null)
          .lt("expected_payment_date", today)
          .order("expected_payment_date", { ascending: true })
          .limit(5),
        supabase
          .from("subscriptions")
          .select("client_id, plan_name, end_date, client:clients(name)")
          .eq("status", "active")
          .gte("end_date", today)
          .lte("end_date", horizon)
          .order("end_date", { ascending: true })
          .limit(5),
      ]);
      if (cancelled) return;
      const items: Item[] = [];
      for (const p of (overdue ?? []) as any[]) {
        items.push({
          kind: "overdue",
          client: p.clients?.name ?? "—",
          clientId: p.client_id,
          concept: p.concept,
          amount: Number(p.expected_amount) - Number(p.paid_amount ?? 0),
          date: p.expected_payment_date,
        });
      }
      for (const s of (renewals ?? []) as any[]) {
        const days = Math.round(
          (new Date(s.end_date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000,
        );
        items.push({
          kind: "renewal",
          client: s.client?.name ?? "—",
          clientId: s.client_id,
          plan: s.plan_name,
          daysToEnd: days,
          endDate: s.end_date,
        });
      }
      setItems(items);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [open, loaded]);

  const total = items.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notificaciones"
        className="relative grid place-items-center h-[30px] w-[30px] rounded-md bg-white border border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-900 hover:bg-[#f5f5f5]"
      >
        <Bell className="h-3.5 w-3.5" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-brand-500 text-[10px] font-bold text-ink-950 grid place-items-center ring-2 ring-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-[340px] rounded-md border border-ink-200 bg-white shadow-overlay">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ink-200">
            <span className="text-[13px] font-semibold text-ink-950">Notificaciones</span>
            {total > 0 && <span className="text-[11px] text-ink-500">{total} pendientes</span>}
          </div>

          {!loaded ? (
            <p className="px-3.5 py-6 text-center text-[13px] text-ink-500">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-[13px] text-ink-500">Todo al día 🎉</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((it, i) => (
                <li key={i}>
                  <Link
                    href={`/clients/${it.clientId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-ink-50 border-b border-ink-200 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-7 w-7 place-items-center rounded shrink-0",
                        it.kind === "overdue" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {it.kind === "overdue" ? <AlertTriangle className="h-3.5 w-3.5" /> : <AlarmClock className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-medium text-ink-950 truncate">{it.client}</span>
                        {it.kind === "overdue" ? (
                          <span className="text-[12px] tabular font-medium text-red-700">{formatCurrency(it.amount)}</span>
                        ) : (
                          <span className="text-[11.5px] text-amber-600 shrink-0">
                            {it.daysToEnd === 0 ? "hoy" : it.daysToEnd === 1 ? "mañana" : `${it.daysToEnd}d`}
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-ink-500 truncate">
                        {it.kind === "overdue" ? `Vencido · ${it.concept ?? "pago"}` : `Renueva ${it.plan}`}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-ink-200 text-[11.5px] text-ink-500">
            <Link href="/payments?status=overdue" onClick={() => setOpen(false)} className="hover:text-ink-900">
              Ver impagos →
            </Link>
            <Link href="/renewals" onClick={() => setOpen(false)} className="hover:text-ink-900 inline-flex items-center gap-0.5">
              Ver vencimientos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
