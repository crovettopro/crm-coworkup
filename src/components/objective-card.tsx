"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trophy, X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  month: number;
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
  const remaining = Math.max(0, target - collected);

  // Días restantes del mes
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(0, lastDay - today.getDate());

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
    <div className="rounded-md border border-ink-200 bg-white px-[18px] py-[14px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-900">
          <Trophy className="h-3.5 w-3.5 text-ink-400" /> Objetivo <span className="capitalize text-ink-700 font-normal">· {monthLabel}</span>
        </div>
        {canEdit && !isGlobal && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[12px] text-ink-500 hover:text-ink-900 inline-flex items-center gap-1"
          >
            <Pencil className="h-3 w-3" /> {target ? "Editar" : "Definir"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              autoFocus
              placeholder="Ej. 8000"
              className="text-[16px] font-semibold tabular"
            />
            <span className="text-[13px] text-ink-500">€</span>
          </div>
          <p className="text-[11.5px] text-ink-500">Cifra bruta (con IVA) que esperas facturar</p>
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
          <p className="text-[26px] font-semibold tracking-tight text-ink-400">—</p>
          <p className="mt-1 text-[12px] text-ink-500">Selecciona un coworking para ver el objetivo</p>
        </>
      ) : !target ? (
        <>
          <p className="text-[22px] font-semibold tracking-tight text-ink-400">Sin objetivo</p>
          <p className="mt-1 text-[12px] text-ink-500">Define la cifra que quieres alcanzar este mes</p>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-semibold tracking-tight tabular text-ink-950">
              {formatCurrency(collected)}
            </span>
            <span className="text-[13px] text-ink-500">
              / {formatCurrency(target)} <span className="text-ink-700 font-medium">· {pct}%</span>
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
            <div
              className={"h-full rounded-full transition-all " + (pct >= 100 ? "bg-emerald-500" : "bg-brand-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-ink-500">
            <span>{remaining > 0 ? `${formatCurrency(remaining)} para alcanzar el objetivo` : "🎉 Objetivo superado"}</span>
            <span>{daysLeft} días restantes</span>
          </div>
        </>
      )}
    </div>
  );
}
