"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Target, X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ObjectiveCard({
  coworkingId,
  isGlobal,
  year,
  month,
  monthLabel,
  initialTarget,
  collected,
  expected,
  canEdit,
}: {
  coworkingId: string | null;
  isGlobal: boolean;
  year: number;
  month: number; // 1-12
  monthLabel: string;
  initialTarget: number | null;
  collected: number;
  expected: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTarget ?? 0);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const target = initialTarget ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
  const expectedPct = target > 0 ? Math.min(100, Math.round((expected / target) * 100)) : 0;
  const remaining = Math.max(0, target - collected);

  async function save() {
    if (!coworkingId || isGlobal) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("monthly_objectives").upsert({
      coworking_id: coworkingId,
      year,
      month,
      target_amount: Number(value),
    }, { onConflict: "coworking_id,year,month" });
    setSaving(false);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-ink-400" />
          <p className="text-[12px] font-medium text-ink-500">Objetivo del mes</p>
        </div>
        {canEdit && !isGlobal && !editing && (
          <button onClick={() => setEditing(true)} className="text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 text-[12px]">
            <Pencil className="h-3 w-3" /> {target ? "Editar" : "Definir"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <p className="text-[11px] text-ink-500 capitalize">{monthLabel}</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              autoFocus
              placeholder="Ej. 8000"
              className="text-[18px] font-semibold"
            />
            <span className="text-[13px] text-ink-500">€</span>
          </div>
          <p className="text-[11px] text-ink-500">Cifra bruta (con IVA) que esperas facturar</p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setValue(target); }}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check className="h-3.5 w-3.5" /> {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : isGlobal ? (
        <>
          <p className="font-display text-[26px] font-semibold text-ink-900">—</p>
          <p className="mt-1 text-[12px] text-ink-500">Selecciona un coworking para ver el objetivo</p>
        </>
      ) : !target ? (
        <>
          <p className="font-display text-[22px] font-semibold text-ink-400">Sin objetivo</p>
          <p className="mt-1 text-[12px] text-ink-500">Define la cifra que quieres alcanzar este mes</p>
        </>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[26px] font-semibold text-ink-900">{formatCurrency(collected)}</p>
            <p className="text-[12px] text-ink-500">de {formatCurrency(target)}</p>
          </div>
          {/* Progress bar with two layers: collected (solid) + expected (faint) */}
          <div className="relative h-2 mt-3 rounded-full bg-ink-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-300"
              style={{ width: `${expectedPct}%` }}
            />
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                pct >= 100 ? "bg-emerald-500" : "bg-ink-900"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
            <span>{pct}% cobrado · {expectedPct}% previsto</span>
            <span>{remaining > 0 ? `Faltan ${formatCurrency(remaining)}` : `🎉 Objetivo superado`}</span>
          </div>
        </>
      )}
    </div>
  );
}
