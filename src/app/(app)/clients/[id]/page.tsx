import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ClientEditPanel } from "./edit-panel";
import { ScheduleBajaPanel } from "./schedule-baja-panel";
import { ContractSubscriptionDialog } from "@/components/contract-subscription-dialog";
import { EditSubscriptionButton } from "@/components/edit-subscription-dialog";
import { Mail, Phone, MapPin, Building2, Calendar, Plus, ListChecks, AlarmClock } from "lucide-react";
import { PAYMENT_STATUS_LABEL, EXTRA_TYPE_LABEL, TAX_TREATMENT_LABEL } from "@/lib/types";
import { formatCurrency, formatCurrencyGross, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Activo", overdue: "Impago", inactive: "Baja", pending: "Pendiente", casual: "Casual",
};
const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "warning"> = {
  active: "success", overdue: "danger", inactive: "neutral", pending: "warning", casual: "neutral",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);

  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const cwName = coworkings.find((c) => c.id === client.coworking_id)?.name ?? "—";

  const [{ data: derivedRows }, { data: subs }, { data: payments }, { data: invoices }, { data: extras }, { data: deposits }, { data: plans }] = await Promise.all([
    supabase.from("client_derived_status").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("client_id", id).order("start_date", { ascending: false }),
    supabase.from("payments").select("*").eq("client_id", id).order("month", { ascending: false }).limit(24),
    supabase.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false, nullsFirst: false }).limit(24),
    supabase.from("client_extras").select("*, extras(type, identifier)").eq("client_id", id),
    supabase.from("deposits").select("*").eq("client_id", id),
    supabase.from("plans").select("*").eq("is_active", true).order("default_price", { ascending: false }),
  ]);

  const status = (derivedRows as any)?.derived_status ?? client.status;
  const initial = client.name?.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  // Sub activa con 7 días de gracia tras end_date
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);
  const activeSub = (subs ?? []).find(
    (s: any) => s.status === "active" && (!s.end_date || s.end_date >= graceCutoffISO)
  );
  const treatment = client.tax_treatment ?? "standard";
  const daysToEnd = activeSub?.end_date
    ? Math.round(
        (new Date(activeSub.end_date + "T00:00:00Z").getTime() -
          new Date(today + "T00:00:00Z").getTime()) /
          86400000,
      )
    : null;

  return (
    <div>
      <PageHeader
        title=""
        actions={
          <>
            <ContractSubscriptionDialog client={client} plans={plans ?? []} />
            <Link href={`/payments/new?client=${client.id}`}>
              <Button size="md"><Plus className="h-4 w-4" /> Pago</Button>
            </Link>
          </>
        }
      />

      {/* Identity card */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ink-900 text-brand-400 font-display text-lg font-bold">
          {initial || "·"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink-900 truncate">{client.name}</h1>
            <span className="inline-flex items-center gap-2">
              <Dot tone={status === "active" ? "success" : status === "overdue" ? "danger" : status === "pending" ? "warning" : "neutral"} />
              <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge>
            </span>
            {client.scheduled_end_date && status !== "inactive" && (
              <Badge tone="warning">Baja programada {formatDate(client.scheduled_end_date)}</Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
            {client.company_name && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {client.company_name}</span>}
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {cwName}</span>
            {client.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {client.email}</span>}
            {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {client.phone}</span>}
            {client.start_date && <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Alta {formatDate(client.start_date)}</span>}
            {treatment !== "standard" && <span>· {TAX_TREATMENT_LABEL[treatment as keyof typeof TAX_TREATMENT_LABEL]}</span>}
          </div>
        </div>
      </div>

      {/* Suscripción activa destacada */}
      {activeSub ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-medium">Suscripción activa</p>
              <p className="font-display text-[18px] font-semibold text-ink-900">
                {activeSub.plan_name}
                {activeSub.quantity > 1 && <span className="ml-2 text-ink-500">× {activeSub.quantity}</span>}
              </p>
              <p className="text-[12px] text-ink-600">
                Inicio {formatDate(activeSub.start_date)}
                {activeSub.end_date && <> · Fin {formatDate(activeSub.end_date)}</>}
                {activeSub.payment_method && <> · {activeSub.payment_method}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-ink-500">Cuota</p>
              <p className="font-display text-[20px] font-semibold text-ink-900">
                {formatCurrencyGross(activeSub.final_price, activeSub.tax_treatment ?? treatment, activeSub.vat_rate ?? 21)}
              </p>
            </div>
            {daysToEnd !== null && (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-ink-500">Vence</p>
                <p className={`font-display text-[20px] font-semibold ${daysToEnd < 0 ? "text-red-600" : daysToEnd <= 7 ? "text-amber-600" : daysToEnd <= 30 ? "text-ink-900" : "text-ink-700"}`}>
                  {daysToEnd < 0 ? `Hace ${-daysToEnd}d` : daysToEnd === 0 ? "Hoy" : daysToEnd === 1 ? "Mañana" : `${daysToEnd} días`}
                </p>
              </div>
            )}
            <span className="hidden sm:block">
              <AlarmClock className={`h-5 w-5 ${daysToEnd !== null && daysToEnd <= 7 ? "text-amber-500" : "text-ink-300"}`} />
            </span>
          </div>
        </div>
      ) : status === "casual" ? (
        <div className="mb-6 rounded-2xl border border-ink-100 bg-ink-50/50 p-5">
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">Cliente casual</p>
          <p className="text-[14px] text-ink-700">
            Solo ha tenido pases de día/semana, café u otros consumos puntuales — sin suscripción mensual recurrente.
          </p>
        </div>
      ) : status === "inactive" ? (
        <div className="mb-6 rounded-2xl border border-ink-100 bg-ink-50/50 p-5">
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">Sin suscripción activa</p>
          <p className="text-[14px] text-ink-700">
            Cliente dado de baja. Tuvo plan recurrente que ya caducó.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Suscripciones</CardTitle>
              <ContractSubscriptionDialog
                client={client}
                plans={plans ?? []}
                trigger={<button className="text-[12px] font-medium text-ink-700 hover:text-ink-900">+ Añadir</button>}
              />
            </CardHeader>
            <CardBody className="pt-0">
              {!subs || subs.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">Aún no tiene suscripciones.</p>
              ) : (
                <Table>
                  <THead><TR><TH>Plan</TH><TH>Cant.</TH><TH>Precio (con IVA)</TH><TH>Inicio</TH><TH>Fin</TH><TH>Estado</TH><TH></TH></TR></THead>
                  <TBody>
                    {subs.map((s: any) => (
                      <TR key={s.id}>
                        <TD className="font-medium">
                          {s.plan_name}
                          {s.notes && <p className="text-[11px] text-ink-500 font-normal">{s.notes}</p>}
                        </TD>
                        <TD>{s.quantity > 1 ? <Badge tone="brand">{s.quantity}×</Badge> : <span className="text-ink-400">—</span>}</TD>
                        <TD>
                          <span className="font-medium">{formatCurrencyGross(s.final_price, s.tax_treatment ?? treatment, s.vat_rate ?? 21)}</span>
                          <span className="ml-2 text-[11px] text-ink-500">neto {formatCurrency(s.final_price)}</span>
                        </TD>
                        <TD>{formatDate(s.start_date)}</TD>
                        <TD>{formatDate(s.end_date)}</TD>
                        <TD><Badge tone={s.status === "active" ? "success" : s.status === "cancelled" ? "danger" : "muted"}>{s.status}</Badge></TD>
                        <TD className="text-right">
                          <EditSubscriptionButton subscription={s} isAdmin={profile.role === "super_admin"} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pagos</CardTitle>
              <Link href={`/payments/new?client=${client.id}`} className="text-[12px] font-medium text-ink-700 hover:text-ink-900">+ Añadir</Link>
            </CardHeader>
            <CardBody className="pt-0">
              {!payments || payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">Sin pagos registrados.</p>
              ) : (
                <Table>
                  <THead><TR><TH>Mes</TH><TH>Concepto</TH><TH>Esperado</TH><TH>Pagado</TH><TH>Estado</TH></TR></THead>
                  <TBody>
                    {payments.map((p: any) => (
                      <TR key={p.id}>
                        <TD>{formatDate(p.month)}</TD>
                        <TD className="text-[12px]">{p.concept ?? "—"}</TD>
                        <TD>{formatCurrency(p.expected_amount)}</TD>
                        <TD>{formatCurrency(p.paid_amount)}</TD>
                        <TD><Badge tone={tonePayment(p.status)}>{PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]}</Badge></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Facturas</CardTitle></CardHeader>
            <CardBody className="pt-0">
              {!invoices || invoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">Sin facturas.</p>
              ) : (
                <Table>
                  <THead><TR><TH>Nº</TH><TH>Mes</TH><TH>Total</TH><TH>Estado</TH><TH>Emisión</TH></TR></THead>
                  <TBody>
                    {invoices.map((i: any) => (
                      <TR key={i.id}>
                        <TD className="font-mono text-[12px]">{i.invoice_number ?? "—"}</TD>
                        <TD>{formatDate(i.month)}</TD>
                        <TD>{formatCurrency(i.total_amount)}</TD>
                        <TD>
                          <Badge tone={i.status === "to_issue" ? "warning" : "success"}>
                            {i.status === "to_issue" ? "No emitida" : "Emitida"}
                          </Badge>
                        </TD>
                        <TD>{formatDate(i.issue_date)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <ScheduleBajaPanel client={client} canRevert={profile.role === "super_admin" || profile.role === "manager"} />
          <ClientEditPanel client={client} coworkings={coworkings} />

          <Card>
            <CardHeader><CardTitle>Otros alquileres</CardTitle></CardHeader>
            <CardBody className="pt-0">
              {!extras || extras.length === 0 ? (
                <p className="py-3 text-center text-sm text-ink-500">Sin alquileres.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {extras.map((e: any) => (
                    <li key={e.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {EXTRA_TYPE_LABEL[e.extras?.type as keyof typeof EXTRA_TYPE_LABEL]} · {e.extras?.identifier}
                        </p>
                        <p className="text-[11px] text-ink-500">desde {formatDate(e.start_date)}</p>
                      </div>
                      <span className="text-sm font-medium text-ink-900">{formatCurrency(e.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {(deposits ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Fianza</CardTitle></CardHeader>
              <CardBody className="pt-0">
                {(deposits ?? []).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">{d.received ? "Entregada" : "Pendiente"}</span>
                    <span className="font-medium">{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function tonePayment(s: string): any {
  return { paid: "success", partial: "warning", overdue: "danger", pending: "info", cancelled: "muted" }[s] ?? "neutral";
}
