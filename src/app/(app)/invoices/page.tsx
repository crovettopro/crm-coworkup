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
import { InvoiceRowActions } from "./invoice-actions";
import { formatCurrency, formatDate, monthRange, currentMonthString } from "@/lib/utils";
import { Plus, Search, AlertTriangle } from "lucide-react";

export const revalidate = 30;
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
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

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
    .range(fromIdx, toIdx);
  const { data: invoices, count: pageCount } = await listQ;

  // KPI: month-of-issue for "emitidas este mes" + YTD
  const cm = monthRange(currentMonthString());
  const currentYear = new Date().getFullYear();
  const ytdStart = `${currentYear}-01-01`;

  const [toIssueAgg, issuedThisMonthAgg, paidWithoutInvoice, ytdAgg, vatAgg] = await Promise.all([
    supabase.from("invoices").select("id", { count: "exact", head: true })
      .in("coworking_id", cwIds).eq("status", "to_issue"),
    supabase.from("invoices").select("total_amount", { count: "exact" })
      .in("coworking_id", cwIds).neq("status", "to_issue")
      .gte("issue_date", cm.start).lt("issue_date", cm.end),
    supabase
      .from("payments")
      .select("id, client_id, coworking_id, concept, expected_amount, paid_at, clients(name)", { count: "exact" })
      .in("coworking_id", cwIds)
      .eq("status", "paid")
      .is("invoice_id", null)
      .order("paid_at", { ascending: false })
      .limit(20),
    supabase.from("invoices").select("total_amount", { count: "exact" })
      .in("coworking_id", cwIds).neq("status", "to_issue")
      .gte("issue_date", ytdStart),
    supabase.from("invoices").select("vat_amount")
      .in("coworking_id", cwIds).neq("status", "to_issue")
      .gte("issue_date", ytdStart),
  ]);

  const toIssueCount = (toIssueAgg as any).count ?? 0;
  const issuedThisMonthCount = (issuedThisMonthAgg as any).count ?? 0;
  const issuedThisMonthAmount = ((issuedThisMonthAgg as any).data ?? []).reduce(
    (a: number, r: any) => a + Number(r.total_amount ?? 0),
    0,
  );
  const orphanCount = (paidWithoutInvoice as any).count ?? 0;
  const ytdCount = (ytdAgg as any).count ?? 0;
  const ytdAmount = ((ytdAgg as any).data ?? []).reduce(
    (a: number, r: any) => a + Number(r.total_amount ?? 0),
    0,
  );
  const vatYtd = ((vatAgg as any).data ?? []).reduce(
    (a: number, r: any) => a + Number(r.vat_amount ?? 0),
    0,
  );

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

  function statusHref(s: string) {
    const sp = new URLSearchParams();
    if (params.cw) sp.set("cw", params.cw);
    if (params.q) sp.set("q", params.q);
    if (params.month) sp.set("month", params.month);
    if (s) sp.set("status", s);
    const qs = sp.toString();
    return qs ? `/invoices?${qs}` : `/invoices`;
  }

  return (
    <div>
      <PageHeader
        title="Facturas"
        subtitle={`${totalCount} ${totalCount === 1 ? "factura" : "facturas"}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={
          <Link href="/invoices/new">
            <Button size="sm" variant="primary">
              <Plus className="h-3.5 w-3.5" /> Registrar factura
            </Button>
          </Link>
        }
      />

      <KpiGrid className="mb-4">
        <Kpi
          label="Por emitir"
          value={toIssueCount + orphanCount}
          hint={orphanCount > 0 ? `${orphanCount} pagos sin factura` : "Pendientes de emisión"}
          valueClassName="text-amber-700"
        />
        <Kpi
          label="Emitidas este mes"
          value={issuedThisMonthCount}
          hint={`Total ${formatCurrency(issuedThisMonthAmount)}`}
        />
        <Kpi
          label="IVA repercutido"
          value={formatCurrency(vatYtd)}
          hint="acumulado YTD"
        />
        <Kpi
          accent
          label="Total YTD"
          value={formatCurrency(ytdAmount)}
          hint={`${ytdCount} facturas`}
        />
      </KpiGrid>

      {orphanCount > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <h2 className="text-[13.5px] font-semibold text-ink-950">Pagos cobrados sin factura registrada</h2>
            <Badge tone="warning">{orphanCount}</Badge>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Concepto</TH>
                <TH className="text-right">Importe</TH>
                <TH>Cobrado el</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {((paidWithoutInvoice as any).data ?? []).map((p: any) => (
                <TR key={p.id} className="bg-amber-500/[0.04] hover:bg-amber-500/[0.08]">
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.clients?.name ?? "—"} size="sm" />
                      <Link href={`/clients/${p.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                        {p.clients?.name}
                      </Link>
                    </div>
                  </TD>
                  <TD className="text-[12.5px] text-ink-500">{p.concept ?? "—"}</TD>
                  <TD className="text-right tabular text-[13px] font-medium text-ink-950">{formatCurrency(p.expected_amount)}</TD>
                  <TD className="text-[12.5px] text-ink-500 font-mono">{formatDate(p.paid_at)}</TD>
                  <TD className="text-right">
                    <Link href={`/invoices/new?from_payment=${p.id}`} className="text-[12.5px] text-ink-500 hover:text-ink-900">
                      Registrar →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {orphanCount > 20 && (
            <p className="mt-2 text-[11.5px] text-ink-500">Mostrando los 20 más recientes de {orphanCount}.</p>
          )}
        </div>
      )}

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Seg>
          <SegLink href={statusHref("")} active={!params.status}>Todas</SegLink>
          <SegLink href={statusHref("to_issue")} active={params.status === "to_issue"}>Por emitir</SegLink>
          <SegLink href={statusHref("issued")} active={params.status === "issued"}>Emitidas</SegLink>
          <SegLink href={statusHref("paid")} active={params.status === "paid"}>Pagadas</SegLink>
        </Seg>

        <form className="flex flex-wrap items-center gap-2 flex-1 min-w-0" action="/invoices">
          {params.cw && <input type="hidden" name="cw" value={params.cw} />}
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por nº de factura o concepto…"
              className="h-8 w-full rounded-md border border-ink-200 bg-white pl-8 pr-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
            />
          </div>
          <input
            type="month"
            name="month"
            defaultValue={params.month ?? ""}
            className="h-8 rounded-md border border-ink-200 bg-white px-2.5 text-[13px] hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
          />
          <Button type="submit" variant="outline" size="sm">Aplicar</Button>
          {(params.q || params.month) && (
            <Link href={statusHref(params.status ?? "")} className="text-[12.5px] text-ink-500 hover:text-ink-900 underline">
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {!invoices || invoices.length === 0 ? (
        <EmptyState title="Sin facturas">No hay facturas para los filtros aplicados.</EmptyState>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Nº</TH>
                <TH>Cliente</TH>
                <TH>Mes</TH>
                <TH className="text-right">Total</TH>
                <TH>Estado</TH>
                <TH>Emisión</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {invoices.map((i: any) => (
                <TR key={i.id}>
                  <TD className="font-mono text-[12.5px] text-ink-950">{i.invoice_number ?? "—"}</TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={i.clients?.name ?? "—"} size="sm" />
                      <Link href={`/clients/${i.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                        {i.clients?.name}
                      </Link>
                    </div>
                  </TD>
                  <TD className="text-[12.5px] text-ink-500">{formatDate(i.month)}</TD>
                  <TD className="text-right tabular text-[13px] font-medium text-ink-950">{formatCurrency(i.total_amount)}</TD>
                  <TD>
                    <Badge tone={i.status === "to_issue" ? "warning" : "success"}>
                      <span className={"h-1.5 w-1.5 rounded-full " + (i.status === "to_issue" ? "bg-amber-500" : "bg-emerald-500")} />
                      {i.status === "to_issue" ? "Por emitir" : i.status === "paid" ? "Pagada" : "Emitida"}
                    </Badge>
                  </TD>
                  <TD className="text-[12.5px] text-ink-500 font-mono">{formatDate(i.issue_date)}</TD>
                  <TD className="text-right">
                    <InvoiceRowActions invoice={i} />
                  </TD>
                </TR>
              ))}
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
