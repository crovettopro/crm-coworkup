"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { X, User } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

type Extra = {
  id: string;
  coworking_id: string;
  type: string;
  identifier: string;
  monthly_price: number;
  status: "available" | "rented" | "returned" | "pending";
};

type ClientLite = { id: string; name: string };
type Assignment = {
  id: string;
  client_id: string;
  client: ClientLite | null;
  start_date: string | null;
  price: number | null;
};

export function ExtraTile({
  extra,
  assignment,
  clients,
}: {
  extra: Extra;
  assignment: Assignment | null;
  clients: ClientLite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [price, setPrice] = useState<string>(String(extra.monthly_price ?? 0));
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const isRented = extra.status === "rented" && assignment;

  async function assign() {
    if (!selectedClientId) { setError("Selecciona un cliente"); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    const { error: insErr } = await supabase.from("client_extras").insert({
      client_id: selectedClientId,
      coworking_id: extra.coworking_id,
      extra_id: extra.id,
      price: Number(price) || extra.monthly_price,
      start_date: startDate,
      status: "rented",
    });
    if (insErr) { setSaving(false); setError(insErr.message); return; }
    const { error: updErr } = await supabase.from("extras").update({ status: "rented" }).eq("id", extra.id);
    if (updErr) { setSaving(false); setError(updErr.message); return; }
    setSaving(false); setOpen(false);
    startTransition(() => router.refresh());
  }

  async function release() {
    if (!confirm(`¿Liberar ${extra.identifier}?`)) return;
    setSaving(true); setError(null);
    const supabase = createClient();
    if (assignment?.id) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("client_extras").update({ status: "returned", end_date: today }).eq("id", assignment.id);
    }
    const { error: updErr } = await supabase.from("extras").update({ status: "available" }).eq("id", extra.id);
    setSaving(false);
    if (updErr) { setError(updErr.message); return; }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  const filteredClients = clients
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 80);

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null); }}
        className={cn(
          "rounded-lg border p-2.5 text-center transition-colors",
          isRented
            ? "border-ink-900 bg-ink-900 text-white hover:bg-ink-800"
            : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
        )}
        title={isRented ? `Alquilado a ${assignment?.client?.name ?? "—"}` : "Disponible — clic para asignar"}
      >
        <p className="text-[13px] font-mono font-semibold">{extra.identifier}</p>
        <p className={cn(
          "text-[10.5px] uppercase tracking-wider",
          isRented ? "text-brand-400" : "text-ink-400",
        )}>
          {isRented ? assignment?.client?.name?.split(" ")[0] ?? "ocupado" : "libre"}
        </p>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setOpen(false)}>
          <div className="w-full max-w-[440px] rounded-2xl border border-ink-100 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-100 p-4">
              <h2 className="font-display text-[16px] font-semibold text-ink-900">
                {extra.identifier} <span className="text-ink-500 font-normal">· {extra.type === "locker" ? "Taquilla" : extra.type === "screen" ? "Monitor" : extra.type}</span>
              </h2>
              <button onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>

            {isRented ? (
              <div className="p-4 space-y-3">
                <div className="rounded-lg border border-ink-100 bg-ink-50 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-ink-500">Alquilado a</p>
                  <Link href={`/clients/${assignment?.client_id}`} className="font-display text-[15px] font-semibold text-ink-900 hover:underline inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {assignment?.client?.name}
                  </Link>
                  <p className="text-[12px] text-ink-500 mt-1">
                    Desde {assignment?.start_date ? new Date(assignment.start_date).toLocaleDateString("es-ES") : "—"} ·
                    {" "}{formatCurrency(assignment?.price ?? 0)}/mes
                  </p>
                </div>
                {error && <p className="text-[12px] text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cerrar</Button>
                  <Button onClick={release} disabled={saving} className="bg-red-600 hover:bg-red-700">
                    {saving ? "Liberando…" : "Liberar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div>
                  <Label>Buscar cliente</Label>
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre del cliente…"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-ink-100">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-center text-[12px] text-ink-500">Sin coincidencias</p>
                  ) : (
                    <ul>
                      {filteredClients.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedClientId(c.id)}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-ink-50",
                              selectedClientId === c.id ? "bg-ink-900 text-white hover:bg-ink-900" : "text-ink-700",
                            )}
                          >
                            {c.name}
                            {selectedClientId === c.id && <span className="text-brand-400">✓</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Precio €/mes</Label>
                    <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label>Desde</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                </div>
                {error && <p className="text-[12px] text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                  <Button onClick={assign} disabled={saving || !selectedClientId}>
                    {saving ? "Asignando…" : "Asignar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
