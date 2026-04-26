"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

type ClientLite = { id: string; name: string; company_name: string | null; coworking_id: string; tax_treatment?: string };

export function InvoiceForm({
  clients, prefillFromPayment,
}: {
  clients: ClientLite[];
  prefillFromPayment?: any | null;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(prefillFromPayment?.client_id ?? clients[0]?.id ?? "");
  const [base, setBase] = useState(Number(prefillFromPayment?.expected_amount ?? 0));
  const [vatRate, setVatRate] = useState(21);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vat = useMemo(() => +(Number(base) * Number(vatRate) / 100).toFixed(2), [base, vatRate]);
  const total = useMemo(() => +(Number(base) + vat).toFixed(2), [base, vat]);
  const selected = clients.find((c) => c.id === clientId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const isIssued = fd.get("status") === "issued";
    const payload = {
      client_id: clientId,
      coworking_id: selected?.coworking_id,
      month: fd.get("month") || prefillFromPayment?.month || null,
      invoice_number: fd.get("invoice_number") || null,
      concept: fd.get("concept") || prefillFromPayment?.concept || null,
      taxable_base: Number(base),
      vat_amount: vat,
      total_amount: total,
      status: isIssued ? "issued" : "to_issue",
      issue_date: isIssued ? (fd.get("issue_date") || new Date().toISOString().slice(0, 10)) : null,
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const { data: ins, error } = await supabase.from("invoices").insert(payload).select("id").single();
    if (error) { setError(error.message); setSaving(false); return; }

    if (prefillFromPayment?.id && ins?.id) {
      await supabase.from("payments").update({ invoice_id: ins.id }).eq("id", prefillFromPayment.id);
    }
    setSaving(false);
    router.push("/invoices");
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Cliente">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nº de Holded"><Input name="invoice_number" placeholder="2026-0001" /></Field>
            <Field label="Mes"><Input name="month" type="date" defaultValue={prefillFromPayment?.month ?? ""} /></Field>
          </div>

          <Field label="Concepto"><Input name="concept" defaultValue={prefillFromPayment?.concept ?? ""} placeholder="Cuota mensual / Pase / Extra…" /></Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Base imponible (€)">
              <Input type="number" step="0.01" value={base} onChange={(e) => setBase(Number(e.target.value))} />
            </Field>
            <Field label="IVA (%)">
              <Input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
            </Field>
            <Field label="Total (€)">
              <Input value={total.toFixed(2)} readOnly className="bg-ink-50 font-medium" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estado">
              <Select name="status" defaultValue={prefillFromPayment ? "issued" : "to_issue"}>
                <option value="to_issue">No emitida</option>
                <option value="issued">Emitida</option>
              </Select>
            </Field>
            <Field label="Fecha emisión" hint="Solo si está emitida">
              <Input name="issue_date" type="date" />
            </Field>
          </div>

          <Field label="Notas"><Textarea name="notes" /></Field>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
