import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/metric-card";
import { CashFloatCard } from "@/components/cash-float-card";
import { CashMovementForm } from "@/components/cash-movement-form";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, monthRange, currentMonthString } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL } from "@/lib/types";
import { Plus, Minus } from "lucide-react";

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

  const [
    { data: cashRegisters },
    { data: monthCashPayments },
    { data: totalCashAgg },
    { data: recentCash },
    { data: monthMovements },
    { data: recentMovements },
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

  const canEdit = profile.role === "super_admin" || profile.role === "manager";

  // For each visible coworking, find the corresponding register (or fall back to 0)
  const registerByCw = new Map<string, any>();
  (cashRegisters ?? []).forEach((r: any) => registerByCw.set(r.coworking_id, r));

  return (
    <div>
      <PageHeader
        title="Control efectivo"
        subtitle="Caja física por coworking + cobros en efectivo. Edita el float manualmente cuando hagas arqueo."
        actions={
          <CashMovementForm
            coworkings={visibleCoworkings.map((c) => ({ id: c.id, name: c.name }))}
            defaultCoworkingId={visibleCoworkings.length === 1 ? visibleCoworkings[0].id : null}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Efectivo en caja"
          value={formatCurrency(totalFloat)}
          tone="dark"
          hint={`${visibleCoworkings.length} coworking${visibleCoworkings.length === 1 ? "" : "s"}`}
        />
        <MetricCard
          label={`Cobros · ${range.label}`}
          value={formatCurrency(monthCashTotal)}
          tone="brand"
          hint="Pagos cash con factura"
        />
        <MetricCard
          label={`Mov. + / − · ${range.label}`}
          value={`${formatCurrency(monthMovIn)} / ${formatCurrency(monthMovOut)}`}
          tone={monthMovOut > monthMovIn ? "warning" : "success"}
          hint="Sin factura · gastos menores"
        />
        <MetricCard
          label="Cobros · histórico"
          value={formatCurrency(allTimeCashTotal)}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
            />
          );
        })}
      </div>

      <form className="mb-4 flex items-center gap-2" action="/cash">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <label className="text-[12px] text-ink-500">Mes:</label>
        <input
          type="month"
          name="month"
          defaultValue={month}
          className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm hover:bg-ink-50"
        >
          Aplicar
        </button>
      </form>

      <h3 className="font-display text-[15px] font-semibold text-ink-900 mb-3">
        Movimientos manuales (sin factura)
      </h3>
      {!recentMovements || recentMovements.length === 0 ? (
        <EmptyState title="Sin movimientos manuales">
          Usa "Movimiento de caja" para registrar ingresos sin factura o pequeños gastos en efectivo.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Tipo</TH>
              <TH>Concepto</TH>
              <TH>Categoría</TH>
              <TH>Coworking</TH>
              <TH className="text-right">Importe</TH>
            </TR>
          </THead>
          <TBody>
            {recentMovements.map((m: any) => (
              <TR key={m.id}>
                <TD className="text-[12px]">{formatDate(m.occurred_at)}</TD>
                <TD>
                  {m.direction === "in" ? (
                    <Badge tone="success"><Plus className="h-3 w-3" /> Ingreso</Badge>
                  ) : (
                    <Badge tone="danger"><Minus className="h-3 w-3" /> Gasto</Badge>
                  )}
                </TD>
                <TD className="text-[13px]">
                  {m.concept}
                  {m.notes && <p className="text-[11px] text-ink-500">{m.notes}</p>}
                </TD>
                <TD className="text-[12px] text-ink-500">{m.category ?? "—"}</TD>
                <TD className="text-[12px] text-ink-500">{m.coworkings?.name ?? "—"}</TD>
                <TD className={`text-right font-medium ${m.direction === "out" ? "text-red-600" : "text-emerald-700"}`}>
                  {m.direction === "out" ? "−" : "+"}{formatCurrency(m.amount)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <h3 className="font-display text-[15px] font-semibold text-ink-900 mt-8 mb-3">
        Últimos cobros en efectivo (con factura)
      </h3>

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
              <TH>Importe</TH>
              <TH>Método</TH>
            </TR>
          </THead>
          <TBody>
            {recentCash.map((p: any) => (
              <TR key={p.id}>
                <TD className="text-[12px]">{formatDate(p.paid_at)}</TD>
                <TD>
                  <Link href={`/clients/${p.client_id}`} className="font-medium hover:underline">
                    {p.clients?.name ?? "—"}
                  </Link>
                </TD>
                <TD className="text-[12px] text-ink-600">{p.concept ?? "—"}</TD>
                <TD className="text-[12px] text-ink-500">{p.coworkings?.name ?? "—"}</TD>
                <TD className="font-medium">{formatCurrency(p.paid_amount)}</TD>
                <TD>
                  <Badge tone="muted">{PAYMENT_METHOD_LABEL.cash}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
