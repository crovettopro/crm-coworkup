import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ClientEditPanel } from "./edit-panel";
import { ClientNotesPanel } from "./notes-panel";
import { ScheduleBajaPanel } from "./schedule-baja-panel";
import { ContractSubscriptionDialog } from "@/components/contract-subscription-dialog";
import { EditSubscriptionButton } from "@/components/edit-subscription-dialog";
import {
  Mail, Phone, MapPin, Building2, Calendar, Plus, ListChecks, AlarmClock,
} from "lucide-react";
import { PAYMENT_STATUS_LABEL, EXTRA_TYPE_LABEL, TAX_TREATMENT_LABEL } from "@/lib/types";
import { formatCurrency, formatCurrencyGross, formatDate, grossPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Activo", overdue: "Impago", inactive: "Baja", pending: "Pendiente", casual: "Casual",
};
const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "warning" | "gold"> = {
  active: "success", overdue: "danger", inactive: "neutral", pending: "warning", casual: "gold",
};
const dotBg: Record<string, string> = {
  active: "bg-emerald-500",
  overdue: "bg-red-500",
  inactive: "bg-ink-400",
  pending: "bg-amber-500",
  casual: "bg-brand-500",
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

  const [
    { data: derivedRows },
    { data: subs },
    { data: payments },
    { data: invoices },
    { data: extras },
    { data: deposits },
    { data: plans },
    { data: revenueRow },
  ] = await Promise.all([
    supabase.from("client_derived_status").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("client_id", id).order("start_date", { ascending: false }),
    supabase.from("payments").select("*").eq("client_id", id).order("month", { ascending: false }).limit(24),
    supabase.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false, nullsFirst: false }).limit(24),
    supabase.from("client_extras").select("*, extras(type, identifier)").eq("client_id", id),
    supabase.from("deposits").select("*").eq("client_id", id),
    supabase.from("plans").select("*").eq("is_active", true).order("default_price", { ascending: false }),
    supabase.from("client_last_12m_revenue").select("total_12m").eq("client_id", id).maybeSingle(),
  ]);

  const status = (derivedRows as any)?.derived_status ?? client.status;
  const today = new Date().toISOString().slice(0, 10);
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);
  const activeSub = (subs ?? []).find(
    (s: any) => s.status === "active" && (!s.end_date || s.end_date >= graceCutoffISO),
  );
  const treatment = client.tax_treatment ?? "standard";
  const daysToEnd = activeSub?.end_date
    ? Math.round(
        (new Date(activeSub.end_date + "T00:00:00Z").getTime() -
          new Date(today + "T00:00:00Z").getTime()) /
          86400000,
      )
    : null;

  // Stats
  const totalPaid = (payments ?? []).reduce(
    (a: number, p: any) => (p.status === "paid" || p.status === "partial" ? a + Number(p.paid_amount ?? 0) : a),
    0,
  );
  const last12m = Number((revenueRow as any)?.total_12m ?? 0);
  // MRR mensual: el final_price ya es el TOTAL del plan (no por asiento). Las trimestrales se dividen entre 3.
  const months = Math.max(1, Number(activeSub?.billing_months) || 1);
  const currentMrr = activeSub
    ? grossPrice(activeSub.final_price, activeSub.tax_treatment ?? treatment, activeSub.vat_rate ?? 21) / months
    : 0;

  const tone = STATUS_TONE[status] ?? "neutral";
  const dot = dotBg[status] ?? "bg-ink-400";

  return (
    <div>
      {/* Identity header */}
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-ink-200">
        <div className="flex items-start gap-3.5 min-w-0">
          <Avatar name={client.name} size="xl" variant="dark" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-ink-950 truncate">{client.name}</h1>
              <Badge tone={tone}>
                <span className={"h-1.5 w-1.5 rounded-full " + dot} />
                {STATUS_LABEL[status] ?? status}
              </Badge>
              {client.scheduled_end_date && status !== "inactive" && (
                <Badge tone="warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Baja {formatDate(client.scheduled_end_date)}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-500">
              {client.company_name && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> {client.company_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {cwName}
              </span>
              {client.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </span>
              )}
              {client.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {client.phone}
                </span>
              )}
              {client.start_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Alta {formatDate(client.start_date)}
                </span>
              )}
              {treatment !== "standard" && (
                <span>· {TAX_TREATMENT_LABEL[treatment as keyof typeof TAX_TREATMENT_LABEL]}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ContractSubscriptionDialog client={client} plans={plans ?? []} />
          <Link href={`/payments/new?client=${client.id}`}>
            <Button size="sm" variant="primary">
              <Plus className="h-3.5 w-3.5" /> Pago
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI grid personal */}
      <KpiGrid cols={3} className="mb-4">
        <Kpi label="Total facturado" value={formatCurrency(totalPaid)} hint="histórico (cobrados)" />
        <Kpi label="MRR actual" value={currentMrr > 0 ? formatCurrency(currentMrr) : "—"} hint={activeSub?.plan_name ?? "Sin sub activa"} accent={currentMrr > 0} />
        <Kpi label="Cliente desde" value={client.start_date ? formatDate(client.start_date) : "—"} hint={`Últimos 12m: ${formatCurrency(last12m)}`} />
      </KpiGrid>

      {/* Sub activa destacada o estado vacío */}
      {activeSub ? (
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 px-[18px] py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <ListChecks className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-emerald-700">Suscripción activa</p>
              <p className="text-[15px] font-semibold tracking-tight text-ink-950">
                {activeSub.plan_name}
                {activeSub.quantity > 1 && <span className="ml-2 font-normal text-ink-500">× {activeSub.quantity}</span>}
              </p>
              <p className="text-[12px] text-ink-600">
                Inicio {formatDate(activeSub.start_date)}
                {activeSub.end_date && <> · Fin {formatDate(activeSub.end_date)}</>}
                {activeSub.payment_method && <> · {activeSub.payment_method}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">Cuota</p>
              <p className="text-[18px] font-semibold tabular text-ink-950">
                {formatCurrencyGross(activeSub.final_price, activeSub.tax_treatment ?? treatment, activeSub.vat_rate ?? 21)}
              </p>
            </div>
            {daysToEnd !== null && (
              <div className="text-right">
                <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">Vence</p>
                <p
                  className={
                    "text-[18px] font-semibold tabular " +
                    (daysToEnd < 0
                      ? "text-red-600"
                      : daysToEnd <= 7
                      ? "text-amber-600"
                      : daysToEnd <= 30
                      ? "text-ink-950"
                      : "text-ink-700")
                  }
                >
                  {daysToEnd < 0 ? `Hace ${-daysToEnd}d` : daysToEnd === 0 ? "Hoy" : daysToEnd === 1 ? "Mañana" : `${daysToEnd} días`}
                </p>
              </div>
            )}
            <span className="hidden sm:block">
              <AlarmClock
                className={
                  "h-4 w-4 " +
                  (daysToEnd !== null && daysToEnd <= 7 ? "text-amber-500" : "text-ink-300")
                }
              />
            </span>
          </div>
        </div>
      ) : status === "casual" ? (
        <div className="mb-4 rounded-md border border-ink-200 bg-ink-50/60 px-[18px] py-4">
          <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">Cliente casual</p>
          <p className="text-[13px] text-ink-700">
            Solo ha tenido pases de día/semana, café u otros consumos puntuales — sin suscripción mensual recurrente.
          </p>
        </div>
      ) : status === "inactive" ? (
        <div className="mb-4 rounded-md border border-ink-200 bg-ink-50/60 px-[18px] py-4">
          <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">Sin suscripción activa</p>
          <p className="text-[13px] text-ink-700">Cliente dado de baja. Tuvo plan recurrente que ya caducó.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suscripciones</CardTitle>
              <ContractSubscriptionDialog
                client={client}
                plans={plans ?? []}
                trigger={
                  <button className="text-[12px] font-medium text-ink-500 hover:text-ink-900">
                    + Añadir
                  </button>
                }
              />
            </CardHeader>
            <CardBody className="p-0">
              {!subs || subs.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-500">Aún no tiene suscripciones.</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-ink-100 text-ink-500 text-[11px] uppercase tracking-wider font-medium">
                    <tr>
                      <th className="text-left px-3.5 py-2.5 font-medium border-b border-ink-200">Plan</th>
                      <th className="text-left px-3.5 py-2.5 font-medium border-b border-ink-200">Cant.</th>
                      <th className="text-left px-3.5 py-2.5 font-medium border-b border-ink-200">Precio (con IVA)</th>
                      <th className="text-left px-3.5 py-2.5 font-medium border-b border-ink-200">Inicio</th>
                      <th className="text-left px-3.5 py-2.5 font-medium border-b border-ink-200">Fin</th>
                      <th className="text-left px-3.5 py-2.5 font-medium border-b border-ink-200">Estado</th>
                      <th className="px-3.5 py-2.5 border-b border-ink-200" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200">
                    {subs.map((s: any) => (
                      <tr key={s.id} className="hover:bg-ink-50">
                        <td className="px-3.5 py-2.5 text-ink-950 font-medium align-middle">
                          {s.plan_name}
                          {s.notes && <p className="text-[11px] text-ink-500 font-normal">{s.notes}</p>}
                        </td>
                        <td className="px-3.5 py-2.5 align-middle">
                          {s.quantity > 1 ? (
                            <span className="font-mono text-[12.5px] text-ink-700">× {s.quantity}</span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 align-middle">
                          <span className="font-medium text-ink-950 tabular">
                            {formatCurrencyGross(s.final_price, s.tax_treatment ?? treatment, s.vat_rate ?? 21)}
                          </span>
                          <span className="ml-2 text-[11px] text-ink-500 tabular">
                            neto {formatCurrency(s.final_price)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 align-middle text-ink-500">{formatDate(s.start_date)}</td>
                        <td className="px-3.5 py-2.5 align-middle text-ink-500">{formatDate(s.end_date)}</td>
                        <td className="px-3.5 py-2.5 align-middle">
                          <Badge tone={s.status === "active" ? "success" : s.status === "cancelled" ? "danger" : "neutral"}>
                            <span
                              className={
                                "h-1.5 w-1.5 rounded-full " +
                                (s.status === "active"
                                  ? "bg-emerald-500"
                                  : s.status === "cancelled"
                                  ? "bg-red-500"
                                  : "bg-ink-400")
                              }
                            />
                            {s.status}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-right align-middle">
                          <EditSubscriptionButton subscription={s} isAdmin={profile.role === "super_admin"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pagos</CardTitle>
              <Link href={`/payments/new?client=${client.id}`} className="text-[12px] font-medium text-ink-500 hover:text-ink-900">
                + Añadir
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {!payments || payments.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-500">Sin pagos registrados.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Mes</TH>
                      <TH>Concepto</TH>
                      <TH className="text-right">Esperado</TH>
                      <TH className="text-right">Pagado</TH>
                      <TH>Estado</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {payments.map((p: any) => {
                      const t = tonePayment(p.status);
                      const dotCls =
                        t === "success" ? "bg-emerald-500" :
                        t === "warning" ? "bg-amber-500" :
                        t === "danger" ? "bg-red-500" :
                        t === "info" ? "bg-sky-500" :
                        "bg-ink-400";
                      return (
                        <TR key={p.id}>
                          <TD className="text-ink-500">{formatDate(p.month)}</TD>
                          <TD className="text-[12.5px] text-ink-700">{p.concept ?? "—"}</TD>
                          <TD className="text-right tabular">{formatCurrency(p.expected_amount)}</TD>
                          <TD className="text-right tabular text-ink-950 font-medium">{formatCurrency(p.paid_amount)}</TD>
                          <TD>
                            <Badge tone={t as any}>
                              <span className={"h-1.5 w-1.5 rounded-full " + dotCls} />
                              {PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]}
                            </Badge>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facturas</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {!invoices || invoices.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-500">Sin facturas.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Nº</TH>
                      <TH>Mes</TH>
                      <TH className="text-right">Total</TH>
                      <TH>Estado</TH>
                      <TH>Emisión</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {invoices.map((i: any) => (
                      <TR key={i.id}>
                        <TD className="font-mono text-[12px] text-ink-950">{i.invoice_number ?? "—"}</TD>
                        <TD className="text-ink-500">{formatDate(i.month)}</TD>
                        <TD className="text-right tabular text-ink-950 font-medium">{formatCurrency(i.total_amount)}</TD>
                        <TD>
                          <Badge tone={i.status === "to_issue" ? "warning" : "success"}>
                            <span className={"h-1.5 w-1.5 rounded-full " + (i.status === "to_issue" ? "bg-amber-500" : "bg-emerald-500")} />
                            {i.status === "to_issue" ? "No emitida" : "Emitida"}
                          </Badge>
                        </TD>
                        <TD className="text-ink-500">{formatDate(i.issue_date)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <ClientNotesPanel clientId={client.id} initialNotes={client.notes ?? null} />
          <ScheduleBajaPanel client={client} canRevert={profile.role === "super_admin" || profile.role === "manager"} />
          <ClientEditPanel client={client} coworkings={coworkings} />

          <Card>
            <CardHeader>
              <CardTitle>Otros alquileres</CardTitle>
            </CardHeader>
            <CardBody>
              {!extras || extras.length === 0 ? (
                <p className="py-3 text-center text-[13px] text-ink-500">Sin alquileres.</p>
              ) : (
                <ul className="divide-y divide-ink-200">
                  {extras.map((e: any) => (
                    <li key={e.id} className="py-2.5">
                      <p className="text-[13px] font-medium text-ink-950">
                        {EXTRA_TYPE_LABEL[e.extras?.type as keyof typeof EXTRA_TYPE_LABEL]}{" "}
                        · <span className="font-mono text-ink-700">{e.extras?.identifier}</span>
                      </p>
                      <p className="text-[11px] text-ink-500">desde {formatDate(e.start_date)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {(deposits ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fianza</CardTitle>
              </CardHeader>
              <CardBody>
                {(deposits ?? []).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-600">{d.received ? "Entregada" : "Pendiente"}</span>
                    <span className="font-medium text-ink-950 tabular">{formatCurrency(d.amount)}</span>
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

function tonePayment(s: string): string {
  return ({ paid: "success", partial: "warning", overdue: "danger", pending: "info", cancelled: "neutral" } as any)[s] ?? "neutral";
}
