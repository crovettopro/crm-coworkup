"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function CashFloatCard({
  coworkingId,
  coworkingName,
  initialFloat,
  notes,
  updatedAt,
  canEdit,
  todayIn,
}: {
  coworkingId: string;
  coworkingName: string;
  initialFloat: number;
  notes: string | null;
  updatedAt: string | null;
  canEdit: boolean;
  todayIn?: number;
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
    await supabase.from("cash_register").upsert(
      {
        coworking_id: coworkingId,
        cash_float: Number(value),
        notes: noteValue || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "coworking_id" },
    );
    setSaving(false);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  // "Cuadrada" si actualizado hoy, "Sin actualizar Xh" si más viejo
  const updatedISO = updatedAt ? new Date(updatedAt) : null;
  const hoursSince = updatedISO ? Math.floor((Date.now() - updatedISO.getTime()) / 3600000) : null;
  const stale = hoursSince !== null && hoursSince > 12;

  return (
    <div className="rounded-md border border-ink-200 bg-white px-[18px] py-4">
      <div className="flex items-start justify-between mb-3.5">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-ink-950">{coworkingName}</div>
          <div className="mt-0.5 text-[12px] text-ink-500">
            Caja física
            {updatedISO && (
              <>
                {" · "}
                actualizada{" "}
                {updatedISO.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
              </>
            )}
          </div>
        </div>
        {!editing &&
          (stale ? (
            <Badge tone="warning">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Sin actualizar {hoursSince}h
            </Badge>
          ) : (
            <Badge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Cuadrada
            </Badge>
          ))}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11.5px] uppercase tracking-wider font-medium text-ink-500">
              Importe en caja
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                autoFocus
                className="text-[16px] font-semibold tabular"
              />
              <span className="text-[13px] text-ink-500">€</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] uppercase tracking-wider font-medium text-ink-500">
              Nota (opcional)
            </label>
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
        <div className="flex items-baseline gap-3.5">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">Float</div>
            <div className="text-[26px] font-semibold tracking-tight tabular text-ink-950">
              {formatCurrency(initialFloat)}
            </div>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">Ingresos hoy</div>
            <div className="text-[18px] font-semibold tabular text-emerald-700">
              {todayIn && todayIn > 0 ? `+${formatCurrency(todayIn)}` : formatCurrency(0)}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="ml-2 text-ink-500 hover:text-ink-900 inline-flex h-7 items-center gap-1 rounded-md border border-ink-200 px-2 text-[12px] hover:bg-ink-50"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )}
        </div>
      )}

      {!editing && notes && <p className="mt-2 text-[11.5px] text-ink-500">{notes}</p>}
    </div>
  );
}
