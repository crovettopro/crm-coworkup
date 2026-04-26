"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import type { Client, Coworking } from "@/lib/types";
import { TAX_TREATMENT_LABEL } from "@/lib/types";
import { Pencil, Save, X } from "lucide-react";

export function ClientEditPanel({ client, coworkings }: { client: Client; coworkings: Coworking[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get("name"),
      company_name: fd.get("company_name") || null,
      tax_id: fd.get("tax_id") || null,
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      fiscal_address: fd.get("fiscal_address") || null,
      contact_person: fd.get("contact_person") || null,
      tax_treatment: fd.get("tax_treatment"),
      coworking_id: fd.get("coworking_id"),
      status: fd.get("status"),
      start_date: fd.get("start_date") || null,
      end_date: fd.get("end_date") || null,
      cancellation_reason: fd.get("cancellation_reason") || null,
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datos del cliente</CardTitle>
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-600 hover:text-ink-900">
            <Pencil className="h-3 w-3" /> Editar
          </button>
        </CardHeader>
        <CardBody className="space-y-2.5 text-sm">
          {client.contact_person && <Row k="Persona contacto" v={client.contact_person} />}
          {client.fiscal_address && <Row k="Dirección fiscal" v={client.fiscal_address} />}
          {client.source && <Row k="Canal" v={client.source} />}

          {/* CIF/NIF separado al final, como dato técnico */}
          <div className="pt-2.5 mt-1 border-t border-ink-200 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <Row k="CIF/NIF" v={client.tax_id ?? "—"} />
            {client.client_type && (
              <Row k="Tipo" v={client.client_type === "company" ? "Empresa" : "Individual"} />
            )}
          </div>

          {client.notes && (
            <div className="pt-2.5 border-t border-ink-200">
              <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500 mb-1">Notas</p>
              <p className="text-[13px] text-ink-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Editar cliente</CardTitle>
        <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-500 hover:text-ink-900">
          <X className="h-3 w-3" /> Cancelar
        </button>
      </CardHeader>
      <CardBody className="pt-5">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Nombre"><Input name="name" defaultValue={client.name} required /></Field>
          {client.client_type === "company" && (
            <Field label="Empresa"><Input name="company_name" defaultValue={client.company_name ?? ""} /></Field>
          )}
          <Field label="CIF/NIF"><Input name="tax_id" defaultValue={client.tax_id ?? ""} /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={client.email ?? ""} /></Field>
          <Field label="Teléfono"><Input name="phone" defaultValue={client.phone ?? ""} /></Field>
          {client.client_type === "company" && (
            <Field label="Persona de contacto"><Input name="contact_person" defaultValue={client.contact_person ?? ""} /></Field>
          )}
          <Field label="Dirección fiscal"><Input name="fiscal_address" defaultValue={client.fiscal_address ?? ""} /></Field>
          <Field label="Coworking">
            <Select name="coworking_id" defaultValue={client.coworking_id}>
              {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>
          <Field label="Tratamiento fiscal" hint="Reverse charge / Intracom no aplican IVA">
            <Select name="tax_treatment" defaultValue={client.tax_treatment ?? "standard"}>
              {Object.entries(TAX_TREATMENT_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select name="status" defaultValue={client.status}>
              <option value="pending">Pendiente</option>
              <option value="active">Activo</option>
              <option value="inactive">Baja</option>
              <option value="paused">Pausado</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alta"><Input name="start_date" type="date" defaultValue={client.start_date ?? ""} /></Field>
            <Field label="Baja"><Input name="end_date" type="date" defaultValue={client.end_date ?? ""} /></Field>
          </div>
          <Field label="Motivo de baja"><Input name="cancellation_reason" defaultValue={client.cancellation_reason ?? ""} /></Field>
          <Field label="Notas"><Textarea name="notes" defaultValue={client.notes ?? ""} /></Field>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full">
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">{k}</p>
      <p className="text-[13px] text-ink-900 truncate">{v}</p>
    </div>
  );
}
