"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export function IncidentEditor({
  incident,
  canDelete,
}: {
  incident: any;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function quickStatus(newStatus: string) {
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("incidents").update({ status: newStatus }).eq("id", incident.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.from("incidents").update({
      title: fd.get("title"),
      description: fd.get("description") || null,
      type: fd.get("type"),
      priority: fd.get("priority"),
      status: fd.get("status"),
      due_date: fd.get("due_date") || null,
      responsible: fd.get("responsible") || null,
      estimated_cost: fd.get("estimated_cost") ? Number(fd.get("estimated_cost")) : null,
      final_cost: fd.get("final_cost") ? Number(fd.get("final_cost")) : null,
      provider: fd.get("provider") || null,
      notes: fd.get("notes") || null,
    }).eq("id", incident.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta incidencia? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("incidents").delete().eq("id", incident.id);
    router.push("/incidents");
    router.refresh();
  }

  return (
    <>
      {/* Quick status */}
      <Card>
        <CardHeader><CardTitle>Cambiar estado</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 gap-2">
            <QuickStatusButton label="Abrir" value="open" current={incident.status} onClick={quickStatus} disabled={busy} />
            <QuickStatusButton label="En proceso" value="in_progress" current={incident.status} onClick={quickStatus} disabled={busy} />
            <QuickStatusButton label="Pdte. proveedor" value="waiting_provider" current={incident.status} onClick={quickStatus} disabled={busy} />
            <QuickStatusButton label="Resolver" value="resolved" current={incident.status} onClick={quickStatus} disabled={busy} />
          </div>
        </CardBody>
      </Card>

      {/* Full edit */}
      <Card>
        <CardHeader><CardTitle>Editar incidencia</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Título"><Input name="title" defaultValue={incident.title} required /></Field>
            <Field label="Descripción"><Textarea name="description" defaultValue={incident.description ?? ""} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <Select name="type" defaultValue={incident.type}>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="cleaning">Limpieza</option>
                  <option value="internet">Internet</option>
                  <option value="climate">Climatización</option>
                  <option value="furniture">Mobiliario</option>
                  <option value="access">Acceso</option>
                  <option value="client">Cliente</option>
                  <option value="other">Otro</option>
                </Select>
              </Field>
              <Field label="Prioridad">
                <Select name="priority" defaultValue={incident.priority}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </Field>
              <Field label="Estado">
                <Select name="status" defaultValue={incident.status}>
                  <option value="open">Abierta</option>
                  <option value="in_progress">En proceso</option>
                  <option value="waiting_provider">Pendiente proveedor</option>
                  <option value="resolved">Resuelta</option>
                  <option value="cancelled">Cancelada</option>
                </Select>
              </Field>
              <Field label="Fecha límite"><Input name="due_date" type="date" defaultValue={incident.due_date ?? ""} /></Field>
            </div>
            <Field label="Responsable"><Input name="responsible" defaultValue={incident.responsible ?? ""} /></Field>
            <Field label="Proveedor"><Input name="provider" defaultValue={incident.provider ?? ""} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coste estimado (€)"><Input name="estimated_cost" type="number" step="0.01" defaultValue={incident.estimated_cost ?? ""} /></Field>
              <Field label="Coste final (€)"><Input name="final_cost" type="number" step="0.01" defaultValue={incident.final_cost ?? ""} /></Field>
            </div>
            <Field label="Notas internas"><Textarea name="notes" defaultValue={incident.notes ?? ""} /></Field>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              {canDelete ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              ) : <span />}
              <div className="flex items-center gap-2">
                {saved && <span className="text-[12px] text-emerald-600">Guardado ✓</span>}
                <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

function QuickStatusButton({
  label, value, current, onClick, disabled,
}: {
  label: string;
  value: string;
  current: string;
  onClick: (v: string) => void;
  disabled: boolean;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      disabled={disabled || active}
      className={`h-9 rounded-lg text-[12.5px] font-medium transition-colors ${
        active ? "bg-ink-900 text-white" : "bg-white border border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50"
      }`}
    >
      {label}
    </button>
  );
}
