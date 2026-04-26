import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InvoiceRowActions } from "./invoice-actions";
import { formatCurrency, formatDate, monthRange } from "@/lib/utils";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; status?: string; q?: string; month?: string; page?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const monthFilter = params.month ? monthRange(params.month) : null;

  function applyFilters(q: any) {
    q = q.in("coworking_id", cwIds);
    if (params.status) q = q.eq("status", params.status);
    if (monthFilter) q = q.gte("month", monthFilter.start).lt("month", monthFilter.end);
    if (params.q) q = q.or(`invoice_number.ilike.%${params.q}%,concept.ilike.%${params.q}%`);
    return q;
  }

  let listQ = supabase
    .from("invoices")
    .select("id, invoice_number, client_id, month, total_amount, status, issue_date, clients(name)", { count: "exact" });
  listQ = applyFilters(listQ)
    .order("status", { ascending: true })
    .order("issue_date", { ascending: false, nullsFirst: false })
    .range(from, to);
  const { data: invoices, count: pageCount } = await listQ;

  const [toIssueAgg, issuedAgg, paidWithoutInvoice] = await Promise.all([
    applyFilters(supabase.from("invoices").select("id", { count: "exact", head: true })).eq("status", "to_issue"),
    applyFilters(supabase.from("invoices").select("id", { count: "exact", head: true })).neq("status", "to_issue"),
    supabase
      .from("payments")
      .select("id, client_id, coworking_id, concept, expected_amount, paid_at, clients(name)", { count: "exact" })
      .in("coworking_id", cwIds)
      .eq("status", "paid")
      .is("invoice_id", null)
      .order("paid_at", { ascending: false })
      .limit(20),
  ]);

  const toIssueCount = (toIssueAgg as any).count ?? 0;
  const issuedCount = (issuedAgg as any).count ?? 0;
  const orphanCount = (paidWithoutInvoice as any).count ?? 0;
  const totalCount = pageCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.cw) sp.set("cw", params.cw);
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.month) sp.set("month", params.month);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/invoices?${qs}` : `/invoices`;
  }

  return (
    <div>
      <PageHeader
        title="Facturas"
        subtitle={`${totalCount} ${totalCount === 1 ? "factura" : "facturas"}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={<Link href="/invoices/new"><Button><Plus className="h-4 w-4" /> Registrar factura</Button></Link>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Por emitir" value={toIssueCount + orphanCount} tone="warning" hint={orphanCount > 0 ? `${orphanCount} pagos sin factura` : undefined} />
        <MetricCard label="Emitidas" value={issuedCount} tone="success" />
        <MetricCard label="Total registradas" value={totalCount} />
      </div>

      {orphanCount > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-[15px] font-semibold text-ink-900">Pagos cobrados sin factura registrada</h2>
            <Badge tone="warning">{orphanCount}</Badge>
          </div>
          <Table>
            <THead>
              <TR><TH>Cliente</TH><TH>Concepto</TH><TH>Importe</TH><TH>Cobrado el</TH><TH></TH></TR>
            </THead>
            <TBody>
              {((paidWithoutInvoice as any).data ?? []).map((p: any) => (
                <TR key={p.id} className="bg-amber-50/30">
                  <TD><Link href={`/clients/${p.client_id}`} className="font-medium hover:underline">{p.clients?.name}</Link></TD>
                  <TD className="text-[12px]">{p.concept ?? "—"}</TD>
                  <TD className="font-medium">{formatCurrency(p.expected_amount)}</TD>
                  <TD className="text-[12px]">{formatDate(p.paid_at)}</TD>
                  <TD className="text-right">
                    <Link href={`/invoices/new?from_payment=${p.id}`} className="text-[13px] font-medium text-ink-700 hover:text-ink-900">
                      Registrar factura →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {orphanCount > 20 && (
            <p className="mt-2 text-[12px] text-ink-500">Mostrando los 20 más recientes de {orphanCount}.</p>
          )}
        </div>
      )}

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/invoices">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por nº de factura o concepto…"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-100"
          />
        </div>
        <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">Todos los estados</option>
          <option value="to_issue">No emitida</option>
          <option value="issued">Emitida</option>
          <option value="paid">Pagada</option>
          <option value="overdue">Vencida</option>
        </select>
        <input
          type="month"
          name="month"
          defaultValue={params.month ?? ""}
          className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
        />
        <Button type="submit" variant="outline">Aplicar</Button>
        {(params.q || params.status || params.month) && (
          <Link href="/invoices" className="text-[12px] text-ink-500 hover:text-ink-900 underline">Reset</Link>
        )}
      </form>

      {!invoices || invoices.length === 0 ? (
        <EmptyState title="Sin facturas">
          No hay facturas para los filtros aplicados.
        </EmptyState>
      ) : (
        <>
          <Table>
            <THead>
              <TR><TH>Nº</TH><TH>Cliente</TH><TH>Mes</TH><TH>Total</TH><TH>Estado</TH><TH>Emisión</TH><TH></TH></TR>
            </THead>
            <TBody>
              {invoices.map((i: any) => (
                <TR key={i.id}>
                  <TD className="font-mono text-[12px]">{i.invoice_number ?? "—"}</TD>
                  <TD><Link href={`/clients/${i.client_id}`} className="font-medium hover:underline">{i.clients?.name}</Link></TD>
                  <TD>{formatDate(i.month)}</TD>
                  <TD className="font-medium">{formatCurrency(i.total_amount)}</TD>
                  <TD>
                    <Badge tone={i.status === "to_issue" ? "warning" : "success"}>
                      {i.status === "to_issue" ? "No emitida" : i.status === "paid" ? "Pagada" : "Emitida"}
                    </Badge>
                  </TD>
                  <TD className="text-[12px]">{formatDate(i.issue_date)}</TD>
                  <TD className="text-right"><InvoiceRowActions invoice={i} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] text-ink-500">
                Mostrando {from + 1}–{Math.min(to + 1, totalCount)} de {totalCount}
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
