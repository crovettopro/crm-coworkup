import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PlansManager } from "../settings/plans-manager";
import { formatCurrency, grossPrice } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, null, { allowAll: false });

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceCutoffISO = graceCutoff.toISOString().slice(0, 10);

  const [{ data: plans }, { data: activeSubs }] = await Promise.all([
    supabase
      .from("plans")
      .select("*")
      .in("coworking_id", cwIds)
      .order("billing_cycle")
      .order("default_price", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("id, plan_name, final_price, vat_rate, tax_treatment, quantity, billing_months, end_date, coworking_id, client:clients(id, name)")
      .in("coworking_id", cwIds)
      .eq("status", "active")
      .or(`end_date.is.null,end_date.gte.${graceCutoffISO}`)
      .order("plan_name")
      .limit(100),
  ]);

  const cwName = coworkings.find((c) => c.id === cwIds[0])?.name ?? "—";

  // Count subs por plan_name (para meta del catálogo)
  const countByPlan = new Map<string, number>();
  for (const s of activeSubs ?? []) {
    countByPlan.set((s as any).plan_name, (countByPlan.get((s as any).plan_name) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title="Suscripciones"
        subtitle={`${activeSubs?.length ?? 0} activas · catálogo de ${cwName}`}
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
                <div key={p.id} className="rounded border border-ink-200 px-3.5 py-3">
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
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Suscripciones activas</CardTitle>
          <span className="text-[12px] text-ink-500">{activeSubs?.length ?? 0} en {cwName}</span>
        </CardHeader>
        <CardBody className="p-0">
          {!activeSubs || activeSubs.length === 0 ? (
            <EmptyState title="Sin suscripciones activas">
              No hay suscripciones recurrentes en este momento.
            </EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Plan</TH>
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
