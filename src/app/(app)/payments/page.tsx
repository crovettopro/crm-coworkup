import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/pagination";
import { Seg, SegLink } from "@/components/ui/seg";
import { PAYMENT_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentRowActions } from "./payment-actions";
import { Plus, Search, AlertTriangle, Wallet, Check } from "lucide-react";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

function isoNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const TONE: Record<string, "success" | "danger" | "neutral" | "warning"> = {
  paid: "success",
  partial: "warning",
  overdue: "danger",
  pending: "warning",
  cancelled: "neutral",
};
const dotBg: Record<string, string> = {
  paid: "bg-emerald-500",
  partial: "bg-amber-500",
  overdue: "bg-red-500",
  pending: "bg-amber-500",
  cancelled: "bg-ink-400",
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

  let listQ = supabase
    .from("payments")
    .select(
      "id, client_id, concept, expected_amount, paid_amount, status, expected_payment_date, paid_at, payment_method, clients(name, company_name)",
      { count: "exact" },
    );
  listQ = applyFilters(listQ);
  listQ = listQ.order("status", { ascending: true }).order("paid_at", { ascending: false, nullsFirst: false }).range(fromIdx, toIdx);
  const { data: payments, count: pageCount } = await listQ;

  const [overdueAgg, pendingAgg, paidAgg] = await Promise.all([
    applyFilters(supabase.from("payments").select("expected_amount, paid_amount", { count: "exact" })).eq("status", "overdue"),
    applyFilters(supabase.from("payments").select("expected_amount, paid_amount", { count: "exact" })).eq("status", "pending"),
    applyFilters(supabase.from("payments").select("expected_amount, paid_amount")).eq("status", "paid"),
  ]);

  const overdueAmount = ((overdueAgg as any).data ?? []).reduce(
    (a: number, p: any) => a + (Number(p.expected_amount) - Number(p.paid_amount ?? 0)), 0,
  );
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
  const expectedTotal = ((paidAgg as any).data ?? []).reduce(
    (a: number, p: any) => a + Number(p.expected_amount ?? 0), 0,
  );
  const collectionRate = expectedTotal > 0 ? Math.round((paidAmount / (paidAmount + overdueAmount + overdueDueAmount + pendingAmount)) * 100) : 0;

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

  function rangeHref(k: string) {
    const sp = new URLSearchParams();
    if (params.cw) sp.set("cw", params.cw);
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    sp.set("range", k);
    return `/payments?${sp.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle={`${totalCount} ${totalCount === 1 ? "pago" : "pagos"} · ${rangeLabel}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={
          <Link href="/payments/new">
            <Button size="sm" variant="primary">
              <Plus className="h-3.5 w-3.5" /> Pago manual
            </Button>
          </Link>
        }
      />

      <KpiGrid className="mb-4">
        <Kpi
          icon={<AlertTriangle className="h-3 w-3" />}
          label="Impagos vencidos"
          value={formatCurrency(overdueAmount + overdueDueAmount)}
          hint="Overdue + pending con fecha pasada"
          valueClassName="text-red-700"
        />
        <Kpi
          label="Pendientes"
          value={formatCurrency(pendingAmount)}
          hint="A cobrar próximamente"
          valueClassName="text-amber-700"
        />
        <Kpi
          icon={<Check className="h-3 w-3" />}
          label="Cobrado"
          value={formatCurrency(paidAmount)}
          hint={rangeLabel}
          valueClassName="text-emerald-700"
        />
        <Kpi
          accent
          icon={<Wallet className="h-3 w-3" />}
          label="Tasa de cobro"
          value={`${collectionRate}%`}
          hint="paid / total esperado"
        />
      </KpiGrid>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Seg>
          <SegLink href={rangeHref("7d")} active={rangeKey === "7d"}>Últimos 7d</SegLink>
          <SegLink href={rangeHref("30d")} active={rangeKey === "30d"}>30d</SegLink>
          <SegLink href={rangeHref("90d")} active={rangeKey === "90d"}>90d</SegLink>
          <SegLink href={rangeHref("all")} active={rangeKey === "all"}>Todo</SegLink>
        </Seg>

        <form className="flex flex-wrap items-center gap-2 flex-1 min-w-0" action="/payments">
          {params.cw && <input type="hidden" name="cw" value={params.cw} />}
          <input type="hidden" name="range" value="custom" />
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por concepto…"
              className="h-8 w-full rounded-md border border-ink-200 bg-white pl-8 pr-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
            />
          </div>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-8 cursor-pointer appearance-none rounded-md border border-ink-200 bg-white pl-2.5 pr-8 text-[13px] text-ink-900 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100 bg-no-repeat bg-[length:14px_14px]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2371717a'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
              backgroundPosition: "right 8px center",
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="inline-flex items-center gap-1.5 h-8 rounded-md border border-ink-200 bg-white px-2 text-[12px] text-ink-500">
            <input type="date" name="from" defaultValue={dateFrom ?? ""} className="bg-transparent text-[12.5px] focus:outline-none" />
            <span>→</span>
            <input type="date" name="to" defaultValue={dateTo ?? ""} className="bg-transparent text-[12.5px] focus:outline-none" />
          </div>
          <Button type="submit" variant="outline" size="sm">Aplicar</Button>
          {(params.q || params.status || params.range || params.from || params.to) && (
            <Link href="/payments" className="text-[12.5px] text-ink-500 hover:text-ink-900 underline">Limpiar</Link>
          )}
        </form>
      </div>

      {!payments || payments.length === 0 ? (
        <EmptyState title="Sin pagos">No hay pagos para los filtros aplicados.</EmptyState>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Concepto</TH>
                <TH className="text-right">Importe</TH>
                <TH>Fecha</TH>
                <TH>Método</TH>
                <TH>Estado</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {payments.map((p: any) => {
                const realStatus =
                  p.status === "pending" && p.expected_payment_date && p.expected_payment_date < today
                    ? "overdue"
                    : p.status;
                const tone = TONE[realStatus] ?? "neutral";
                return (
                  <TR
                    key={p.id}
                    className={realStatus === "overdue" ? "bg-red-500/[0.025] hover:bg-red-500/[0.05]" : ""}
                  >
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.clients?.name ?? "—"} size="sm" />
                        <Link href={`/clients/${p.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                          {p.clients?.name ?? "—"}
                        </Link>
                      </div>
                    </TD>
                    <TD className="text-[12.5px] text-ink-500">{p.concept ?? "—"}</TD>
                    <TD className="text-right tabular text-[13px] font-medium text-ink-950">
                      {formatCurrency(p.expected_amount)}
                    </TD>
                    <TD className="text-[12.5px] text-ink-500">
                      <span className="font-mono text-[12px]">
                        {formatDate(p.paid_at ?? p.expected_payment_date)}
                      </span>
                    </TD>
                    <TD className="text-[12.5px] text-ink-500">
                      {p.payment_method ? PAYMENT_METHOD_LABEL[p.payment_method as keyof typeof PAYMENT_METHOD_LABEL] : "—"}
                    </TD>
                    <TD>
                      <Badge tone={tone}>
                        <span className={"h-1.5 w-1.5 rounded-full " + (dotBg[realStatus] ?? "bg-ink-400")} />
                        {PAYMENT_STATUS_LABEL[realStatus as keyof typeof PAYMENT_STATUS_LABEL]}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <PaymentRowActions payment={p} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalCount}
            pageSize={PAGE_SIZE}
            hrefFor={pageHref}
          />
        </>
      )}
    </div>
  );
}
