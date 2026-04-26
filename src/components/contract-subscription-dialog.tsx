"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, grossPrice } from "@/lib/utils";
import {
  PAYMENT_METHODS_LIST, PAYMENT_METHOD_LABEL,
  TAX_TREATMENT_LABEL,
  type Plan, type Client,
} from "@/lib/types";
import { X, Plus, Coffee, Sparkles } from "lucide-react";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ContractSubscriptionDialog({
  client, plans, trigger,
}: {
  client: Client;
  plans: Plan[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);

  const availablePlans = useMemo(
    () => plans.filter((p) => !p.coworking_id || p.coworking_id === client.coworking_id),
    [plans, client.coworking_id]
  );

  const [planId, setPlanId] = useState(availablePlans[0]?.id ?? "");
  const [priceNet, setPriceNet] = useState(Number(availablePlans[0]?.default_price ?? 0));
  const [quantity, setQuantity] = useState(1);
  const [billingMonths, setBillingMonths] = useState<number>(1);
  const [concept, setConcept] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [taxTreatment, setTaxTreatment] = useState(client.tax_treatment ?? "standard");
  const [vatRate, setVatRate] = useState(21);
  const [discountType, setDiscountType] = useState<"" | "percent" | "fixed">("");
  const [discountValue, setDiscountValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => availablePlans.find((p) => p.id === planId), [planId, availablePlans]);
  const isAdHoc = plan?.plan_type === "coffee" || plan?.plan_type === "misc";
  const isOneOff = plan?.billing_cycle === "one_off";

  useEffect(() => {
    if (plan) {
      setPriceNet(Number(plan.default_price));
      setVatRate(Number(plan.vat_rate ?? 21));
    }
    if (plan && !isAdHoc) setConcept("");
  }, [plan?.id]);

  const endDate = useMemo(() => {
    // Si la sub es mensual recurrente, multiplica los días por billing_months
    if (!plan?.duration_days) return "";
    const days = plan.billing_cycle === "monthly"
      ? plan.duration_days * Math.max(1, billingMonths)
      : plan.duration_days;
    return addDays(startDate, days);
  }, [startDate, plan?.duration_days, plan?.billing_cycle, billingMonths]);

  // Total = unit × quantity, then discount, then VAT
  const subtotalNet = useMemo(() => Number(priceNet) * Math.max(1, quantity), [priceNet, quantity]);
  const finalNet = useMemo(() => {
    const b = subtotalNet;
    if (!discountType || !discountValue) return b;
    if (discountType === "percent") return Math.max(0, b * (1 - Number(discountValue) / 100));
    return Math.max(0, b - Number(discountValue));
  }, [subtotalNet, discountType, discountValue]);

  const grossAmount = grossPrice(finalNet, taxTreatment as any, vatRate);
  const baseGross = grossPrice(subtotalNet, taxTreatment as any, vatRate);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!plan) return;
    if (priceNet <= 0) { setError("El precio debe ser mayor que 0."); return; }
    if (quantity < 1) { setError("La cantidad debe ser al menos 1."); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    const finalConcept = concept.trim() || (quantity > 1 ? `${quantity}× ${plan.name}` : plan.name);
    const { error } = await supabase.from("subscriptions").insert({
      client_id: client.id,
      coworking_id: client.coworking_id,
      plan_id: plan.id,
      plan_name: plan.name,
      base_price: Number(priceNet),
      quantity: Math.max(1, quantity),
      billing_months: plan.billing_cycle === "monthly" ? Math.max(1, billingMonths) : 1,
      discount_type: discountType || null,
      discount_value: discountType ? Number(discountValue) : null,
      final_price: Number(finalNet.toFixed(2)),
      vat_rate: vatRate,
      tax_treatment: taxTreatment,
      start_date: startDate,
      end_date: endDate || null,
      status: "active",
      payment_method: paymentMethod,
      notes: isAdHoc || concept.trim() || quantity > 1 ? finalConcept : null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  function reset() {
    setPlanId(availablePlans[0]?.id ?? "");
    setPriceNet(Number(availablePlans[0]?.default_price ?? 0));
    setVatRate(Number(availablePlans[0]?.vat_rate ?? 21));
    setQuantity(1);
    setConcept("");
    setDiscountType("");
    setDiscountValue(0);
    setError(null);
  }

  return (
    <>
      <span onClick={() => { reset(); setOpen(true); }}>
        {trigger ?? (
          <Button variant="outline" size="md"><Plus className="h-4 w-4" /> Suscripción</Button>
        )}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
          <div className="w-full max-w-[600px] rounded-2xl bg-white shadow-xl border border-ink-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-ink-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-display text-[18px] font-semibold text-ink-900">Contratar plan o venta</h2>
                <p className="text-[12px] text-ink-500 mt-0.5">para {client.name}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {availablePlans.length === 0 ? (
                <p className="text-sm text-ink-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  No hay planes definidos para este coworking. Crea planes en la sección Suscripciones.
                </p>
              ) : (
                <>
                  <Field label="Plan, pase o venta">
                    <Select value={planId} onChange={(e) => setPlanId(e.target.value)} required>
                      {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.plan_type === "coffee" ? "☕ " : p.plan_type === "misc" ? "✨ " : ""}
                          {p.name} — {Number(p.default_price).toFixed(2)}€ {p.billing_cycle === "monthly" ? "/mes" : p.plan_type === "coffee" || p.plan_type === "misc" ? "(editable)" : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {isAdHoc && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2 flex items-start gap-2">
                      {plan?.plan_type === "coffee" ? <Coffee className="h-4 w-4 text-brand-700 mt-0.5" /> : <Sparkles className="h-4 w-4 text-brand-700 mt-0.5" />}
                      <div className="text-[12px] text-ink-700">
                        <p className="font-medium text-ink-900">Venta puntual</p>
                        <p>Indica el precio neto unitario, la cantidad y describe el concepto.</p>
                      </div>
                    </div>
                  )}

                  <Field label={isAdHoc ? "Concepto (irá en la factura)" : "Concepto detallado (opcional)"}>
                    <Input
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      placeholder={
                        plan?.plan_type === "coffee" ? "Ej. Café para sala 2 (4 personas)" :
                        plan?.plan_type === "misc" ? "Ej. Alquiler sala eventos sábado 12 abril" :
                        `Por defecto: Cuota ${plan?.name ?? "—"}`
                      }
                      required={isAdHoc}
                    />
                  </Field>

                  {/* Cantidad + Precio + IVA + Periodicidad si es mensual */}
                  <div className={"grid gap-3 " + (plan?.billing_cycle === "monthly" ? "grid-cols-4" : "grid-cols-3")}>
                    <Field label="Cantidad" hint={isOneOff ? "Nº de pases / unidades" : "Suele ser 1"}>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        required
                      />
                    </Field>
                    {plan?.billing_cycle === "monthly" && (
                      <Field label="Periodicidad" hint="cada cuántos meses paga">
                        <Select value={String(billingMonths)} onChange={(e) => setBillingMonths(Number(e.target.value))}>
                          <option value="1">Mensual</option>
                          <option value="3">Trimestral</option>
                          <option value="6">Semestral</option>
                          <option value="12">Anual</option>
                        </Select>
                      </Field>
                    )}
                    <Field label="Precio neto (€)">
                      <Input type="number" step="0.01" min={0} value={priceNet} onChange={(e) => setPriceNet(Number(e.target.value))} required />
                    </Field>
                    <Field label="IVA (%)">
                      <Input type="number" step="0.01" min={0} value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Inicio">
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </Field>
                    <Field label="Fin (auto)">
                      <Input value={endDate || "—"} readOnly className="bg-ink-50 text-ink-700" />
                    </Field>
                  </div>

                  {/* Descuento */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo de descuento">
                      <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                        <option value="">Sin descuento</option>
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Importe fijo (€ neto)</option>
                      </Select>
                    </Field>
                    <Field label="Valor descuento">
                      <Input
                        type="number" step="0.01" min={0}
                        value={discountType ? discountValue : ""}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        disabled={!discountType}
                        placeholder={discountType === "percent" ? "10" : discountType === "fixed" ? "25" : "—"}
                      />
                    </Field>
                  </div>

                  {/* Resumen */}
                  {plan && (
                    <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-ink-500">El cliente paga</p>
                          <p className="font-display text-[26px] font-semibold text-ink-900 mt-1">{formatCurrency(grossAmount)}</p>
                          <p className="text-[12px] text-ink-500 mt-0.5">
                            {quantity > 1 && <>{quantity}× {formatCurrency(priceNet)} = {formatCurrency(subtotalNet)} neto · </>}
                            {quantity === 1 && <>neto {formatCurrency(finalNet)} · </>}
                            {taxTreatment === "standard" ? `IVA ${vatRate}%` : TAX_TREATMENT_LABEL[taxTreatment]}
                          </p>
                        </div>
                        {discountType && grossAmount !== baseGross && (
                          <div className="text-right">
                            <p className="text-[11px] text-ink-500">antes</p>
                            <p className="text-[14px] text-ink-500 line-through">{formatCurrency(baseGross)}</p>
                          </div>
                        )}
                        <Badge tone={plan.billing_cycle === "monthly" ? "brand" : "muted"}>
                          {plan.billing_cycle === "monthly" ? "Mensual" : "Pase / Venta"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Método de pago">
                      <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        {PAYMENT_METHODS_LIST.map((m) => (<option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>))}
                      </Select>
                    </Field>
                    <Field label="Tratamiento fiscal">
                      <Select value={taxTreatment} onChange={(e) => setTaxTreatment(e.target.value as any)}>
                        {Object.entries(TAX_TREATMENT_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </Select>
                    </Field>
                  </div>

                  {!isAdHoc && (
                    <p className="text-[12px] text-ink-500 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                      ✓ Se generará el pago previsto en estado <span className="font-medium">impagado</span>.
                    </p>
                  )}

                  {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={saving || !plan}>{saving ? "Creando…" : "Crear"}</Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
