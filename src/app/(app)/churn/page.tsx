import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, currentMonthString, monthRange } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChurnPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; month?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });
  const month = params.month ?? currentMonthString();
  const { start, end, label } = monthRange(month);

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  // Para meses pasados aceptamos cualquier baja del mes; para el mes en curso solo
  // las que ya pasaron los 7 días de gracia.
  const churnUpperBound = end > today ? new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10) : end;

  const [{ data: signups }, { data: churns }] = await Promise.all([
    // Altas: clientes cuyo PRIMER pago de plan recurrente cae en el mes
    supabase
      .from("monthly_signups")
      .select("*")
      .in("coworking_id", cwIds)
      .gte("first_recurring_paid", start).lt("first_recurring_paid", end)
      .order("first_recurring_paid"),
    // Bajas: clientes inactive cuya RENOVACIÓN ESTIMADA tocaba en el mes y han pasado +7 días sin renovar
    supabase
      .from("monthly_churn")
      .select("*")
      .in("coworking_id", cwIds)
      .gte("estimated_renewal_date", start)
      .lt("estimated_renewal_date", churnUpperBound)
      .order("estimated_renewal_date"),
  ]);

  const monthOptions: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    });
  }

  const net = (signups?.length ?? 0) - (churns?.length ?? 0);

  return (
    <div>
      <PageHeader
        title="Altas y bajas"
        subtitle={`Suscripciones recurrentes — ${label}`}
        actions={
          <form action="/churn" className="flex gap-2">
            {params.cw && <input type="hidden" name="cw" value={params.cw} />}
            <select name="month" defaultValue={month} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm capitalize">
              {monthOptions.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
            <Button type="submit" variant="outline">Ver</Button>
          </form>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Altas" value={signups?.length ?? 0} tone="success" icon={<TrendingUp className="h-4 w-4" />} hint="Primera suscripción mensual" />
        <MetricCard label="Bajas" value={churns?.length ?? 0} tone="danger" icon={<TrendingDown className="h-4 w-4" />} hint="Cliente inactivo, no renovó" />
        <MetricCard label="Neto" value={net >= 0 ? `+${net}` : net} tone={net > 0 ? "success" : net < 0 ? "danger" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Altas ({signups?.length ?? 0})</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {!signups || signups.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">Sin altas mensuales este mes.</p>
            ) : (
              <Table>
                <THead><TR><TH>Cliente</TH><TH>Tipo</TH><TH>Plan inicial</TH><TH>Fecha</TH></TR></THead>
                <TBody>
                  {signups.map((c: any) => (
                    <TR key={c.client_id}>
                      <TD><Link href={`/clients/${c.client_id}`} className="font-medium hover:underline">{c.name}</Link></TD>
                      <TD className="text-[12px]">{c.client_type === "company" ? "Empresa" : "Individual"}</TD>
                      <TD className="text-[12px]">{c.first_plan ?? "—"}</TD>
                      <TD className="text-[12px]">{formatDate(c.first_recurring_paid)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Bajas ({churns?.length ?? 0})</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {!churns || churns.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">Sin bajas este mes.</p>
            ) : (
              <Table>
                <THead><TR><TH>Cliente</TH><TH>Último plan</TH><TH>Renovación que tocaba</TH><TH>Último pago</TH></TR></THead>
                <TBody>
                  {churns.map((c: any) => (
                    <TR key={c.client_id}>
                      <TD><Link href={`/clients/${c.client_id}`} className="font-medium hover:underline">{c.name}</Link></TD>
                      <TD className="text-[12px]">{c.last_plan ?? "—"}</TD>
                      <TD className="text-[12px]">{formatDate(c.estimated_renewal_date)}</TD>
                      <TD className="text-[12px] text-ink-500">{formatDate(c.last_recurring_paid)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
