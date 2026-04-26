"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import type { Coworking, ClientType } from "@/lib/types";

export function ClientQuickForm({
  coworkings,
  defaultCoworkingId,
}: {
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<ClientType>("individual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      coworking_id: fd.get("coworking_id"),
      client_type: type,
      name: fd.get("name"),
      company_name: type === "company" ? (fd.get("company_name") || null) : null,
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      status: "pending",
      start_date: new Date().toISOString().slice(0, 10),
    };
    const supabase = createClient();
    const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push(`/clients/${data!.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
            {(["individual", "company"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition ${
                  type === t ? "bg-ink-900 text-white" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {t === "individual" ? "Individual" : "Empresa"}
              </button>
            ))}
          </div>

          <Field label={type === "company" ? "Persona de contacto" : "Nombre completo"}>
            <Input name="name" required autoFocus placeholder={type === "company" ? "Ej. María López" : "Ej. Ana García"} />
          </Field>

          {type === "company" && (
            <Field label="Nombre de empresa">
              <Input name="company_name" required placeholder="Ej. Acme Studio S.L." />
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <Input name="email" type="email" placeholder="email@dominio.com" />
            </Field>
            <Field label="Teléfono">
              <Input name="phone" placeholder="+34 600 000 000" />
            </Field>
          </div>

          <Field label="Coworking">
            <Select name="coworking_id" defaultValue={defaultCoworkingId ?? ""} required>
              {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando…" : "Crear cliente"}
            </Button>
          </div>
          <p className="text-[12px] text-ink-500">
            Una vez creado podrás añadirle suscripciones, pagos, fianza, etiquetas y más.
          </p>
        </form>
      </CardBody>
    </Card>
  );
}
