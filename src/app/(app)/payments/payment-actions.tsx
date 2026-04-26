"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Check, MoreHorizontal, X, Pencil } from "lucide-react";
import { PAYMENT_METHODS_LIST, PAYMENT_METHOD_LABEL } from "@/lib/types";

export function PaymentRowActions({ payment }: { payment: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function quickPaid() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("payments").update({
      status: "paid",
      paid_amount: payment.expected_amount,
      paid_at: new Date().toISOString().slice(0, 10),
    }).eq("id", payment.id);
    setBusy(false);
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    await supabase.from("payments").update({
      expected_amount: Number(fd.get("expected_amount") || 0),
      paid_amount: Number(fd.get("paid_amount") || 0),
      status: fd.get("status"),
      payment_method: fd.get("payment_method") || null,
      paid_at: fd.get("paid_at") || null,
      expected_payment_date: fd.get("expected_payment_date") || null,
      notes: fd.get("notes") || null,
    }).eq("id", payment.id);
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {payment.status !== "paid" && (
        <Button size="sm" variant="primary" disabled={busy} onClick={quickPaid}>
          <Check className="h-3.5 w-3.5" /> Cobrado
        </Button>
      )}
      <button
        onClick={() => setEditing(true)}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        title="Editar"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
          <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-xl border border-ink-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <h2 className="font-display text-[16px] font-semibold text-ink-900">Editar pago</h2>
              <button onClick={() => setEditing(false)} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-4 space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Esperado (€)"><Input name="expected_amount" type="number" step="0.01" defaultValue={payment.expected_amount} /></Field>
                <Field label="Pagado (€)"><Input name="paid_amount" type="number" step="0.01" defaultValue={payment.paid_amount ?? 0} /></Field>
                <Field label="Estado">
                  <Select name="status" defaultValue={payment.status}>
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="partial">Parcial</option>
                    <option value="overdue">Impago</option>
                    <option value="cancelled">Cancelado</option>
                  </Select>
                </Field>
                <Field label="Método">
                  <Select name="payment_method" defaultValue={payment.payment_method ?? ""}>
                    <option value="">—</option>
                    {PAYMENT_METHODS_LIST.map((m) => (<option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>))}
                  </Select>
                </Field>
                <Field label="Vence"><Input name="expected_payment_date" type="date" defaultValue={payment.expected_payment_date ?? ""} /></Field>
                <Field label="Cobrado el"><Input name="paid_at" type="date" defaultValue={payment.paid_at ?? ""} /></Field>
              </div>
              <Field label="Notas"><Textarea name="notes" defaultValue={payment.notes ?? ""} /></Field>
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
