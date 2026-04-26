import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { ObjectiveCard } from "@/components/objective-card";
import { formatCurrency, formatDate, currentMonthString, monthRange, grossPrice } from "@/lib/utils";
import { Wallet, AlertTriangle, ArrowUpRight, Wrench, ListChecks, Activity, Building2, BarChart3, Trophy } from "lucide-react";
import { SalesChart } from "@/components/sales-chart";

export const dynamic = "force-dynamic";

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

  // ARR = facturado durante el año actual (YTD)
  const currentYear = new Date().getFullYear();
  const arrStartISO = `${currentYear}-01-01`;
  const arrEndISO = `${currentYear + 1}-01-01`;

  // Ventana 12 meses para gráfica de ventas
  const chartStart = new Date();
  chartStart.setMonth(chartStart.getMonth() - 11);
  chartStart.setDate(1);
  const chartStartISO = chartStart.toISOString().slice(0, 10);

  const [activeSubs, monthPayments, openIncidents, todayPasses, objective, arrAgg] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_name, plan_id, final_price, vat_rate, tax_treatment, quantity, client_id, end_date")
      .in("coworking_id", cwIds)
      .eq("status", "active"),
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
    // Pases activos hoy = pagos puntuales del día con concept de día/semana/medio-día
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
    // ARR = sumamos lo cobrado en el año actual (YTD)
    supabase
      .from("payments")
      .select("paid_amount")
      .in("coworking_id", cwIds)
      .eq("status", "paid")
      .gte("paid_at", arrStartISO).lt("paid_at", arrEndISO),
  ]);

  // Ventana 12 meses + Top clientes — desde vistas SQL agregadas (no hay límite de 1000 rows)
  const [chartAgg, topAgg] = await Promise.all([
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
      .limit(5),
  ]);

  // Subs activas (con 7 días de gracia desde end_date). Oficina Virtual SÍ factura,
  // solo no ocupa plaza física.
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);
  const activeSubsList = (activeSubs.data ?? []).filter((s: any) => !s.end_date || s.end_date >= graceCutoffISO);
  const isVirtualOffice = (s: any) => /oficina\s+virtual/i.test(s.plan_name ?? "");
  const virtualOfficeSubs = activeSubsList.filter(isVirtualOffice);

  // Peso de ocupación por tipo de plan (% de plaza que consume cada asiento):
  //   Fijo 100% · Flexible 80% · 20 horas 60% · 10 horas 10%
  //   Oficina (mensual) 100% · Tardes y Oficina Virtual 0% (no compiten por plaza diurna)
  function occupancyWeight(planName: string | null): number {
    const n = (planName ?? "").toLowerCase().trim();
    if (/oficina\s+virtual/.test(n)) return 0;
    if (/tardes/.test(n)) return 0;
    if (/fijo/.test(n)) return 1.0;
    if (/^oficina/.test(n)) return 1.0;
    if (/flexible/.test(n)) return 0.8;
    if (/20\s*horas/.test(n)) return 0.6;
    if (/10\s*horas/.test(n)) return 0.1;
    return 0;
  }

  // Asientos físicos ponderados (excluye Oficina Virtual de hecho ya con weight=0)
  const occupiedSeats = activeSubsList.reduce(
    (a: number, s: any) => a + occupancyWeight(s.plan_name) * (Number(s.quantity) || 1),
    0,
  );
  // Headcount sin ponderar (informativo) — incluye virtuales
  const activeSeats = activeSubsList.reduce((a: number, s: any) => a + (Number(s.quantity) || 1), 0);
  // Coworkers reales = personas que asisten físicamente (todo menos oficina virtual)
  const coworkers = activeSubsList
    .filter((s: any) => !isVirtualOffice(s))
    .reduce((a: number, s: any) => a + (Number(s.quantity) || 1), 0);
  // MRR cuenta TODAS las suscripciones activas (incluye oficina virtual)
  const mrrGross = activeSubsList.reduce((a: number, s: any) =>
    a + grossPrice(s.final_price, s.tax_treatment, s.vat_rate ?? 21) * (Number(s.quantity) || 1), 0);
  const arrGross = ((arrAgg as any).data ?? []).reduce((a: number, p: any) => a + Number(p.paid_amount ?? 0), 0);

  // Payment amounts already stored as gross (user enters "con IVA" in the form)
  const expectedGross = (monthPayments.data ?? []).reduce((a: number, p: any) => a + Number(p.expected_amount ?? 0), 0);
  const collectedGross = (monthPayments.data ?? []).filter((p: any) => p.status === "paid" || p.status === "partial")
    .reduce((a: number, p: any) => a + Number(p.paid_amount ?? 0), 0);
  const overdue = (monthPayments.data ?? []).filter((p: any) =>
    p.status === "overdue" || (p.status === "pending" && p.expected_payment_date && p.expected_payment_date < today)
  );
  const overdueAmount = overdue.reduce((a: number, p: any) => a + (Number(p.expected_amount ?? 0) - Number(p.paid_amount ?? 0)), 0);

  // === Sales chart (12 meses) ===
  // Pre-fill 12 buckets en orden, después acumular desde la vista (puede haber varias rows por
  // mismo mes si hay varios coworkings en el filtro — sumamos).
  // Uso array fijo de meses (no toLocaleDateString) para evitar hydration mismatches por
  // diferencias entre la implementación de Intl de Node y la del navegador.
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

  // === Top clientes últimos 12 meses ===
  const topClients = ((topAgg.data ?? []) as any[]).map((r) => ({
    clientId: r.client_id as string,
    name: r.name as string,
    total: Number(r.total_12m ?? 0),
  }));

  // Subs by plan name (suma asientos para reflejar el tamaño real)
  const byPlan = new Map<string, number>();
  for (const s of activeSubsList) byPlan.set(s.plan_name, (byPlan.get(s.plan_name) ?? 0) + (Number(s.quantity) || 1));
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

      {/* Top row: 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label={`ARR ${currentYear} (YTD)`}
          value={formatCurrency(arrGross)}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <MetricCard label="Cobrado este mes" value={formatCurrency(collectedGross)} hint={`de ${formatCurrency(expectedGross)} previstos`} tone="success" icon={<Wallet className="h-4 w-4" />} />
        <MetricCard label="Impagos vencidos" value={formatCurrency(overdueAmount)} hint={`${overdue.length} ${overdue.length === 1 ? "pago" : "pagos"}`} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricCard label="Incidencias abiertas" value={openIncidents.data?.length ?? 0} icon={<Wrench className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
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
        <MetricCard
          label="Ocupación"
          value={occPct !== null ? `${occPct}%` : "—"}
          hint={totalCapacity ? `${coworkers} coworkers / ${totalCapacity} plazas físicas` : "Configura capacidad"}
          tone={occRatio !== null && occRatio > 1 ? "warning" : "default"}
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard label="Pases activos hoy" value={todayPassesList.length} hint="Pases de día / semana en uso" icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Sales chart + Top clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-ink-400" /> Ventas últimos 12 meses</CardTitle>
            <Link href="/payments?range=all" className="text-[12px] text-ink-500 hover:text-ink-900">Ver pagos →</Link>
          </CardHeader>
          <CardBody className="pt-0">
            <SalesChart points={chartPoints} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-ink-400" /> Top clientes (12m)</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {topClients.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">Sin facturación</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {topClients.map((c, i) => (
                  <li key={c.clientId} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono text-ink-400 w-4">{i + 1}</span>
                      <Link href={`/clients/${c.clientId}`} className="text-[13px] font-medium text-ink-900 hover:underline truncate">
                        {c.name}
                      </Link>
                    </div>
                    <span className="text-[12px] font-medium text-ink-900 ml-2 shrink-0">{formatCurrency(c.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Subs by plan + day passes detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-ink-400" /> Suscripciones activas por tipo</CardTitle>
            <Link href="/subscriptions" className="text-[12px] text-ink-500 hover:text-ink-900">Catálogo →</Link>
          </CardHeader>
          <CardBody className="pt-0">
            {subsByPlan.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">Sin suscripciones activas</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subsByPlan.map(([plan, count]) => (
                  <div key={plan} className="rounded-xl border border-ink-100 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-ink-500">{plan}</p>
                    <p className="font-display text-[20px] font-semibold text-ink-900 mt-0.5">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4 text-ink-400" /> Detalle pases hoy</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            {todayPassesList.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">Ningún pase activo hoy</p>
            ) : (
              <ul className="space-y-1.5">
                {todayPassesList.map((p: any, i) => (
                  <li key={i} className="text-[12px] text-ink-700 flex items-center justify-between">
                    <span>{p.plan_name}</span>
                    <span className="font-medium">{formatCurrency(grossPrice(p.final_price, p.tax_treatment, p.vat_rate ?? 21))}</span>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pendientes de cobro</CardTitle>
            <Link href="/payments" className="text-[12px] text-ink-500 hover:text-ink-900">Ver todos →</Link>
          </CardHeader>
          <CardBody className="pt-0">
            {overdue.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">Ningún impago — todo al día 🎉</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {overdue.slice(0, 6).map((p: any, i: number) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <Dot tone="danger" />
                      <Link href={`/clients/${p.client_id}`} className="text-sm font-medium text-ink-900 hover:underline">
                        {p.clients?.name ?? "—"}
                      </Link>
                      <span className="text-[12px] text-ink-500">vence {formatDate(p.expected_payment_date)}</span>
                    </div>
                    <span className="text-sm font-medium text-ink-900">{formatCurrency(Number(p.expected_amount) - Number(p.paid_amount ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Incidencias abiertas</CardTitle>
            <Link href="/incidents" className="text-[12px] text-ink-500 hover:text-ink-900">Ver todas →</Link>
          </CardHeader>
          <CardBody className="pt-0">
            {(openIncidents.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">Sin incidencias abiertas</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {(openIncidents.data ?? []).map((i: any) => (
                  <li key={i.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <Dot tone={i.priority === "urgent" || i.priority === "high" ? "danger" : i.priority === "medium" ? "warning" : "neutral"} />
                      <span className="text-sm font-medium text-ink-900">{i.title}</span>
                    </div>
                    <Badge tone="muted">{i.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
