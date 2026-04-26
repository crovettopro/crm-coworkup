"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { PAYMENT_METHODS_LIST, PAYMENT_METHOD_LABEL } from "@/lib/types";

type ClientLite = { id: string; name: string; company_name: string | null; coworking_id: string };

export function PaymentForm({
  clients, defaultClientId,
}: {
  clients: ClientLite[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = clients.find((c) => c.id === clientId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      client_id: clientId,
      coworking_id: selected?.coworking_id,
      month: fd.get("month") || null,
      concept: fd.get("concept") || null,
      expected_amount: Number(fd.get("expected_amount") || 0),
      paid_amount: Number(fd.get("paid_amount") || 0),
      discount_amount: Number(fd.get("discount_amount") || 0),
      status: fd.get("status"),
      expected_payment_date: fd.get("expected_payment_date") || null,
      paid_at: fd.get("paid_at") || null,
      payment_method: fd.get("payment_method") || null,
      bank_reference: fd.get("bank_reference") || null,
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const { error } = await supabase.from("payments").insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push("/payments");
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="pt-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Cliente">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` · ${c.company_name}` : ""}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Mes"><Input name="month" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Concepto"><Input name="concept" placeholder="Cuota mensual / Pase / Extra…" /></Field>
          <Field label="Importe esperado (con IVA, €)"><Input name="expected_amount" type="number" step="0.01" required /></Field>
          <Field label="Importe pagado (€)"><Input name="paid_amount" type="number" step="0.01" defaultValue={0} /></Field>
          <Field label="Estado">
            <Select name="status" defaultValue="pending">
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="partial">Parcial</option>
              <option value="overdue">Impago</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </Field>
          <Field label="Método de pago">
            <Select name="payment_method" defaultValue="card">
              {PAYMENT_METHODS_LIST.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha prevista"><Input name="expected_payment_date" type="date" /></Field>
          <Field label="Fecha real de pago"><Input name="paid_at" type="date" /></Field>
          <Field label="Referencia bancaria"><Input name="bank_reference" /></Field>
          <Field label="Descuento aplicado (€)"><Input name="discount_amount" type="number" step="0.01" defaultValue={0} /></Field>
          <div className="md:col-span-2"><Field label="Notas"><Textarea name="notes" /></Field></div>

          {error && <p className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear pago"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
