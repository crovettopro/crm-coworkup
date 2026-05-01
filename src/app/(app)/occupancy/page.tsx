import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";

export const dynamic = "force-dynamic";

export default async function OccupancyPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });

  const supabase = await createClient();
  // Gracia de 7d: una sub recién vencida sigue ocupando hasta que se renueve o el cliente se dé de baja.
  // Mismo criterio que dashboard_cw_summary_mv.
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);

  const [{ data: subs }, { data: rentedExtras }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_name, coworking_id, status, end_date, client_id, quantity")
      .in("coworking_id", cwIds)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${graceCutoffISO}`),
    supabase.from("client_extras").select("id, coworking_id, extras(type)").in("coworking_id", cwIds).eq("status", "rented"),
  ]);

  const totalCapacity = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.total_capacity ?? 0), 0);
  const totalLockers = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.lockers_capacity ?? 0), 0);
  const totalScreens = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.screens_capacity ?? 0), 0);
  const totalOffices = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.offices_capacity ?? 0), 0);
  // Clientes únicos con suscripción válida (incluye los que están dentro de la gracia de 7d)
  const active = new Set((subs ?? []).map((s: any) => s.client_id)).size;
  const lockersUsed = (rentedExtras ?? []).filter((e: any) => e.extras?.type === "locker").length;
  const screensUsed = (rentedExtras ?? []).filter((e: any) => e.extras?.type === "screen").length;
  const occPct = totalCapacity > 0 ? Math.min(100, Math.round((active / totalCapacity) * 100)) : 0;

  // Group subs by plan
  const byPlan = new Map<string, number>();
  for (const s of subs ?? []) byPlan.set(s.plan_name, (byPlan.get(s.plan_name) ?? 0) + 1);

  return (
    <div>
      <PageHeader title="Ocupación" subtitle="Vista preliminar — fórmula por coworking en construcción" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Clientes activos" value={active} hint="Incluye gracia 7d post-vencimiento" tone="brand" />
        <MetricCard label="Capacidad total" value={totalCapacity} hint={`Ocupación ${occPct}%`} />
        <MetricCard label="Oficinas configuradas" value={totalOffices} />
        <MetricCard label="Taquillas ocupadas" value={`${lockersUsed} / ${totalLockers}`} />
        <MetricCard label="Pantallas alquiladas" value={`${screensUsed} / ${totalScreens}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Suscripciones activas por plan</CardTitle></CardHeader>
        <CardBody>
          <ul className="divide-y divide-ink-100">
            {Array.from(byPlan.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <li key={name} className="flex items-center justify-between py-3">
                <span className="font-medium text-ink-900">{name}</span>
                <span className="text-sm text-ink-600">{count}</span>
              </li>
            ))}
            {byPlan.size === 0 && <li className="py-6 text-center text-sm text-ink-500">Sin suscripciones activas.</li>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
