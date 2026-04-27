"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { PAYMENT_METHODS_LIST, PAYMENT_METHOD_LABEL } from "@/lib/types";
import { Check, Undo2, X } from "lucide-react";

export function InvoiceRowActions({ invoice }: { invoice: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const isIssued = invoice.status !== "to_issue";

  async function setNotIssued() {
    if (!confirm("¿Marcar la factura como no emitida?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("invoices").update({
      status: "to_issue",
      issue_date: null,
      paid_date: null,
    }).eq("id", invoice.id);
    setBusy(false);
    router.refresh();
  }

  if (!isIssued) {
    return (
      <>
        <Button size="sm" variant="primary" disabled={busy} onClick={() => setOpen(true)}>
          <Check className="h-3.5 w-3.5" /> Marcar emitida
        </Button>
        {open && (
          <IssueInvoiceDialog
            invoice={invoice}
            onClose={() => setOpen(false)}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        )}
      </>
    );
  }

  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={setNotIssued}>
      <Undo2 className="h-3.5 w-3.5" /> Marcar no emitida
    </Button>
  );
}

function IssueInvoiceDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedPayment, setLinkedPayment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [issueDate, setIssueDate] = useState(today);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(invoice.invoice_number ?? "");
  const [markPaid, setMarkPaid] = useState(false);
  const [paidAt, setPaidAt] = useState(today);
  const [paidAmount, setPaidAmount] = useState<number>(Number(invoice.total_amount ?? 0));
  const [paymentMethod, setPaymentMethod] = useState<string>("transfer");
  const [bankRef, setBankRef] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("payments")
        .select("id, paid_at, paid_amount, payment_method, bank_reference, status")
        .eq("invoice_id", invoice.id)
        .maybeSingle();
      if (!alive) return;
      if (data) {
        setLinkedPayment(data);
        if (data.status === "paid") setMarkPaid(true);
        if (data.paid_at) setPaidAt(data.paid_at);
        if (data.paid_amount) setPaidAmount(Number(data.paid_amount));
        if (data.payment_method) setPaymentMethod(data.payment_method);
        if (data.bank_reference) setBankRef(data.bank_reference);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [invoice.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const invoiceUpdate: any = {
      status: markPaid ? "paid" : "issued",
      issue_date: issueDate || today,
      invoice_number: invoiceNumber || null,
      paid_date: markPaid ? paidAt || today : null,
    };
    const { error: invErr } = await supabase
      .from("invoices")
      .update(invoiceUpdate)
      .eq("id", invoice.id);
    if (invErr) {
      setError(invErr.message);
      setBusy(false);
      return;
    }

    if (markPaid) {
      const paymentPayload: any = {
        status: "paid",
        paid_at: paidAt || today,
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod || null,
        bank_reference: bankRef || null,
      };
      if (linkedPayment?.id) {
        const { error: payErr } = await supabase
          .from("payments")
          .update(paymentPayload)
          .eq("id", linkedPayment.id);
        if (payErr) {
          setError(payErr.message);
          setBusy(false);
          return;
        }
      } else {
        const insertPayload = {
          ...paymentPayload,
          client_id: invoice.client_id,
          coworking_id: invoice.coworking_id,
          invoice_id: invoice.id,
          month: invoice.month ?? null,
          concept: invoice.concept ?? null,
          expected_amount: Number(invoice.total_amount ?? paidAmount),
          expected_payment_date: paidAt || today,
        };
        const { error: payErr } = await supabase.from("payments").insert(insertPayload);
        if (payErr) {
          setError(payErr.message);
          setBusy(false);
          return;
        }
      }
    }

    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-xl border border-ink-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white">
          <h2 className="font-display text-[16px] font-semibold text-ink-900">Emitir factura</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-[13px] text-ink-500">Cargando…</div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha emisión">
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Nº de Holded">
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="2026-0001"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-ink-200 bg-ink-50/50 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={markPaid}
                onChange={(e) => setMarkPaid(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <span className="text-[13px] text-ink-900 font-medium">Registrar también el cobro</span>
              {linkedPayment && (
                <span className="ml-auto text-[11.5px] text-ink-500">
                  pago ya vinculado
                </span>
              )}
            </label>

            {markPaid && (
              <div className="space-y-3 rounded-md border border-ink-100 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha de cobro">
                    <Input
                      type="date"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Importe cobrado (€)">
                    <Input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      required
                    />
                  </Field>
                  <Field label="Método de pago">
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {PAYMENT_METHODS_LIST.map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABEL[m]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Referencia bancaria">
                    <Input
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                      placeholder="Opcional"
                    />
                  </Field>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Guardando…" : markPaid ? "Emitir y cobrar" : "Emitir"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
