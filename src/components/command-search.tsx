"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, X, ArrowRight, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ClientHit = { id: string; name: string; company_name: string | null; email: string | null; status: string };

export function CommandSearch({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ClientHit[]>([]);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K para abrir
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Search debounced
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) { setHits([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients_listing")
        .select("id, name, company_name, email, status:derived_status")
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,company_name.ilike.%${term}%`)
        .order("last_paid_at", { ascending: false, nullsFirst: false })
        .limit(8);
      if (cancelled) return;
      setHits((data ?? []).map((r: any) => ({
        id: r.id, name: r.name, company_name: r.company_name, email: r.email, status: r.status,
      })));
      setLoading(false);
      setActive(0);
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  // Focus al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  function go(id: string) {
    startTransition(() => router.push(`/clients/${id}`));
    setOpen(false);
    setQ("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active].id); }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-md border border-ink-200 bg-white shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-ink-200">
              <Search className="h-4 w-4 text-ink-500" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Buscar clientes por nombre, empresa o email…"
                className="flex-1 bg-transparent text-[13.5px] text-ink-950 placeholder:text-ink-400 focus:outline-none"
              />
              <button onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-900">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {q.trim() === "" ? (
                <p className="px-3.5 py-6 text-center text-[13px] text-ink-500">
                  Escribe para buscar clientes. Pulsa <kbd className="font-mono text-[11px] bg-ink-100 px-1 rounded">↵</kbd> para abrir.
                </p>
              ) : loading ? (
                <p className="px-3.5 py-6 text-center text-[13px] text-ink-500">Buscando…</p>
              ) : hits.length === 0 ? (
                <p className="px-3.5 py-6 text-center text-[13px] text-ink-500">Sin resultados.</p>
              ) : (
                <ul className="py-1">
                  {hits.map((h, i) => (
                    <li key={h.id}>
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(h.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3.5 py-2 text-left",
                          i === active ? "bg-ink-50" : "hover:bg-ink-50/60",
                        )}
                      >
                        <Avatar name={h.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-ink-950 truncate">{h.name}</div>
                          {(h.company_name || h.email) && (
                            <div className="text-[11.5px] text-ink-500 truncate">{h.company_name ?? h.email}</div>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[10.5px] px-1.5 py-0.5 rounded font-medium",
                            h.status === "active" ? "bg-emerald-50 text-emerald-700" :
                            h.status === "casual" ? "bg-brand-100 text-brand-700" :
                            h.status === "overdue" ? "bg-red-50 text-red-700" :
                            "bg-ink-100 text-ink-600",
                          )}
                        >
                          {h.status}
                        </span>
                        <ArrowRight className="h-3 w-3 text-ink-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-ink-200 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" /> Solo clientes por ahora
              </span>
              <span className="font-mono">↑↓ navegar · ↵ abrir · esc cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
