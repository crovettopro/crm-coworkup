import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge, Dot } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentRowActions } from "./payment-actions";
import { Plus, Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

function isoNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const TONE: Record<string, any> = {
  paid: "success", partial: "warning", overdue: "danger", pending: "warning", cancelled: "muted",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; status?: string; q?: string; from?: string; to?: string; range?: string; page?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });

  const today = new Date().toISOString().slice(0, 10);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Date range filter — default últimos 7 días por paid_at o expected_payment_date
  // (params.range = "7d" | "30d" | "90d" | "all" | "custom")
  const rangeKey = params.range ?? (params.from || params.to ? "custom" : "7d");
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  let rangeLabel = "";
  if (rangeKey === "custom") {
    dateFrom = params.from || null;
    dateTo = params.to || null;
    rangeLabel = `${dateFrom ?? "—"} → ${dateTo ?? "—"}`;
  } else if (rangeKey === "all") {
    rangeLabel = "todos";
  } else {
    const days = rangeKey === "30d" ? 30 : rangeKey === "90d" ? 90 : 7;
    dateFrom = isoNDaysAgo(days);
    dateTo = today;
    rangeLabel = `últimos ${days} días`;
  }

  function applyFilters(q: any) {
    q = q.in("coworking_id", cwIds);
    if (params.status) q = q.eq("status", params.status);
    // Filtra por la fecha relevante: paid_at si está, o expected_payment_date.
    // Implementado con .or() de Postgrest.
    if (dateFrom || dateTo) {
      const conditions: string[] = [];
      if (dateFrom && dateTo) {
        conditions.push(`and(paid_at.gte.${dateFrom},paid_at.lte.${dateTo})`);
        conditions.push(`and(paid_at.is.null,expected_payment_date.gte.${dateFrom},expected_payment_date.lte.${dateTo})`);
      } else if (dateFrom) {
        conditions.push(`paid_at.gte.${dateFrom}`);
        conditions.push(`and(paid_at.is.null,expected_payment_date.gte.${dateFrom})`);
      } else if (dateTo) {
        conditions.push(`paid_at.lte.${dateTo}`);
        conditions.push(`and(paid_at.is.null,expected_payment_date.lte.${dateTo})`);
      }
      q = q.or(conditions.join(","));
    }
    if (params.q) q = q.ilike("concept", `%${params.q}%`);
    return q;
  }

  // Listed payments (current page)
  let listQ = supabase
    .from("payments")
    .select("id, client_id, concept, expected_amount, paid_amount, status, expected_payment_date, paid_at, payment_method, clients(name, company_name)", { count: "exact" });
  listQ = applyFilters(listQ);
  // Pending/overdue first by sorting status asc, then most recent paid date desc
  listQ = listQ.order("status", { ascending: true }).order("paid_at", { ascending: false, nullsFirst: false }).range(fromIdx, toIdx);
  const { data: payments, count: pageCount } = await listQ;

  // Aggregated KPIs (scoped to filters)
  const [overdueAgg, pendingAgg, paidAgg] = await Promise.all([
    applyFilters(supabase.from("payments").select("expected_amount, paid_amount", { count: "exact" }))
      .eq("status", "overdue"),
    applyFilters(supabase.from("payments").select("expected_amount, paid_amount", { count: "exact" }))
      .eq("status", "pending"),
    applyFilters(supabase.from("payments").select("paid_amount"))
      .eq("status", "paid"),
  ]);

  const overdueAmount = ((overdueAgg as any).data ?? []).reduce(
    (a: number, p: any) => a + (Number(p.expected_amount) - Number(p.paid_amount ?? 0)), 0,
  );
  // Also count "pending whose expected_payment_date is in the past" as effectively overdue
  const pendingPastAgg = await applyFilters(
    supabase.from("payments").select("expected_amount, paid_amount", { count: "exact" })
      .eq("status", "pending").not("expected_payment_date", "is", null).lt("expected_payment_date", today)
  );
  const overdueDueAmount = ((pendingPastAgg as any).data ?? []).reduce(
    (a: number, p: any) => a + (Number(p.expected_amount) - Number(p.paid_amount ?? 0)), 0,
  );
  const pendingAmount = ((pendingAgg as any).data ?? []).reduce(
    (a: number, p: any) => a + (Number(p.expected_amount) - Number(p.paid_amount ?? 0)), 0,
  );
  const paidAmount = ((paidAgg as any).data ?? []).reduce(
    (a: number, p: any) => a + Number(p.paid_amount ?? 0), 0,
  );

  const totalCount = pageCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.cw) sp.set("cw", params.cw);
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.range) sp.set("range", params.range);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/payments?${qs}` : `/payments`;
  }

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle={`${totalCount} ${totalCount === 1 ? "pago" : "pagos"}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={
          <Link href="/payments/new"><Button><Plus className="h-4 w-4" /> Pago manual</Button></Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Impagos vencidos" value={formatCurrency(overdueAmount + overdueDueAmount)} tone="danger" hint="Overdue + pending con fecha pasada" />
        <MetricCard label="Pendientes" value={formatCurrency(pendingAmount)} tone="warning" />
        <MetricCard label="Cobrado" value={formatCurrency(paidAmount)} tone="success" hint={rangeLabel} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Quick range presets */}
        {[
          { k: "7d", l: "Últimos 7d" },
          { k: "30d", l: "30d" },
          { k: "90d", l: "90d" },
          { k: "all", l: "Todo" },
        ].map((p) => {
          const sp = new URLSearchParams();
          if (params.cw) sp.set("cw", params.cw);
          if (params.q) sp.set("q", params.q);
          if (params.status) sp.set("status", params.status);
          sp.set("range", p.k);
          const isActive = rangeKey === p.k;
          return (
            <Link
              key={p.k}
              href={`/payments?${sp.toString()}`}
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-[12.5px] font-medium ${isActive ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`}
            >
              {p.l}
            </Link>
          );
        })}
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/payments">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <input type="hidden" name="range" value="custom" />
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por concepto…"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-100"
          />
        </div>
        <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <div className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2 text-[12px] text-ink-500">
          <Calendar className="h-3.5 w-3.5" />
          <input type="date" name="from" defaultValue={dateFrom ?? ""} className="h-10 bg-transparent text-sm focus:outline-none" />
          <span>→</span>
          <input type="date" name="to" defaultValue={dateTo ?? ""} className="h-10 bg-transparent text-sm focus:outline-none" />
        </div>
        <Button type="submit" variant="outline">Aplicar</Button>
        {(params.q || params.status || params.range || params.from || params.to) && (
          <Link href="/payments" className="text-[12px] text-ink-500 hover:text-ink-900 underline">Reset</Link>
        )}
      </form>

      {!payments || payments.length === 0 ? (
        <EmptyState title="Sin pagos">No hay pagos para los filtros aplicados.</EmptyState>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Concepto</TH>
                <TH>Importe</TH>
                <TH>Mes / Pagado</TH>
                <TH>Método</TH>
                <TH>Estado</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {payments.map((p: any) => {
                const realStatus = p.status === "pending" && p.expected_payment_date && p.expected_payment_date < today
                  ? "overdue"
                  : p.status;
                return (
                  <TR key={p.id} className={realStatus === "overdue" ? "bg-red-50/30" : ""}>
                    <TD>
                      <Link href={`/clients/${p.client_id}`} className="font-medium hover:underline">
                        {p.clients?.name ?? "—"}
                      </Link>
                    </TD>
                    <TD className="text-[12px] text-ink-600">{p.concept ?? "—"}</TD>
                    <TD className="font-medium">{formatCurrency(p.expected_amount)}</TD>
                    <TD className="text-[12px]">
                      {p.paid_at ? formatDate(p.paid_at) : formatDate(p.expected_payment_date)}
                    </TD>
                    <TD className="text-[12px] text-ink-600">
                      {p.payment_method ? PAYMENT_METHOD_LABEL[p.payment_method as keyof typeof PAYMENT_METHOD_LABEL] : "—"}
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-2">
                        <Dot tone={realStatus === "paid" ? "success" : realStatus === "overdue" ? "danger" : "warning"} />
                        <Badge tone={TONE[realStatus]}>
                          {PAYMENT_STATUS_LABEL[realStatus as keyof typeof PAYMENT_STATUS_LABEL]}
                        </Badge>
                      </span>
                    </TD>
                    <TD className="text-right"><PaymentRowActions payment={p} /></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] text-ink-500">
                Mostrando {fromIdx + 1}–{Math.min(toIdx + 1, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-1">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-[13px] hover:bg-ink-50">
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-100 bg-ink-50 px-3 text-[13px] text-ink-400">
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </span>
                )}
                <span className="px-3 text-[13px] text-ink-700">Página {page} de {totalPages}</span>
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-[13px] hover:bg-ink-50">
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-100 bg-ink-50 px-3 text-[13px] text-ink-400">
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
