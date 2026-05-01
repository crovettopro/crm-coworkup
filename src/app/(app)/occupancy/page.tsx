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
  // Mismo criterio (y misma fórmula ponderada) que dashboard_cw_summary_mv.
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);

  const [{ data: summaryRows }, { data: subs }, { data: rentedExtras }] = await Promise.all([
    supabase
      .from("dashboard_cw_summary_mv")
      .select("coworking_id, coworkers, occupied_seats, active_subs")
      .in("coworking_id", cwIds),
    // Para el desglose por plan necesitamos quantity por sub: Ayuda en Acción con 12 cuenta como 12.
    supabase
      .from("subscriptions")
      .select("plan_name, quantity, coworking_id, end_date, status")
      .in("coworking_id", cwIds)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${graceCutoffISO}`),
    supabase.from("client_extras").select("id, coworking_id, extras(type)").in("coworking_id", cwIds).eq("status", "rented"),
  ]);

  const totalCapacity = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.total_capacity ?? 0), 0);
  const totalLockers = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.lockers_capacity ?? 0), 0);
  const totalScreens = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.screens_capacity ?? 0), 0);
  const totalOffices = coworkings.filter((c) => cwIds.includes(c.id)).reduce((a, c) => a + (c.offices_capacity ?? 0), 0);
  // Coworkers = personas físicas con sub vigente o en gracia (excluye Oficina Virtual). Suma quantity.
  const coworkers = (summaryRows ?? []).reduce((a: number, r: any) => a + Number(r.coworkers ?? 0), 0);
  // Plazas ocupadas ponderadas (Fijo=1, Oficina=1, Flexible=0.8, 20h=0.6, 10h=0.1, Tardes/OV=0)
  const occupiedSeats = (summaryRows ?? []).reduce((a: number, r: any) => a + Number(r.occupied_seats ?? 0), 0);
  const lockersUsed = (rentedExtras ?? []).filter((e: any) => e.extras?.type === "locker").length;
  const screensUsed = (rentedExtras ?? []).filter((e: any) => e.extras?.type === "screen").length;
  const occRatio = totalCapacity > 0 ? occupiedSeats / totalCapacity : null;
  const occPct = occRatio !== null ? Math.round(occRatio * 100) : 0;

  // Desglose por plan: sumamos quantity (no filas) — Ayuda en Acción × 12 cuenta como 12 puestos
  const byPlan = new Map<string, number>();
  for (const s of (subs ?? []) as any[]) {
    byPlan.set(s.plan_name, (byPlan.get(s.plan_name) ?? 0) + Number(s.quantity ?? 1));
  }

  return (
    <div>
      <PageHeader title="Ocupación" subtitle="Vista preliminar — fórmula por coworking en construcción" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Coworkers"
          value={coworkers}
          hint="Personas con sub vigente (incl. gracia 7d, suma quantity, excl. Oficina Virtual)"
          tone="brand"
        />
        <MetricCard
          label="Plazas ocupadas (ponderadas)"
          value={`${occupiedSeats.toFixed(1)} / ${totalCapacity}`}
          hint={`Ocupación ${occPct}%`}
        />
        <MetricCard label="Oficinas configuradas" value={totalOffices} />
        <MetricCard label="Taquillas ocupadas" value={`${lockersUsed} / ${totalLockers}`} />
        <MetricCard label="Pantallas alquiladas" value={`${screensUsed} / ${totalScreens}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Puestos activos por plan</CardTitle></CardHeader>
        <CardBody>
          <ul className="divide-y divide-ink-100">
            {Array.from(byPlan.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <li key={name} className="flex items-center justify-between py-3">
                <span className="font-medium text-ink-900">{name}</span>
                <span className="text-sm text-ink-600 tabular">{count}</span>
              </li>
            ))}
            {byPlan.size === 0 && <li className="py-6 text-center text-sm text-ink-500">Sin suscripciones activas.</li>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
