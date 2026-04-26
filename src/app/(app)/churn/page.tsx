import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { formatDate, currentMonthString, monthRange } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTH_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

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
  const churnUpperBound = end > today ? new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10) : end;

  const [{ data: signups }, { data: churns }, activeBaseAgg] = await Promise.all([
    supabase
      .from("monthly_signups")
      .select("*")
      .in("coworking_id", cwIds)
      .gte("first_recurring_paid", start).lt("first_recurring_paid", end)
      .order("first_recurring_paid"),
    supabase
      .from("monthly_churn")
      .select("*")
      .in("coworking_id", cwIds)
      .gte("estimated_renewal_date", start)
      .lt("estimated_renewal_date", churnUpperBound)
      .order("estimated_renewal_date"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .in("coworking_id", cwIds)
      .eq("status", "active"),
  ]);

  const monthOptions: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthOptions.push({
      value: key,
      label: `${MONTH_ES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  const altas = signups?.length ?? 0;
  const bajas = churns?.length ?? 0;
  const net = altas - bajas;
  const activeBase = (activeBaseAgg as any).count ?? 0;
  const churnRate = activeBase + bajas > 0 ? Math.round((bajas / (activeBase + bajas)) * 100 * 10) / 10 : 0;

  return (
    <div>
      <PageHeader
        title="Altas y bajas"
        subtitle={`Suscripciones recurrentes · ${label} · regla de gracia 7 días`}
        actions={
          <form action="/churn" className="flex gap-2">
            {params.cw && <input type="hidden" name="cw" value={params.cw} />}
            <select
              name="month"
              defaultValue={month}
              className="h-8 cursor-pointer appearance-none rounded-md border border-ink-200 bg-white pl-2.5 pr-8 text-[13px] hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100 capitalize bg-no-repeat bg-[length:14px_14px]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2371717a'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
                backgroundPosition: "right 8px center",
              }}
            >
              {monthOptions.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
            <Button type="submit" variant="outline" size="sm">Ver</Button>
          </form>
        }
      />

      <KpiGrid className="mb-4">
        <Kpi
          icon={<TrendingUp className="h-3 w-3" />}
          label="Altas este mes"
          value={altas}
          hint="Primera suscripción mensual"
          valueClassName="text-emerald-700"
        />
        <Kpi
          icon={<TrendingDown className="h-3 w-3" />}
          label="Bajas este mes"
          value={bajas}
          hint="Cliente inactivo, no renovó"
          valueClassName="text-red-700"
        />
        <Kpi
          accent
          label="Net new"
          value={net >= 0 ? `+${net}` : String(net)}
          hint="crecimiento neto"
        />
        <Kpi
          label="Tasa de churn"
          value={`${churnRate}%`}
          hint="bajas / (activos + bajas)"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Altas</CardTitle>
            <Badge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {altas}
            </Badge>
          </CardHeader>
          <CardBody className="py-1.5">
            {!signups || signups.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-500">Sin altas mensuales este mes.</p>
            ) : (
              <ul>
                {signups.map((c: any) => (
                  <li
                    key={c.client_id}
                    className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/clients/${c.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-ink-500">
                          {c.client_type === "company" ? "Empresa" : "Individual"}
                          {c.first_plan && <> · {c.first_plan}</>}
                        </div>
                      </div>
                    </div>
                    <span className="text-[12.5px] text-ink-500 font-mono shrink-0 ml-2">{formatDate(c.first_recurring_paid)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><TrendingDown className="h-3.5 w-3.5 text-red-500" /> Bajas</CardTitle>
            <Badge tone="danger">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {bajas}
            </Badge>
          </CardHeader>
          <CardBody className="py-1.5">
            {!churns || churns.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-ink-500">Sin bajas este mes.</p>
            ) : (
              <ul>
                {churns.map((c: any) => (
                  <li
                    key={c.client_id}
                    className="flex items-center justify-between py-2.5 border-b border-ink-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/clients/${c.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-ink-500">
                          {c.last_plan ?? "—"}
                          {c.last_recurring_paid && <> · último pago {formatDate(c.last_recurring_paid)}</>}
                        </div>
                      </div>
                    </div>
                    <span className="text-[12.5px] text-red-600 font-mono shrink-0 ml-2">{formatDate(c.estimated_renewal_date)}</span>
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
