import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { CashFloatCard } from "@/components/cash-float-card";
import { CashMovementForm } from "@/components/cash-movement-form";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { formatCurrency, formatDate, monthRange, currentMonthString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; month?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });
  const visibleCoworkings = coworkings.filter((c) => cwIds.includes(c.id));

  const supabase = await createClient();
  const month = params.month ?? currentMonthString();
  const range = monthRange(month);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: cashRegisters },
    { data: monthCashPayments },
    { data: totalCashAgg },
    { data: recentCash },
    { data: monthMovements },
    { data: recentMovements },
    { data: todayMovements },
  ] = await Promise.all([
    supabase.from("cash_register").select("*").in("coworking_id", cwIds),
    supabase
      .from("payments")
      .select("paid_amount, coworking_id")
      .in("coworking_id", cwIds)
      .eq("payment_method", "cash")
      .eq("status", "paid")
      .gte("paid_at", range.start)
      .lt("paid_at", range.end),
    supabase
      .from("payments")
      .select("paid_amount, coworking_id")
      .in("coworking_id", cwIds)
      .eq("payment_method", "cash")
      .eq("status", "paid"),
    supabase
      .from("payments")
      .select("id, paid_at, paid_amount, concept, coworking_id, client_id, clients(name, company_name), coworkings(name)")
      .in("coworking_id", cwIds)
      .eq("payment_method", "cash")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(40),
    supabase
      .from("cash_movements")
      .select("direction, amount, coworking_id")
      .in("coworking_id", cwIds)
      .gte("occurred_at", range.start)
      .lt("occurred_at", range.end),
    supabase
      .from("cash_movements")
      .select("id, occurred_at, direction, concept, amount, category, notes, coworking_id, coworkings(name)")
      .in("coworking_id", cwIds)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
    // Ingresos cash de HOY por coworking (para los floats por sede)
    supabase
      .from("payments")
      .select("paid_amount, coworking_id")
      .in("coworking_id", cwIds)
      .eq("payment_method", "cash")
      .eq("status", "paid")
      .eq("paid_at", today),
  ]);

  const monthCashTotal = (monthCashPayments ?? []).reduce(
    (a: number, p: any) => a + Number(p.paid_amount ?? 0),
    0,
  );
  const allTimeCashTotal = (totalCashAgg ?? []).reduce(
    (a: number, p: any) => a + Number(p.paid_amount ?? 0),
    0,
  );
  const monthMovIn = (monthMovements ?? []).filter((m: any) => m.direction === "in").reduce((a: number, m: any) => a + Number(m.amount), 0);
  const monthMovOut = (monthMovements ?? []).filter((m: any) => m.direction === "out").reduce((a: number, m: any) => a + Number(m.amount), 0);

  const totalFloat = (cashRegisters ?? []).reduce(
    (a: number, r: any) => a + Number(r.cash_float ?? 0),
    0,
  );
  const todayInByCw = new Map<string, number>();
  for (const p of todayMovements ?? []) {
    todayInByCw.set((p as any).coworking_id, (todayInByCw.get((p as any).coworking_id) ?? 0) + Number((p as any).paid_amount ?? 0));
  }

  const canEdit = profile.role === "super_admin" || profile.role === "manager";
  const registerByCw = new Map<string, any>();
  (cashRegisters ?? []).forEach((r: any) => registerByCw.set(r.coworking_id, r));

  return (
    <div>
      <PageHeader
        title="Control efectivo"
        subtitle={`Float manual + cobros en cash + movimientos manuales · ${range.label}`}
        actions={
          <CashMovementForm
            coworkings={visibleCoworkings.map((c) => ({ id: c.id, name: c.name }))}
            defaultCoworkingId={visibleCoworkings.length === 1 ? visibleCoworkings[0].id : null}
          />
        }
      />

      <KpiGrid className="mb-4">
        <Kpi
          label="Efectivo en caja"
          value={formatCurrency(totalFloat)}
          hint={`${visibleCoworkings.length} coworking${visibleCoworkings.length === 1 ? "" : "s"}`}
        />
        <Kpi
          label={`Cobros · ${range.label}`}
          value={formatCurrency(monthCashTotal)}
          hint="Pagos cash con factura"
          valueClassName="text-emerald-700"
        />
        <Kpi
          label={`Mov. + / − · ${range.label}`}
          value={`+${formatCurrency(monthMovIn)} / −${formatCurrency(monthMovOut)}`}
          hint="Sin factura · gastos menores"
          valueClassName={monthMovOut > monthMovIn ? "text-amber-700" : "text-emerald-700"}
        />
        <Kpi
          accent
          label="Cobros · histórico"
          value={formatCurrency(allTimeCashTotal)}
          hint="todo el periodo"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {visibleCoworkings.map((cw) => {
          const reg = registerByCw.get(cw.id);
          return (
            <CashFloatCard
              key={cw.id}
              coworkingId={cw.id}
              coworkingName={cw.name}
              initialFloat={Number(reg?.cash_float ?? 0)}
              notes={reg?.notes ?? null}
              updatedAt={reg?.updated_at ?? null}
              canEdit={canEdit}
              todayIn={todayInByCw.get(cw.id) ?? 0}
            />
          );
        })}
      </div>

      <form className="mb-3.5 flex items-center gap-2" action="/cash">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <label className="text-[12px] text-ink-500">Mes:</label>
        <input
          type="month"
          name="month"
          defaultValue={month}
          className="h-8 rounded-md border border-ink-200 bg-white px-2.5 text-[13px]"
        />
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-800 hover:border-ink-300 hover:bg-ink-50"
        >
          Aplicar
        </button>
      </form>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Movimientos manuales (sin factura)</CardTitle>
          <span className="text-[12px] text-ink-500">{recentMovements?.length ?? 0} en histórico</span>
        </CardHeader>
        <CardBody className="p-0">
          {!recentMovements || recentMovements.length === 0 ? (
            <EmptyState title="Sin movimientos manuales">
              Usa "Movimiento de caja" para registrar ingresos sin factura o pequeños gastos en efectivo.
            </EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Coworking</TH>
                  <TH>Concepto</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Importe</TH>
                </TR>
              </THead>
              <TBody>
                {recentMovements.map((m: any) => (
                  <TR key={m.id}>
                    <TD className="text-[12.5px] text-ink-500 font-mono">{formatDate(m.occurred_at)}</TD>
                    <TD className="text-[12.5px] text-ink-500">{m.coworkings?.name ?? "—"}</TD>
                    <TD className="text-[13px] text-ink-950 font-medium">
                      {m.concept}
                      {(m.notes || m.category) && (
                        <p className="text-[11px] text-ink-500 font-normal mt-0.5">
                          {m.category ? <span>{m.category}</span> : null}
                          {m.category && m.notes && " · "}
                          {m.notes}
                        </p>
                      )}
                    </TD>
                    <TD>
                      {m.direction === "in" ? (
                        <Badge tone="success">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Ingreso
                        </Badge>
                      ) : (
                        <Badge tone="neutral">
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />
                          Gasto
                        </Badge>
                      )}
                    </TD>
                    <TD
                      className={
                        "text-right tabular text-[13px] font-medium " +
                        (m.direction === "out" ? "text-ink-950" : "text-emerald-700")
                      }
                    >
                      {m.direction === "out" ? "−" : "+"}
                      {formatCurrency(m.amount)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos cobros en efectivo (con factura)</CardTitle>
          <span className="text-[12px] text-ink-500">{recentCash?.length ?? 0} más recientes</span>
        </CardHeader>
        <CardBody className="p-0">
          {!recentCash || recentCash.length === 0 ? (
            <EmptyState title="Sin cobros en efectivo">
              No hay pagos en efectivo registrados todavía. Cuando marques un pago como cobrado en
              efectivo aparecerá aquí.
            </EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Cliente</TH>
                  <TH>Concepto</TH>
                  <TH>Coworking</TH>
                  <TH className="text-right">Importe</TH>
                </TR>
              </THead>
              <TBody>
                {recentCash.map((p: any) => (
                  <TR key={p.id}>
                    <TD className="text-[12.5px] text-ink-500 font-mono">{formatDate(p.paid_at)}</TD>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.clients?.name ?? "—"} size="sm" />
                        <Link href={`/clients/${p.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                          {p.clients?.name ?? "—"}
                        </Link>
                      </div>
                    </TD>
                    <TD className="text-[12.5px] text-ink-500">{p.concept ?? "—"}</TD>
                    <TD className="text-[12.5px] text-ink-500">{p.coworkings?.name ?? "—"}</TD>
                    <TD className="text-right tabular text-[13px] font-medium text-emerald-700">
                      +{formatCurrency(p.paid_amount)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
