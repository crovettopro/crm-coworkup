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
import { Plus, Search } from "lucide-react";

export const revalidate = 30;
const PAGE_SIZE = 25;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string }>;
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

  // Plans + active subs (paginated)
  const [{ data: plans }, { data: planCounts }] = await Promise.all([
    supabase
      .from("plans")
      .select("*")
      .in("coworking_id", cwIds)
      .order("billing_cycle")
      .order("default_price", { ascending: false }),
    // count by plan for the catalog tiles (independiente del filtro)
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
  if (params.plan) subsQ = subsQ.eq("plan_name", params.plan);
  // q filter on client name has to go via JOIN; do simple post-filter on plan_name OR fetch by client lookup
  if (params.q) subsQ = subsQ.or(`plan_name.ilike.%${params.q}%`);
  subsQ = subsQ.order("plan_name").range(fromIdx, toIdx);
  const { data: activeSubs, count: subsCount } = await subsQ;

  // Si hay búsqueda, también buscar por cliente y mezclar — opcional. Para no complicar, la búsqueda
  // afecta solo a plan_name. Si quieres por cliente, usa el ⌘K del topbar y abre el cliente.

  const cwName = coworkings.find((c) => c.id === cwIds[0])?.name ?? "—";

  const countByPlan = new Map<string, number>();
  for (const s of (planCounts ?? []) as any[]) {
    countByPlan.set(s.plan_name, (countByPlan.get(s.plan_name) ?? 0) + 1);
  }

  const totalCount = subsCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.plan) sp.set("plan", params.plan);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/subscriptions?${qs}` : `/subscriptions`;
  }

  // Lista de planes para el filtro select (solo los que tienen subs activas)
  const planNames = Array.from(countByPlan.keys()).sort();

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
          {profile.role === "super_admin" && (
            <Link href="/settings" className="text-[12px] text-ink-500 hover:text-ink-900">Editar →</Link>
          )}
        </CardHeader>
        <CardBody>
          {!plans || plans.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-500">Sin planes configurados</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {plans.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/subscriptions?plan=${encodeURIComponent(p.name)}`}
                  className="rounded border border-ink-200 px-3.5 py-3 hover:border-ink-400 hover:bg-ink-50/60 transition-colors"
                >
                  <div className="text-[10.5px] uppercase tracking-[0.05em] font-medium text-ink-500">{p.name}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[22px] font-semibold tracking-tight tabular text-ink-950">
                      {formatCurrency(p.default_price)}
                    </span>
                    <span className="text-[11px] text-ink-500">/{p.billing_cycle === "monthly" ? "mes" : "pase"}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-ink-500">
                    {countByPlan.get(p.name) ?? 0} activos
                    {p.duration_days ? ` · ${p.duration_days}d` : ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Suscripciones activas</CardTitle>
          <div className="flex items-center gap-2">
            {(params.q || params.plan) && (
              <Link href="/subscriptions" className="text-[12px] text-ink-500 hover:text-ink-900 underline">Limpiar</Link>
            )}
            <span className="text-[12px] text-ink-500">{totalCount} en {cwName}</span>
          </div>
        </CardHeader>

        <div className="px-[18px] py-2 border-b border-ink-200 flex flex-wrap items-center gap-2">
          <form action="/subscriptions" className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Buscar por nombre del plan…"
                className="h-8 w-full rounded-md border border-ink-200 bg-white pl-8 pr-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
              />
            </div>
            <select
              name="plan"
              defaultValue={params.plan ?? ""}
              className="h-8 cursor-pointer appearance-none rounded-md border border-ink-200 bg-white pl-2.5 pr-8 text-[13px] text-ink-900 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100 bg-no-repeat bg-[length:14px_14px]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2371717a'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="">Todos los planes</option>
              {planNames.map((p) => (
                <option key={p} value={p}>
                  {p} ({countByPlan.get(p) ?? 0})
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">Aplicar</Button>
          </form>
          <span className="text-[11.5px] text-ink-500">Tip: clic sobre un plan del catálogo para filtrar</span>
        </div>

        <CardBody className="p-0">
          {!activeSubs || activeSubs.length === 0 ? (
            <EmptyState title="Sin suscripciones activas">
              No hay suscripciones recurrentes con los filtros aplicados.
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
                    <TH className="text-right">MRR/mes</TH>
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
