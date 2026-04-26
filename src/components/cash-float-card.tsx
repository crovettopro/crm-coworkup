"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Wallet, X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function CashFloatCard({
  coworkingId,
  coworkingName,
  initialFloat,
  notes,
  updatedAt,
  canEdit,
}: {
  coworkingId: string;
  coworkingName: string;
  initialFloat: number;
  notes: string | null;
  updatedAt: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number>(initialFloat);
  const [noteValue, setNoteValue] = useState<string>(notes ?? "");
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  async function save() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("cash_register")
      .upsert(
        {
          coworking_id: coworkingId,
          cash_float: Number(value),
          notes: noteValue || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "coworking_id" }
      );
    setSaving(false);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-ink-400" />
          <p className="text-[12px] font-medium text-ink-500">{coworkingName} · Efectivo en caja</p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 text-[12px]"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] text-ink-500">Importe en caja</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                autoFocus
                className="text-[18px] font-semibold"
              />
              <span className="text-[13px] text-ink-500">€</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-500">Nota (opcional)</label>
            <Input
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Ej. arqueo del 25/04"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setValue(initialFloat);
                setNoteValue(notes ?? "");
              }}
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check className="h-3.5 w-3.5" /> {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="font-display text-[28px] font-semibold text-ink-900">
            {formatCurrency(initialFloat)}
          </p>
          {notes && <p className="mt-1 text-[12px] text-ink-500">{notes}</p>}
          {updatedAt && (
            <p className="mt-2 text-[11px] text-ink-400">
              Actualizado {new Date(updatedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
