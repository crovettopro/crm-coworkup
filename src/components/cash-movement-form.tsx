"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Plus, Minus, X, Trash2 } from "lucide-react";

type Coworking = { id: string; name: string };

export type CashMovement = {
  id: string;
  coworking_id: string;
  occurred_at: string;
  direction: "in" | "out";
  concept: string;
  amount: number | string;
  category?: string | null;
  notes?: string | null;
};

export function CashMovementForm({
  coworkings,
  defaultCoworkingId,
  edit,
  trigger,
}: {
  coworkings: Coworking[];
  defaultCoworkingId: string | null;
  edit?: CashMovement;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">(edit?.direction ?? "in");
  const [coworkingId, setCoworkingId] = useState<string>(edit?.coworking_id ?? defaultCoworkingId ?? coworkings[0]?.id ?? "");
  const [date, setDate] = useState<string>(edit?.occurred_at ?? new Date().toISOString().slice(0, 10));
  const [concept, setConcept] = useState(edit?.concept ?? "");
  const [amount, setAmount] = useState<string>(edit ? String(edit.amount) : "");
  const [category, setCategory] = useState(edit?.category ?? "");
  const [notes, setNotes] = useState(edit?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (open && edit) {
      setDirection(edit.direction);
      setCoworkingId(edit.coworking_id);
      setDate(edit.occurred_at);
      setConcept(edit.concept);
      setAmount(String(edit.amount));
      setCategory(edit.category ?? "");
      setNotes(edit.notes ?? "");
    }
  }, [open, edit]);

  function reset() {
    if (edit) return;
    setConcept(""); setAmount(""); setCategory(""); setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }

  async function save() {
    if (!coworkingId || !concept.trim() || !amount || Number(amount) <= 0) {
      setError("Completa coworking, concepto e importe positivo");
      return;
    }
    setSaving(true); setError(null);
    const supabase = createClient();
    const payload = {
      coworking_id: coworkingId,
      occurred_at: date,
      direction,
      concept: concept.trim(),
      amount: Number(amount),
      category: category.trim() || null,
      notes: notes.trim() || null,
    };
    const { error: err } = edit
      ? await supabase.from("cash_movements").update(payload).eq("id", edit.id)
      : await supabase.from("cash_movements").insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false); reset();
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!edit) return;
    if (!confirm("¿Eliminar este movimiento? Se ajustará la caja automáticamente.")) return;
    setDeleting(true); setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("cash_movements").delete().eq("id", edit.id);
    setDeleting(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      {trigger ? (
        <button type="button" onClick={() => setOpen(true)} className="contents">
          {trigger}
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-3.5 w-3.5" /> Movimiento de caja
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setOpen(false)}>
          <div className="w-full max-w-[460px] rounded-md border border-ink-200 bg-white shadow-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3.5">
              <h2 className="text-[14px] font-semibold text-ink-950">{edit ? "Editar movimiento" : "Nuevo movimiento de caja"}</h2>
              <button onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("in")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${direction === "in" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`}
                >
                  <Plus className="h-4 w-4" /> Ingreso (sin factura)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("out")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${direction === "out" ? "border-red-300 bg-red-50 text-red-700" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`}
                >
                  <Minus className="h-4 w-4" /> Gasto / compra menor
                </button>
              </div>

              {coworkings.length > 1 && (
                <div>
                  <Label>Coworking</Label>
                  <select
                    value={coworkingId}
                    onChange={(e) => setCoworkingId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  >
                    {coworkings.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Importe (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <Label>Concepto</Label>
                <Input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder={direction === "in" ? "Ej. Pase día Juan García" : "Ej. Café para reposición"}
                />
              </div>

              <div>
                <Label>Categoría (opcional)</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={direction === "in" ? "venta puntual" : "limpieza, oficina, café…"}
                />
              </div>

              <div>
                <Label>Notas (opcional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {error && <p className="text-[12px] text-red-600">{error}</p>}
              <p className="text-[11px] text-ink-500">
                {direction === "in"
                  ? "El ingreso se sumará automáticamente al efectivo en caja."
                  : "El gasto se restará automáticamente del efectivo en caja."}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-ink-200 p-3">
              {edit && (
                <Button variant="outline" size="sm" onClick={remove} disabled={saving || deleting} className="!text-red-700 !border-red-200 hover:!bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Eliminando…" : "Eliminar"}
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setOpen(false); reset(); }} disabled={saving || deleting}>Cancelar</Button>
                <Button size="sm" onClick={save} disabled={saving || deleting}>{saving ? "Guardando…" : edit ? "Guardar cambios" : "Guardar"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
