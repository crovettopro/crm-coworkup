import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { ObjectiveCard } from "@/components/objective-card";
import { formatCurrency, formatDate, currentMonthString, monthRange, grossPrice } from "@/lib/utils";
import {
  Wallet, AlertTriangle, ArrowUpRight, Wrench, ListChecks, Activity, Building2, BarChart3, Trophy,
} from "lucide-react";
import { SalesChart } from "@/components/sales-chart";

// SSR con cache server-side de 60s — el ARR/MRR/ventas-12m no cambia segundo a segundo
// y reducir la carga de queries pesadas mejora notablemente la percepción de velocidad.
export const revalidate = 60;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; month?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw);
  const month = params.month ?? currentMonthString();
  const { start, end, label } = monthRange(month);
  const today = new Date().toISOString().slice(0, 10);
  const isGlobal = cwIds.length > 1;
  const singleCwId = !isGlobal ? cwIds[0] : null;
  const monthYear = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));

  const supabase = await createClient();

  const currentYear = new Date().getFullYear();
  const arrStartISO = `${currentYear}-01-01`;
  const arrEndISO = `${currentYear + 1}-01-01`;

  const chartStart = new Date();
  chartStart.setMonth(chartStart.getMonth() - 11);
  chartStart.setDate(1);
  const chartStartISO = chartStart.toISOString().slice(0, 10);

  const [
    cwSummary, subsByPlanRows, monthPayments, openIncidents, todayPasses, objective, arrAgg, chartAgg, topAgg,
  ] = await Promise.all([
    // 1 query con MRR/coworkers/asientos/ocupación pre-calculados (MV)
    supabase.from("dashboard_cw_summary_mv").select("*").in("coworking_id", cwIds),
    // Subs activas por plan (MV)
    supabase.from("dashboard_subs_by_plan_mv").select("plan_name, count").in("coworking_id", cwIds),
    supabase
      .from("payments")
      .select("expected_amount, paid_amount, status, expected_payment_date, client_id, clients(name)")
      .in("coworking_id", cwIds)
      .gte("month", start).lt("month", end),
    supabase
      .from("incidents")
      .select("id, title, priority, status, created_date")
      .in("coworking_id", cwIds)
      .in("status", ["open", "in_progress", "waiting_provider"])
      .order("created_date", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("concept, paid_amount, clients(name)")
      .in("coworking_id", cwIds)
      .eq("paid_at", today)
      .or("concept.ilike.%día%,concept.ilike.%semana%,concept.ilike.%pase%"),
    singleCwId
      ? supabase
          .from("monthly_objectives")
          .select("target_amount")
          .eq("coworking_id", singleCwId)
          .eq("year", monthYear)
          .eq("month", monthNum)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("payments")
      .select("paid_amount")
      .in("coworking_id", cwIds)
      .eq("status", "paid")
      .gte("paid_at", arrStartISO).lt("paid_at", arrEndISO),
    supabase
      .from("monthly_sales_view")
      .select("month_key, total")
      .in("coworking_id", cwIds)
      .gte("month_start", chartStartISO),
    supabase
      .from("client_last_12m_revenue")
      .select("client_id, name, total_12m")
      .in("coworking_id", cwIds)
      .gt("total_12m", 0)
      .order("total_12m", { ascending: false })
      .limit(6),
  ]);

  // Agregados pre-calculados en la MV — sumamos por todos los coworkings visibles
  const summaryRows = ((cwSummary as any).data ?? []) as any[];
  const coworkers = summaryRows.reduce((a, r) => a + Number(r.coworkers ?? 0), 0);
  const occupiedSeats = summaryRows.reduce((a, r) => a + Number(r.occupied_seats ?? 0), 0);
  const arrGross = ((arrAgg as any).data ?? []).reduce((a: number, p: any) => a + Number(p.paid_amount ?? 0), 0);

  const expectedGross = (monthPayments.data ?? []).reduce((a: number, p: any) => a + Number(p.expected_amount ?? 0), 0);
  const collectedGross = (monthPayments.data ?? []).filter((p: any) => p.status === "paid" || p.status === "partial")
    .reduce((a: number, p: any) => a + Number(p.paid_amount ?? 0), 0);
  const overdue = (monthPayments.data ?? []).filter((p: any) =>
    p.status === "overdue" || (p.status === "pending" && p.expected_payment_date && p.expected_payment_date < today)
  );
  const overdueAmount = overdue.reduce((a: number, p: any) => a + (Number(p.expected_amount ?? 0) - Number(p.paid_amount ?? 0)), 0);

  // === Sales chart (12 meses) ===
  const MONTH_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const chartByMonth = new Map<string, number>();
  const monthLabels: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthLabels.push({ key, label: MONTH_ES[d.getMonth()] });
    chartByMonth.set(key, 0);
  }
  for (const row of ((chartAgg.data ?? []) as any[])) {
    const key = row.month_key as string;
    if (chartByMonth.has(key)) chartByMonth.set(key, (chartByMonth.get(key) ?? 0) + Number(row.total ?? 0));
  }
  const chartPoints = monthLabels.map((m) => ({ month: m.key, label: m.label, value: chartByMonth.get(m.key) ?? 0 }));

  const topClients = ((topAgg.data ?? []) as any[]).map((r) => ({
    clientId: r.client_id as string,
    name: r.name as string,
    total: Number(r.total_12m ?? 0),
  }));

  // Subs by plan (MV — ya agregada por coworking)
  const byPlan = new Map<string, number>();
  for (const r of ((subsByPlanRows as any).data ?? []) as any[]) {
    byPlan.set(r.plan_name, (byPlan.get(r.plan_name) ?? 0) + Number(r.count ?? 0));
  }
  const subsByPlan = Array.from(byPlan.entries()).sort((a, b) => b[1] - a[1]);
  const todayPassesList = (todayPasses.data ?? []);

  const totalCapacity = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.total_capacity ?? 0), 0);
  const occRatio = totalCapacity > 0 ? occupiedSeats / totalCapacity : null;
  const occPct = occRatio !== null ? Math.round(occRatio * 100) : null;

  const cwLabel = isGlobal
    ? "todos los coworkings"
    : coworkings.find(c => c.id === cwIds[0])?.name ?? "";

  return (
    <div>
      <PageHeader title="Resumen" subtitle={`${label} · ${cwLabel} · cifras con IVA`} />

      {/* KPI grid horizontal */}
      <KpiGrid className="mb-4">
        <Kpi
          accent
          icon={<ArrowUpRight className="h-3 w-3" />}
          label={`ARR ${currentYear} (YTD)`}
          value={formatCurrency(arrGross)}
        />
        <Kpi
          icon={<Wallet className="h-3 w-3" />}
          label="Cobrado este mes"
          value={formatCurrency(collectedGross)}
          hint={`de ${formatCurrency(expectedGross)} previstos`}
        />
        <Kpi
          icon={<AlertTriangle className="h-3 w-3" />}
          label="Impagos vencidos"
          value={formatCurrency(overdueAmount)}
          hint={`${overdue.length} ${overdue.length === 1 ? "pago" : "pagos"}`}
          valueClassName="text-red-700"
        />
        <Kpi
          icon={<Wrench className="h-3 w-3" />}
          label="Incidencias abiertas"
          value={openIncidents.data?.length ?? 0}
        />
      </KpiGrid>

      {/* Objetivo + Ocupación + Pases hoy */}
      <div className="grid grid-cols-1 gap-4 mb-4 lg:[grid-template-columns:1.4fr_1fr_1fr]">
        <ObjectiveCard
          coworkingId={singleCwId}
          isGlobal={isGlobal}
          year={monthYear}
          month={monthNum}
          monthLabel={label}
          initialTarget={(objective as any)?.data?.target_amount ?? null}
          collected={collectedGross}
          expected={expectedGross}
          canEdit={profile.role === "super_admin" || profile.role === "manager"}
        />

        <div className="rounded-md border border-ink-200 bg-white px-[18px] py-[14px]">
          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-900 mb-3">
            <Building2 className="h-3.5 w-3.5 text-ink-400" /> Ocupación
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-semibold tracking-tight tabular text-ink-950">
              {occPct !== null ? `${occPct}%` : "—"}
            </span>
            <span className="text-[12px] text-ink-500">
              {totalCapacity ? `${coworkers} coworkers · ${totalCapacity} plazas` : "Configura capacidad"}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
            <div
              className={"h-full rounded-full " + ((occRatio ?? 0) > 1 ? "bg-amber-500" : "bg-ink-950")}
              style={{ width: `${Math.min(100, occPct ?? 0)}%` }}
            />
          </div>
          <div className="mt-2.5 text-[11.5px] text-ink-500">
            {(occRatio ?? 0) > 1 ? "Sobreaforo según ponderación" : "Plazas equivalentes ponderadas"}
          </div>
        </div>

        <div className="rounded-md border border-ink-200 bg-white px-[18px] py-[14px]">
          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-900 mb-3">
            <Activity className="h-3.5 w-3.5 text-ink-400" /> Pases hoy
          </div>
          <div className="text-[26px] font-semibold tracking-tight tabular text-ink-950">{todayPassesList.length}</div>
          <div className="text-[12px] text-ink-500 mb-2.5">Pases puntuales activos</div>
          {todayPassesList.length > 0 && (
            <div className="border-t border-ink-200 pt-2">
              {todayPassesList.slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-0.5 text-[12px]">
                  <span className="text-ink-700 truncate">{p.clients?.name ?? p.concept ?? "—"}</span>
                  <span className="text-ink-950 font-medium tabular ml-2 shrink-0">
                    {formatCurrency(grossPrice(p.paid_amount, "standard", 21))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales chart + Top clientes */}
      <div className="grid grid-cols-1 gap-4 mb-4 lg:[grid-template-columns:2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle><BarChart3 className="h-3.5 w-3.5 text-ink-400" /> Ventas últimos 12 meses</CardTitle>
            <Link href="/payments?range=all" className="text-[12px] text-ink-500 hover:text-ink-900">Ver pagos →</Link>
          </CardHeader>
          <CardBody>
            <SalesChart points={chartPoints} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><Trophy className="h-3.5 w-3.5 text-ink-400" /> Top clientes (12m)</CardTitle>
          </CardHeader>
          <CardBody className="py-1.5">
            {topClients.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-500">Sin facturación</p>
            ) : (
              <ul>
                {topClients.map((c, i) => (
                  <li
                    key={c.clientId}
                    className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-ink-400 w-4">{String(i + 1).padStart(2, "0")}</span>
                      <Avatar name={c.name} size="sm" variant={i === 0 ? "gold" : "default"} />
                      <Link href={`/clients/${c.clientId}`} className="text-[13px] font-medium text-ink-900 hover:underline truncate">
                        {c.name}
                      </Link>
                    </div>
                    <span className="text-[13px] font-medium text-ink-950 tabular ml-2 shrink-0">{formatCurrency(c.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Subs by plan + day passes detail */}
      <div className="grid grid-cols-1 gap-4 mb-4 lg:[grid-template-columns:2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle><ListChecks className="h-3.5 w-3.5 text-ink-400" /> Suscripciones activas por tipo</CardTitle>
            <Link href="/subscriptions" className="text-[12px] text-ink-500 hover:text-ink-900">Catálogo →</Link>
          </CardHeader>
          <CardBody>
            {subsByPlan.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-500">Sin suscripciones activas</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subsByPlan.map(([plan, count]) => (
                  <div key={plan} className="rounded border border-ink-200 px-3 py-2.5">
                    <p className="text-[10.5px] uppercase tracking-[0.05em] font-medium text-ink-500">{plan}</p>
                    <p className="text-[22px] font-semibold tracking-tight tabular text-ink-950 mt-1">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><Activity className="h-3.5 w-3.5 text-ink-400" /> Detalle pases hoy</CardTitle>
          </CardHeader>
          <CardBody className="py-1.5">
            {todayPassesList.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-500">Ningún pase activo hoy</p>
            ) : (
              <ul>
                {todayPassesList.map((p: any, i: number) => (
                  <li
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={p.clients?.name ?? "—"} size="sm" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ink-900 truncate">{p.clients?.name ?? "—"}</div>
                        <div className="text-[11px] text-ink-500 truncate">{p.concept}</div>
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-ink-950 tabular shrink-0">
                      {formatCurrency(grossPrice(p.paid_amount, "standard", 21))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Two columns: impagos + incidencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pendientes de cobro</CardTitle>
            <Link href="/payments" className="text-[12px] text-ink-500 hover:text-ink-900">Ver todos →</Link>
          </CardHeader>
          <CardBody className="py-1.5">
            {overdue.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-500">Ningún impago — todo al día 🎉</p>
            ) : (
              <ul>
                {overdue.slice(0, 6).map((p: any, i: number) => (
                  <li
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge tone="danger">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Vencido
                      </Badge>
                      <Link href={`/clients/${p.client_id}`} className="text-[13px] font-medium text-ink-900 hover:underline truncate">
                        {p.clients?.name ?? "—"}
                      </Link>
                      <span className="text-[11.5px] text-ink-500 shrink-0">vence {formatDate(p.expected_payment_date)}</span>
                    </div>
                    <span className="text-[13px] font-medium text-ink-950 tabular shrink-0 ml-2">
                      {formatCurrency(Number(p.expected_amount) - Number(p.paid_amount ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidencias abiertas</CardTitle>
            <Link href="/incidents" className="text-[12px] text-ink-500 hover:text-ink-900">Ver todas →</Link>
          </CardHeader>
          <CardBody className="py-1.5">
            {(openIncidents.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-500">Sin incidencias abiertas</p>
            ) : (
              <ul>
                {(openIncidents.data ?? []).map((i: any) => {
                  const tone = i.priority === "urgent" || i.priority === "high" ? "danger" : i.priority === "medium" ? "warning" : "neutral";
                  const dotClass = tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-ink-400";
                  return (
                    <li
                      key={i.id}
                      className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge tone={tone as any}>
                          <span className={"h-1.5 w-1.5 rounded-full " + dotClass} />
                          {i.priority}
                        </Badge>
                        <span className="text-[13px] text-ink-900 truncate">{i.title}</span>
                      </div>
                      <Badge tone="neutral">{i.status.replace("_", " ")}</Badge>
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
