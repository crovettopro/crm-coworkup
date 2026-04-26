import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { PlansManager } from "../settings/plans-manager";
import { formatCurrency, grossPrice } from "@/lib/utils";
import { Plus } from "lucide-react";

export const revalidate = 30;
const PAGE_SIZE = 25;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ plans?: string; page?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, null, { allowAll: false });

  const supabase = await createClient();
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  // Filtro de planes: lista de nombres separada por coma — comparación case-insensitive
  const selectedPlans = (params.plans ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Plans + count agregado (independiente del filtro)
  const [{ data: plans }, { data: planCounts }] = await Promise.all([
    supabase
      .from("plans")
      .select("*")
      .in("coworking_id", cwIds)
      .order("billing_cycle")
      .order("name"),
    supabase
      .from("subscriptions")
      .select("plan_name")
      .in("coworking_id", cwIds)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${graceCutoffISO}`),
  ]);

  // Active subs filtered + paginated
  let subsQ = supabase
    .from("subscriptions")
    .select(
      "id, plan_name, final_price, vat_rate, tax_treatment, quantity, billing_months, end_date, coworking_id, client:clients(id, name, company_name)",
      { count: "exact" },
    )
    .in("coworking_id", cwIds)
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${graceCutoffISO}`);
  if (selectedPlans.length > 0) {
    // Case-insensitive con OR de ilike (coincide aunque sea "20 horas" vs "20 Horas")
    const orParts = selectedPlans.map((p) => `plan_name.ilike.${p}`).join(",");
    subsQ = subsQ.or(orParts);
  }
  subsQ = subsQ.order("plan_name").range(fromIdx, toIdx);
  const { data: activeSubs, count: subsCount } = await subsQ;

  const cwName = coworkings.find((c) => c.id === cwIds[0])?.name ?? "—";

  // Count por plan (case-insensitive — agrupa "20 Horas" / "20 horas")
  const countByPlan = new Map<string, number>();
  for (const s of (planCounts ?? []) as any[]) {
    const key = (s.plan_name as string).toLowerCase();
    countByPlan.set(key, (countByPlan.get(key) ?? 0) + 1);
  }
  const countFor = (name: string) => countByPlan.get(name.toLowerCase()) ?? 0;

  const totalCount = subsCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function planTileHref(name: string) {
    const sp = new URLSearchParams();
    const lower = name.toLowerCase();
    const next = selectedPlans.filter((p) => p.toLowerCase() !== lower);
    const isActive = selectedPlans.some((p) => p.toLowerCase() === lower);
    if (!isActive) next.push(name);
    if (next.length > 0) sp.set("plans", next.join(","));
    const qs = sp.toString();
    return qs ? `/subscriptions?${qs}` : `/subscriptions`;
  }

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.plans) sp.set("plans", params.plans);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/subscriptions?${qs}` : `/subscriptions`;
  }

  const hasFilter = selectedPlans.length > 0;

  return (
    <div>
      <PageHeader
        title="Suscripciones"
        subtitle={`${totalCount} ${totalCount === 1 ? "activa" : "activas"} · catálogo de ${cwName}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={
          <Link href={`/payments/new`}>
            <Button size="sm" variant="primary"><Plus className="h-3.5 w-3.5" /> Nueva suscripción</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Catálogo de planes</CardTitle>
          <span className="text-[12px] text-ink-500">
            Clic para filtrar · {selectedPlans.length > 0 ? `${selectedPlans.length} seleccionado${selectedPlans.length === 1 ? "" : "s"}` : "ninguno seleccionado"}
            {profile.role === "super_admin" && (
              <> · <Link href="/settings" className="hover:text-ink-900">Editar →</Link></>
            )}
          </span>
        </CardHeader>
        <CardBody>
          {!plans || plans.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-500">Sin planes configurados</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {plans.map((p: any) => {
                const active = selectedPlans.some((sp) => sp.toLowerCase() === p.name.toLowerCase());
                const count = countFor(p.name);
                return (
                  <Link
                    key={p.id}
                    href={planTileHref(p.name)}
                    scroll={false}
                    className={
                      "rounded-md border px-3.5 py-3 transition-colors " +
                      (active
                        ? "bg-ink-950 border-ink-950 text-white hover:bg-ink-800"
                        : "bg-white border-ink-200 text-ink-700 hover:border-ink-400 hover:bg-ink-50/60")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={
                          "text-[10.5px] uppercase tracking-[0.05em] font-medium " +
                          (active ? "text-brand-400" : "text-ink-500")
                        }
                      >
                        {p.billing_cycle === "monthly" ? "Mensual" : "Pase puntual"}
                      </div>
                      {active && <span className="text-[11px] font-medium">✓</span>}
                    </div>
                    <div
                      className={
                        "mt-1 text-[15px] font-semibold tracking-tight " +
                        (active ? "text-white" : "text-ink-950")
                      }
                    >
                      {p.name}
                    </div>
                    <div className={"mt-1 text-[11.5px] " + (active ? "text-ink-300" : "text-ink-500")}>
                      {count} {count === 1 ? "activa" : "activas"}
                      {p.duration_days ? ` · ${p.duration_days}d` : ""}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            Suscripciones activas
            {hasFilter && (
              <span className="ml-2 text-[12px] font-normal text-ink-500">
                filtradas: {selectedPlans.join(", ")}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasFilter && (
              <Link href="/subscriptions" className="text-[12px] text-ink-500 hover:text-ink-900 underline">
                Quitar filtros
              </Link>
            )}
            <span className="text-[12px] text-ink-500">{totalCount} en {cwName}</span>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {!activeSubs || activeSubs.length === 0 ? (
            <EmptyState title="Sin suscripciones activas">
              No hay suscripciones recurrentes con el filtro aplicado.
            </EmptyState>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH>
                    <TH>Plan</TH>
                    <TH>Periodicidad</TH>
                    <TH>Asientos</TH>
                    <TH className="text-right">Cuota / mes</TH>
                    <TH>Estado</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {activeSubs.map((s: any) => {
                    const seats = Number(s.quantity) || 1;
                    const months = Math.max(1, Number(s.billing_months) || 1);
                    const mrr = grossPrice(s.final_price, s.tax_treatment, s.vat_rate ?? 21) / months;
                    const periodLabel =
                      months === 1 ? "Mensual" : months === 3 ? "Trimestral" : months === 6 ? "Semestral" : months === 12 ? "Anual" : `${months}m`;
                    return (
                      <TR key={s.id}>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.client?.name ?? "—"} size="sm" />
                            <Link href={`/clients/${s.client?.id ?? ""}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                              {s.client?.name ?? "—"}
                            </Link>
                          </div>
                        </TD>
                        <TD className="text-[12.5px] text-ink-700">{s.plan_name}</TD>
                        <TD className="text-[12.5px] text-ink-500">{periodLabel}</TD>
                        <TD className="font-mono text-[12.5px] text-ink-700">× {seats}</TD>
                        <TD className="text-right tabular text-[13px] font-medium text-ink-950">
                          {formatCurrency(mrr)}<span className="text-[11px] text-ink-500"> /m</span>
                        </TD>
                        <TD>
                          <Badge tone="success">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Activa
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          {s.client?.id && (
                            <Link href={`/clients/${s.client.id}`} className="text-[12.5px] text-ink-500 hover:text-ink-900">
                              Editar
                            </Link>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              {totalPages > 1 && (
                <div className="px-[18px] pb-4 pt-1">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={totalCount}
                    pageSize={PAGE_SIZE}
                    hrefFor={pageHref}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {profile.role === "super_admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Gestor de catálogo</CardTitle>
            <span className="text-[12px] text-ink-500">solo super_admin</span>
          </CardHeader>
          <CardBody>
            <PlansManager initial={plans ?? []} coworkingId={cwIds[0]} coworkingName={cwName} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
