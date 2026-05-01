"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, ArrowLeft } from "lucide-react";

type Client = { id: string; name: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function SelectClientFlow({
  coworkingId,
  coworkingName,
  clients,
  nextUrl,
}: {
  coworkingId: string;
  coworkingName: string;
  clients: Client[];
  nextUrl: string;
}) {
  const [q, setQ] = useState("");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(term));
  }, [q, clients]);

  async function pick(c: Client) {
    if (pickingId) return;
    setError(null);
    setPickingId(c.id);
    try {
      const res = await fetch("/api/portal/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: c.id, coworkingId }),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo identificar.");
        setPickingId(null);
        return;
      }
      // Hard navigation: garantiza que la nueva cookie viaja en la siguiente
      // request a /portal/book (router.push tenía race condition).
      window.location.href = nextUrl;
    } catch {
      setError("Error de conexión. Reintenta.");
      setPickingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-ink-50">
      <div className="mx-auto max-w-[640px] px-4 py-6">
        <div className="flex justify-center mb-5">
          <Image
            src="/coworkup-logo.png"
            alt="Cowork Up"
            width={140}
            height={40}
            priority
            className="h-8 w-auto"
          />
        </div>

        <div className="rounded-2xl bg-white shadow-xl border border-ink-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-ink-100">
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-ink-500">
              {coworkingName}
            </p>
            <h1 className="mt-1 text-[20px] font-semibold tracking-tight text-ink-950">
              ¿Quién eres?
            </h1>
            <p className="mt-1 text-[13px] text-ink-500">
              Selecciona tu nombre para reservar la sala.
            </p>

            <div className="relative mt-3.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                autoFocus
                inputMode="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca tu nombre…"
                className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-[14.5px] text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
              />
            </div>
          </div>

          {error && (
            <div className="m-5 mb-0 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              {error}
            </div>
          )}

          <ul className="max-h-[55vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-5 py-10 text-center text-[13px] text-ink-500">
                Sin resultados. Si no apareces, acércate a recepción.
              </li>
            ) : (
              filtered.map((c) => {
                const picking = pickingId === c.id;
                const disabled = !!pickingId && !picking;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(c)}
                      className={
                        "w-full flex items-center gap-3 px-5 py-3 text-left border-b border-ink-100 last:border-b-0 transition-colors " +
                        (disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-ink-50 active:bg-ink-100")
                      }
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-950 text-white text-[12px] font-semibold tracking-wide">
                        {initials(c.name) || "?"}
                      </span>
                      <span className="flex-1 min-w-0 text-[14.5px] font-medium text-ink-950 truncate">
                        {c.name}
                      </span>
                      {picking && (
                        <Loader2 className="h-4 w-4 animate-spin text-ink-500 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-600 hover:text-ink-900 underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cambiar de coworking
          </Link>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-500">
          Cowork Up · {clients.length} {clients.length === 1 ? "cliente activo" : "clientes activos"}
        </p>
      </div>
    </div>
  );
}
