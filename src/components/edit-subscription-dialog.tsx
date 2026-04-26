"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { X, Pencil } from "lucide-react";
import { formatCurrency, grossPrice } from "@/lib/utils";
import {
  PAYMENT_METHODS_LIST, PAYMENT_METHOD_LABEL,
  TAX_TREATMENT_LABEL, type Subscription,
} from "@/lib/types";

export function EditSubscriptionButton({ subscription, isAdmin }: { subscription: Subscription; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [base, setBase] = useState(subscription.base_price);
  const [quantity, setQuantity] = useState(subscription.quantity ?? 1);
  const [billingMonths, setBillingMonths] = useState<number>(subscription.billing_months ?? 1);
  const [discountType, setDiscountType] = useState<"" | "percent" | "fixed">((subscription.discount_type as any) ?? "");
  const [discountValue, setDiscountValue] = useState(subscription.discount_value ?? 0);
  const [vatRate, setVatRate] = useState(subscription.vat_rate ?? 21);
  const [taxTreatment, setTaxTreatment] = useState(subscription.tax_treatment ?? "standard");

  const subtotal = useMemo(() => Number(base) * Math.max(1, quantity), [base, quantity]);
  const finalNet = useMemo(() => {
    const b = subtotal;
    if (!discountType || !discountValue) return b;
    if (discountType === "percent") return Math.max(0, b * (1 - Number(discountValue) / 100));
    return Math.max(0, b - Number(discountValue));
  }, [subtotal, discountType, discountValue]);

  const finalGross = grossPrice(finalNet, taxTreatment as any, vatRate);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) {
      if (!confirm("Vas a modificar una suscripción. ¿Continuar?")) return;
    }
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.from("subscriptions").update({
      plan_name: fd.get("plan_name"),
      base_price: Number(base),
      quantity: Math.max(1, quantity),
      billing_months: Math.max(1, billingMonths),
      final_price: Number(finalNet.toFixed(2)),
      discount_type: discountType || null,
      discount_value: discountType ? Number(discountValue) : null,
      vat_rate: vatRate,
      tax_treatment: taxTreatment,
      start_date: fd.get("start_date"),
      end_date: fd.get("end_date") || null,
      status: fd.get("status"),
      payment_method: fd.get("payment_method") || null,
      notes: fd.get("notes") || null,
    }).eq("id", subscription.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta suscripción? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("subscriptions").delete().eq("id", subscription.id);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-ink-500 hover:text-ink-900 inline-flex items-center gap-1">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-xl border border-ink-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white">
              <h2 className="font-display text-[16px] font-semibold text-ink-900">Editar suscripción</h2>
              <button onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 text-left">
              <Field label="Nombre del plan"><Input name="plan_name" defaultValue={subscription.plan_name} required /></Field>

              <div className="grid grid-cols-4 gap-3">
                <Field label="Cantidad">
                  <Input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} required />
                </Field>
                <Field label="Periodicidad">
                  <Select value={String(billingMonths)} onChange={(e) => setBillingMonths(Number(e.target.value))}>
                    <option value="1">Mensual</option>
                    <option value="3">Trimestral (3 meses)</option>
                    <option value="6">Semestral (6 meses)</option>
                    <option value="12">Anual (12 meses)</option>
                  </Select>
                </Field>
                <Field label="Precio neto (€)">
                  <Input type="number" step="0.01" value={base} onChange={(e) => setBase(Number(e.target.value))} required />
                </Field>
                <Field label="IVA (%)">
                  <Input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">

                <Field label="Tipo de descuento">
                  <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                    <option value="">Sin descuento</option>
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Importe fijo (€)</option>
                  </Select>
                </Field>
                <Field label="Valor descuento">
                  <Input type="number" step="0.01" min={0} value={discountType ? discountValue : ""} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={!discountType} />
                </Field>

                <Field label="Tratamiento fiscal">
                  <Select value={taxTreatment} onChange={(e) => setTaxTreatment(e.target.value as any)}>
                    {Object.entries(TAX_TREATMENT_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </Select>
                </Field>
                <Field label="Método de pago">
                  <Select name="payment_method" defaultValue={subscription.payment_method ?? "card"}>
                    {PAYMENT_METHODS_LIST.map((m) => (<option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>))}
                  </Select>
                </Field>

                <Field label="Inicio"><Input name="start_date" type="date" defaultValue={subscription.start_date} required /></Field>
                <Field label="Fin"><Input name="end_date" type="date" defaultValue={subscription.end_date ?? ""} /></Field>

                <Field label="Estado">
                  <Select name="status" defaultValue={subscription.status}>
                    <option value="active">Activa</option>
                    <option value="paused">Pausada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="finished">Finalizada</option>
                  </Select>
                </Field>
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 flex items-center justify-between">
                <span className="text-[12px] text-ink-500">El cliente paga</span>
                <div className="text-right">
                  <p className="font-display text-[20px] font-semibold text-ink-900">{formatCurrency(finalGross)}</p>
                  <p className="text-[11px] text-ink-500">neto {formatCurrency(finalNet)}</p>
                </div>
              </div>

              <Field label="Notas"><Textarea name="notes" defaultValue={subscription.notes ?? ""} /></Field>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                {isAdmin ? (
                  <Button type="button" variant="ghost" size="sm" onClick={handleDelete} className="text-red-600">
                    Eliminar
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
