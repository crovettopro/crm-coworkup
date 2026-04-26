"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import type { Coworking, Plan } from "@/lib/types";

type ClientLite = { id: string; name: string; company_name: string | null; coworking_id: string };

export function SubscriptionForm({
  coworkings, clients, plans, defaultClientId,
}: {
  coworkings: Coworking[];
  clients: ClientLite[];
  plans: Plan[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [base, setBase] = useState(plans[0]?.default_price ?? 0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "">("");
  const [discountValue, setDiscountValue] = useState(0);

  const finalPrice = useMemo(() => {
    if (!discountType || !discountValue) return Number(base);
    if (discountType === "percent") return Math.max(0, Number(base) * (1 - Number(discountValue) / 100));
    return Math.max(0, Number(base) - Number(discountValue));
  }, [base, discountType, discountValue]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedPlan = plans.find((p) => p.id === planId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      client_id: clientId,
      coworking_id: selectedClient?.coworking_id ?? coworkings[0]?.id,
      plan_id: planId || null,
      plan_name: selectedPlan?.name ?? String(fd.get("plan_name") ?? ""),
      base_price: Number(base),
      discount_type: discountType || null,
      discount_value: discountType ? Number(discountValue) : null,
      final_price: Number(finalPrice.toFixed(2)),
      start_date: fd.get("start_date"),
      end_date: fd.get("end_date") || null,
      status: fd.get("status"),
      auto_renew: fd.get("auto_renew") === "on",
      billing_day: fd.get("billing_day") ? Number(fd.get("billing_day")) : null,
      payment_method: fd.get("payment_method") || null,
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const { error } = await supabase.from("subscriptions").insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push(`/clients/${clientId}`);
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Cliente">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ""}</option>
              ))}
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={planId} onChange={(e) => {
              setPlanId(e.target.value);
              const p = plans.find((pp) => pp.id === e.target.value);
              if (p) setBase(p.default_price);
            }}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.default_price}€</option>
              ))}
            </Select>
          </Field>

          <Field label="Precio base (€)">
            <Input type="number" step="0.01" value={base} onChange={(e) => setBase(Number(e.target.value))} />
          </Field>
          <Field label="Tipo de descuento">
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
              <option value="">Sin descuento</option>
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Importe fijo (€)</option>
            </Select>
          </Field>
          <Field label="Valor descuento">
            <Input type="number" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={!discountType} />
          </Field>
          <Field label="Precio final (€)">
            <Input value={finalPrice.toFixed(2)} readOnly className="bg-ink-50 font-medium" />
          </Field>

          <Field label="Fecha inicio">
            <Input name="start_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </Field>
          <Field label="Fecha fin">
            <Input name="end_date" type="date" />
          </Field>

          <Field label="Estado">
            <Select name="status" defaultValue="active">
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
              <option value="cancelled">Cancelada</option>
              <option value="finished">Finalizada</option>
            </Select>
          </Field>
          <Field label="Día de facturación (1-28)">
            <Input name="billing_day" type="number" min={1} max={28} defaultValue={1} />
          </Field>

          <Field label="Método de pago">
            <Select name="payment_method" defaultValue="">
              <option value="">—</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="cash">Efectivo</option>
              <option value="direct_debit">Domiciliación</option>
              <option value="other">Otro</option>
            </Select>
          </Field>
          <Field label="Renovación automática">
            <label className="inline-flex items-center gap-2 mt-2">
              <input type="checkbox" name="auto_renew" defaultChecked /> Sí
            </label>
          </Field>

          <div className="md:col-span-2">
            <Field label="Notas">
              <Textarea name="notes" />
            </Field>
          </div>

          {error && <p className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear suscripción"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
