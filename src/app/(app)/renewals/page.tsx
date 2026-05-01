import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrencyGross, formatDate } from "@/lib/utils";
import { AlertTriangle, AlarmClock } from "lucide-react";

export const dynamic = "force-dynamic";

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

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, plan_name, final_price, vat_rate, tax_treatment, start_date, end_date, quantity, client_id, client:clients(id, name, status, scheduled_end_date)")
    .in("coworking_id", cwIds)
    .eq("status", "active")
    .not("end_date", "is", null)
    .order("end_date");

  // Mapa: client_id → max(end_date) entre sus subs activas. Sirve para detectar cambio de plan:
  // si un cliente tiene una sub vencida pero también otra posterior, no es renovación pendiente
  // sino que se cambió de plan.
  const latestEndByClient = new Map<string, string>();
  for (const s of (subs ?? []) as any[]) {
    if (!s.end_date) continue;
    const prev = latestEndByClient.get(s.client_id);
    if (!prev || s.end_date > prev) latestEndByClient.set(s.client_id, s.end_date);
  }

  const upcoming = (subs ?? []).filter((s: any) => {
    if (!s.end_date) return false;
    if (s.client?.status === "inactive") return false;
    if (s.end_date < todayISO || s.end_date > horizonISO) return false;
    // Si el cliente ya tiene una sub posterior (cambio de plan), no la mostramos como próxima
    return latestEndByClient.get(s.client_id) === s.end_date;
  });

  const expired = (subs ?? []).filter((s: any) => {
    if (!s.end_date) return false;
    if (s.client?.status === "inactive") return false;
    if (s.end_date >= todayISO || s.end_date < expiredCutoffISO) return false;
    // Excluir si hay otra sub posterior del mismo cliente (cambio de plan, no pendiente de renovar)
    return latestEndByClient.get(s.client_id) === s.end_date;
  });

  return (
    <div>
      <PageHeader
        title="Vencimientos"
        subtitle="Próximas a vencer (30 días) y vencidas en los últimos 7 días"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <AlarmClock className="h-3.5 w-3.5 text-amber-500" /> Próximas (30d)
            </CardTitle>
            <Badge tone="warning">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {upcoming.length}
            </Badge>
          </CardHeader>
          <CardBody className="py-1.5">
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-500">Sin vencimientos en los próximos 30 días</p>
            ) : (
              <ul>
                {upcoming.map((s: any) => {
                  const days = daysBetweenISO(todayISO, s.end_date);
                  const label = days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;
                  const tone =
                    days <= 3 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-ink-700";
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={s.client?.name ?? "—"} size="sm" />
                        <div className="min-w-0">
                          <Link
                            href={`/clients/${s.client_id}`}
                            className="text-[13px] font-medium text-ink-950 hover:underline"
                          >
                            {s.client?.name ?? "—"}
                          </Link>
                          <div className="text-[11px] text-ink-500">
                            {s.plan_name}
                            {s.quantity > 1 && <span> · × {s.quantity}</span>}
                            {" · "}
                            <span className="tabular">
                              {formatCurrencyGross(s.final_price, s.tax_treatment, s.vat_rate ?? 21)}
                            </span>
                          </div>
                          {s.client?.scheduled_end_date && (
                            <div className="text-[11px] text-amber-600">
                              Baja programada {formatDate(s.client.scheduled_end_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[13px] font-medium tabular text-ink-950">{formatDate(s.end_date)}</div>
                        <div className={"text-[11px] " + tone}>{label}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Vencidas (últimos 7d)
            </CardTitle>
            <Badge tone="danger">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {expired.length}
            </Badge>
          </CardHeader>
          <CardBody className="py-1.5">
            {expired.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] text-ink-700">Sin vencidas pendientes de renovar</p>
                <p className="mt-1 text-[11.5px] text-ink-500">
                  Aparecerán aquí cuando una sub caduque sin renovarse —
                  el cliente sigue contando para ocupación durante esos 7 días.
                </p>
              </div>
            ) : (
              <ul>
                {expired.map((s: any) => {
                  const days = daysBetweenISO(s.end_date, todayISO);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={s.client?.name ?? "—"} size="sm" />
                        <div className="min-w-0">
                          <Link
                            href={`/clients/${s.client_id}`}
                            className="text-[13px] font-medium text-ink-950 hover:underline"
                          >
                            {s.client?.name ?? "—"}
                          </Link>
                          <div className="text-[11px] text-ink-500">
                            {s.plan_name}
                            {s.quantity > 1 && <span> · × {s.quantity}</span>}
                            {" · "}
                            <span className="tabular">
                              {formatCurrencyGross(s.final_price, s.tax_treatment, s.vat_rate ?? 21)}
                            </span>
                          </div>
                          {s.client?.scheduled_end_date && (
                            <div className="text-[11px] text-amber-600">
                              Baja programada {formatDate(s.client.scheduled_end_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[13px] font-medium tabular text-red-600">{formatDate(s.end_date)}</div>
                        <div className="text-[11px] text-red-600">hace {days} días</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
