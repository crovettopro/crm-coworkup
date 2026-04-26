import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge, Dot } from "@/components/ui/badge";
import { formatCurrencyGross, formatDate } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

// Días naturales entre dos fechas ISO (YYYY-MM-DD), comparando en UTC midnight
// para que "hoy" siempre dé 0 y "mañana" siempre dé 1, sin sufrir desfases por zona horaria.
function daysBetweenISO(fromISO: string, toISO: string) {
  const from = new Date(fromISO + "T00:00:00Z").getTime();
  const to = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86400000);
}

export default async function RenewalsPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, null, { allowAll: false });

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);
  const horizonISO = horizon.toISOString().slice(0, 10);
  const expiredCutoff = new Date(today);
  expiredCutoff.setDate(expiredCutoff.getDate() - 7);
  const expiredCutoffISO = expiredCutoff.toISOString().slice(0, 10);

  const supabase = await createClient();

  // Active subs with end_date (i.e. not perpetual / not pase de día consumido)
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, plan_name, final_price, vat_rate, tax_treatment, start_date, end_date, quantity, client_id, client:clients(id, name, status, scheduled_end_date)")
    .in("coworking_id", cwIds)
    .eq("status", "active")
    .not("end_date", "is", null)
    .order("end_date");

  const upcoming = (subs ?? []).filter((s: any) => {
    if (!s.end_date) return false;
    return s.end_date >= todayISO && s.end_date <= horizonISO && (s.client?.status !== "inactive");
  });

  // Vencidas: solo las que caducaron en los últimos 7 días (más antiguas se asumen "ya gestionadas").
  const expired = (subs ?? []).filter((s: any) => {
    if (!s.end_date) return false;
    return s.end_date < todayISO && s.end_date >= expiredCutoffISO && (s.client?.status !== "inactive");
  });

  return (
    <div>
      <PageHeader
        title="Vencimientos"
        subtitle="Próximas a vencer (30 días) y vencidas en los últimos 7 días."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <MetricCard label="Vencen en 30 días" value={upcoming.length} hint="Suscripciones activas con fin próximo" tone="warning" icon={<Clock className="h-4 w-4" />} />
        <MetricCard label="Vencidas sin renovar" value={expired.length} hint="Sigue activa pero ya pasó la fecha" tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Vencidas (alert section, shown first) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Vencidas sin renovar
            </CardTitle>
            <Badge tone="danger">{expired.length}</Badge>
          </CardHeader>
          <CardBody className="pt-0">
            {expired.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">Ninguna suscripción vencida sin renovar 🎉</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH><TH>Plan</TH><TH>Importe</TH><TH>Fin</TH><TH>Hace</TH><TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {expired.map((s: any) => {
                    const days = daysBetweenISO(s.end_date, todayISO);
                    return (
                      <TR key={s.id} className="bg-red-50/30">
                        <TD>
                          <Link href={`/clients/${s.client_id}`} className="font-medium hover:underline">
                            {s.client?.name ?? "—"}
                          </Link>
                          {s.client?.scheduled_end_date && (
                            <p className="text-[11px] text-amber-600 mt-0.5">Baja programada {formatDate(s.client.scheduled_end_date)}</p>
                          )}
                        </TD>
                        <TD>
                          {s.quantity > 1 && <span className="text-ink-500">{s.quantity}× </span>}
                          {s.plan_name}
                        </TD>
                        <TD className="font-medium">{formatCurrencyGross(s.final_price, s.tax_treatment, s.vat_rate ?? 21)}</TD>
                        <TD className="text-[12px]">{formatDate(s.end_date)}</TD>
                        <TD>
                          <span className="inline-flex items-center gap-2">
                            <Dot tone="danger" />
                            <span className="text-[12px] font-medium text-red-700">hace {days}d</span>
                          </span>
                        </TD>
                        <TD className="text-right">
                          <Link href={`/clients/${s.client_id}`} className="text-[13px] font-medium text-ink-700 hover:text-ink-900">
                            Renovar →
                          </Link>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Próximos vencimientos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Próximos vencimientos
            </CardTitle>
            <Badge tone="warning">{upcoming.length}</Badge>
          </CardHeader>
          <CardBody className="pt-0">
            {upcoming.length === 0 ? (
              <EmptyState title="Sin vencimientos en los próximos 30 días" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH><TH>Plan</TH><TH>Importe</TH><TH>Vence</TH><TH>En</TH><TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {upcoming.map((s: any) => {
                    const days = daysBetweenISO(todayISO, s.end_date);
                    const tone: "danger" | "warning" | "info" = days <= 3 ? "danger" : days <= 7 ? "warning" : "info";
                    const label = days === 0 ? "hoy" : days === 1 ? "mañana" : `${days}d`;
                    return (
                      <TR key={s.id}>
                        <TD>
                          <Link href={`/clients/${s.client_id}`} className="font-medium hover:underline">
                            {s.client?.name ?? "—"}
                          </Link>
                          {s.client?.scheduled_end_date && (
                            <p className="text-[11px] text-amber-600 mt-0.5">Baja programada {formatDate(s.client.scheduled_end_date)}</p>
                          )}
                        </TD>
                        <TD>
                          {s.quantity > 1 && <span className="text-ink-500">{s.quantity}× </span>}
                          {s.plan_name}
                        </TD>
                        <TD className="font-medium">{formatCurrencyGross(s.final_price, s.tax_treatment, s.vat_rate ?? 21)}</TD>
                        <TD className="text-[12px]">{formatDate(s.end_date)}</TD>
                        <TD>
                          <span className="inline-flex items-center gap-2">
                            <Dot tone={tone} />
                            <span className="text-[12px] font-medium text-ink-700">{label}</span>
                          </span>
                        </TD>
                        <TD className="text-right">
                          <Link href={`/clients/${s.client_id}`} className="text-[13px] font-medium text-ink-700 hover:text-ink-900">
                            Abrir →
                          </Link>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
