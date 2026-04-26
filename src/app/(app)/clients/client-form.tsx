"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { CLIENT_STATUS_LABEL, type Client, type Coworking, type ClientStatus, type ClientType } from "@/lib/types";

export function ClientForm({
  coworkings,
  defaultCoworkingId,
  initial,
}: {
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
  initial?: Partial<Client>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ClientType>((initial?.client_type as ClientType) ?? "individual");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload: any = {
      coworking_id: formData.get("coworking_id"),
      client_type: formData.get("client_type"),
      name: formData.get("name"),
      company_name: formData.get("company_name") || null,
      tax_id: formData.get("tax_id") || null,
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      fiscal_address: formData.get("fiscal_address") || null,
      contact_person: formData.get("contact_person") || null,
      status: formData.get("status"),
      start_date: formData.get("start_date") || null,
      end_date: formData.get("end_date") || null,
      cancellation_reason: formData.get("cancellation_reason") || null,
      source: formData.get("source") || null,
      notes: formData.get("notes") || null,
    };
    const supabase = createClient();
    let res;
    if (initial?.id) {
      res = await supabase.from("clients").update(payload).eq("id", initial.id).select("id").single();
    } else {
      res = await supabase.from("clients").insert(payload).select("id").single();
    }
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push(`/clients/${res.data!.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipo de cliente">
            <Select name="client_type" value={type} onChange={(e) => setType(e.target.value as ClientType)}>
              <option value="individual">Individual</option>
              <option value="company">Empresa</option>
            </Select>
          </Field>
          <Field label="Coworking">
            <Select name="coworking_id" defaultValue={initial?.coworking_id ?? defaultCoworkingId ?? ""} required>
              {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>

          <Field label="Nombre completo">
            <Input name="name" required defaultValue={initial?.name ?? ""} />
          </Field>
          {type === "company" && (
            <Field label="Nombre de empresa">
              <Input name="company_name" defaultValue={initial?.company_name ?? ""} />
            </Field>
          )}
          <Field label="CIF / NIF / NIE">
            <Input name="tax_id" defaultValue={initial?.tax_id ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={initial?.email ?? ""} />
          </Field>
          <Field label="Teléfono">
            <Input name="phone" defaultValue={initial?.phone ?? ""} />
          </Field>
          {type === "company" && (
            <Field label="Persona de contacto">
              <Input name="contact_person" defaultValue={initial?.contact_person ?? ""} />
            </Field>
          )}
          <Field label="Dirección fiscal">
            <Input name="fiscal_address" defaultValue={initial?.fiscal_address ?? ""} />
          </Field>
          <Field label="Estado">
            <Select name="status" defaultValue={initial?.status ?? "active"}>
              {Object.entries(CLIENT_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de alta">
            <Input name="start_date" type="date" defaultValue={initial?.start_date ?? new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Fecha de baja">
            <Input name="end_date" type="date" defaultValue={initial?.end_date ?? ""} />
          </Field>
          <Field label="Motivo de baja">
            <Input name="cancellation_reason" defaultValue={initial?.cancellation_reason ?? ""} />
          </Field>
          <Field label="Canal de entrada">
            <Input name="source" defaultValue={initial?.source ?? ""} placeholder="Web / Referido / Instagram…" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Notas internas">
              <Textarea name="notes" defaultValue={initial?.notes ?? ""} />
            </Field>
          </div>

          {error && (
            <p className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
