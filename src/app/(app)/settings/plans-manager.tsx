"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, X, Save, Trash2 } from "lucide-react";
import type { Plan } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { PLAN_TYPE_LABEL } from "@/lib/types";

export function PlansManager({
  initial, coworkingId, coworkingName,
}: {
  initial: Plan[];
  coworkingId: string;
  coworkingName: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      coworking_id: coworkingId,
      name: fd.get("name"),
      plan_type: fd.get("plan_type"),
      default_price: Number(fd.get("default_price")),
      vat_rate: Number(fd.get("vat_rate") || 21),
      billing_cycle: fd.get("billing_cycle"),
      duration_days: fd.get("duration_days") ? Number(fd.get("duration_days")) : null,
      included_hours_weekly: fd.get("included_hours_weekly") ? Number(fd.get("included_hours_weekly")) : null,
      description: fd.get("description") || null,
      is_active: fd.get("is_active") === "on",
    };
    const supabase = createClient();
    const res = editingId
      ? await supabase.from("plans").update(payload).eq("id", editingId)
      : await supabase.from("plans").insert(payload);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    setCreating(false); setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este plan? Las suscripciones que lo referencian conservarán el nombre.")) return;
    const supabase = createClient();
    await supabase.from("plans").delete().eq("id", id);
    router.refresh();
  }

  const editing = editingId ? initial.find((p) => p.id === editingId) : null;
  const monthly = initial.filter((p) => p.billing_cycle === "monthly");
  const passes  = initial.filter((p) => p.billing_cycle === "one_off");

  return (
    <div className="space-y-5">
      {/* Mensuales */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-2">Planes mensuales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {monthly.map((p) => (
            <PlanCard key={p.id} p={p} onEdit={() => { setEditingId(p.id); setCreating(false); }} onDelete={() => handleDelete(p.id)} />
          ))}
          {monthly.length === 0 && (
            <p className="text-sm text-ink-500 col-span-2 py-4 text-center">Sin planes mensuales todavía.</p>
          )}
        </div>
      </div>

      {/* Pases */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-2">Pases puntuales</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {passes.map((p) => (
            <PlanCard key={p.id} p={p} onEdit={() => { setEditingId(p.id); setCreating(false); }} onDelete={() => handleDelete(p.id)} />
          ))}
          {passes.length === 0 && (
            <p className="text-sm text-ink-500 col-span-3 py-4 text-center">Sin pases todavía.</p>
          )}
        </div>
      </div>

      {!creating && !editingId && (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> Nuevo plan o pase para {coworkingName}
        </Button>
      )}

      {(creating || editingId) && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4 space-y-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-medium text-ink-900">
              {editingId ? `Editar plan en ${coworkingName}` : `Nuevo plan en ${coworkingName}`}
            </p>
            <button type="button" onClick={() => { setCreating(false); setEditingId(null); }} className="text-ink-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input name="name" required defaultValue={editing?.name ?? ""} placeholder="Ej. Fijo" /></Field>
            <Field label="Tipo">
              <Select name="plan_type" defaultValue={editing?.plan_type ?? "fixed"}>
                <option value="fixed">Fijo</option>
                <option value="flexible">Flexible</option>
                <option value="hours_20">20 horas</option>
                <option value="hours_10">10 horas</option>
                <option value="evening">Tardes</option>
                <option value="office">Oficina</option>
                <option value="company_custom">Empresa personalizado</option>
                <option value="day_pass">Pase de día</option>
                <option value="half_day_pass">Pase medio día</option>
                <option value="week_pass">Pase semanal</option>
              </Select>
            </Field>
            <Field label="Precio neto (€)" hint="Sin IVA"><Input name="default_price" type="number" step="0.01" required defaultValue={editing?.default_price ?? ""} /></Field>
            <Field label="IVA (%)" hint="21 estándar · 10 hostelería">
              <Input name="vat_rate" type="number" step="0.01" min={0} defaultValue={editing?.vat_rate ?? 21} />
            </Field>
            <Field label="Ciclo">
              <Select name="billing_cycle" defaultValue={editing?.billing_cycle ?? "monthly"}>
                <option value="monthly">Mensual</option>
                <option value="one_off">Pase único</option>
              </Select>
            </Field>
            <Field label="Duración (días)" hint="30 mensual · 1 día · 7 semana">
              <Input name="duration_days" type="number" defaultValue={editing?.duration_days ?? 30} />
            </Field>
            <Field label="Horas semanales (opcional)">
              <Input name="included_hours_weekly" type="number" defaultValue={editing?.included_hours_weekly ?? ""} />
            </Field>
          </div>
          <Field label="Descripción"><Textarea name="description" defaultValue={editing?.description ?? ""} /></Field>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} /> Activo
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setCreating(false); setEditingId(null); }}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={busy}><Save className="h-3.5 w-3.5" /> {busy ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function PlanCard({
  p, onEdit, onDelete,
}: {
  p: Plan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-ink-100 px-4 py-3 hover:border-ink-200 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-display text-[14px] font-semibold text-ink-900 truncate">{p.name}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {PLAN_TYPE_LABEL[p.plan_type] ?? p.plan_type} · {p.duration_days ?? "—"}d
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          {!p.is_active && <Badge tone="muted">Inactivo</Badge>}
          <button onClick={onEdit} className="text-ink-500 hover:text-ink-900 p-1"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="text-ink-400 hover:text-red-600 p-1"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      <p className="font-display text-[18px] font-semibold text-ink-900 mt-1.5">
        {formatCurrency(p.default_price)}
        <span className="text-[11px] font-normal text-ink-500 ml-1">+ IVA {p.vat_rate ?? 21}%</span>
      </p>
    </div>
  );
}
