"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import type { Coworking } from "@/lib/types";

export function IncidentForm({
  coworkings, defaultCoworkingId, currentUserId,
}: {
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      coworking_id: fd.get("coworking_id"),
      title: fd.get("title"),
      description: fd.get("description") || null,
      type: fd.get("type"),
      priority: fd.get("priority"),
      status: fd.get("status"),
      due_date: fd.get("due_date") || null,
      responsible: fd.get("responsible") || null,
      created_by: currentUserId,
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const { error } = await supabase.from("incidents").insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push("/incidents");
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Coworking">
            <Select name="coworking_id" defaultValue={defaultCoworkingId ?? ""} required>
              {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>
          <Field label="Título"><Input name="title" required autoFocus placeholder="Ej. Aire acondicionado sala 2" /></Field>
          <Field label="Descripción"><Textarea name="description" placeholder="Qué pasa, cuándo se ha detectado, contexto…" /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <Select name="type" defaultValue="maintenance">
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
              <Select name="priority" defaultValue="medium">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estado">
              <Select name="status" defaultValue="open">
                <option value="open">Abierta</option>
                <option value="in_progress">En proceso</option>
                <option value="waiting_provider">Pendiente proveedor</option>
                <option value="resolved">Resuelta</option>
                <option value="cancelled">Cancelada</option>
              </Select>
            </Field>
            <Field label="Fecha límite"><Input name="due_date" type="date" /></Field>
          </div>
          <Field label="Responsable"><Input name="responsible" placeholder="Quién la resuelve" /></Field>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear incidencia"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
