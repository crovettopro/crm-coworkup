import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { Plus, Search } from "lucide-react";
import { formatCurrency, formatDate, grossPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_LABEL: Record<string, string> = {
  active: "Activo", overdue: "Impago", inactive: "Baja", pending: "Pendiente", casual: "Casual",
};
const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "warning" | "gold"> = {
  active: "success", overdue: "danger", inactive: "neutral", pending: "warning", casual: "gold",
};
const STATUS_DOT: Record<string, "success" | "danger" | "neutral" | "warning" | "gold"> = {
  active: "success", overdue: "danger", inactive: "neutral", pending: "warning", casual: "gold",
};
const dotBg: Record<string, string> = {
  success: "bg-emerald-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
  neutral: "bg-ink-400",
  gold: "bg-brand-500",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; q?: string; status?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  let query = supabase
    .from("clients_listing")
    .select("id, name, company_name, email, status, client_type, coworking_id, last_paid_at, derived_status", { count: "exact" })
    .in("coworking_id", cwIds)
    .order("last_paid_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (params.q) query = query.or(`name.ilike.%${params.q}%,email.ilike.%${params.q}%,company_name.ilike.%${params.q}%`);
  if (params.type) query = query.eq("client_type", params.type);
  if (params.status) query = query.eq("derived_status", params.status);

  const { data: rows, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cwMap = new Map(coworkings.map((c) => [c.id, c.name]));

  // MRR + plan por cliente (subs activas) — añadido aquí por la nueva columna MRR sin tocar la vista
  const ids = (rows ?? []).map((r: any) => r.id);
  const mrrByClient = new Map<string, { mrr: number; plan: string | null; seats: number }>();
  if (ids.length > 0) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("client_id, plan_name, final_price, vat_rate, tax_treatment, quantity")
      .eq("status", "active")
      .in("client_id", ids);
    for (const s of subs ?? []) {
      const cur = mrrByClient.get((s as any).client_id) ?? { mrr: 0, plan: null, seats: 0 };
      const seats = Number((s as any).quantity) || 1;
      cur.mrr += grossPrice((s as any).final_price, (s as any).tax_treatment, (s as any).vat_rate ?? 21) * seats;
      if (!cur.plan) cur.plan = (s as any).plan_name;
      cur.seats = Math.max(cur.seats, seats);
      mrrByClient.set((s as any).client_id, cur);
    }
  }

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.cw) sp.set("cw", params.cw);
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.type) sp.set("type", params.type);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/clients?${qs}` : `/clients`;
  }

  const hasFilters = !!(params.q || params.status || params.type);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${total} ${total === 1 ? "cliente" : "clientes"}${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={
          <Link href="/clients/new">
            <Button size="sm" variant="primary">
              <Plus className="h-3.5 w-3.5" /> Nuevo cliente
            </Button>
          </Link>
        }
      />

      <form className="mb-3.5 flex flex-wrap items-center gap-2" action="/clients">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por nombre, empresa o email…"
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
          {Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <select
          name="type"
          defaultValue={params.type ?? ""}
          className="h-8 cursor-pointer appearance-none rounded-md border border-ink-200 bg-white pl-2.5 pr-8 text-[13px] text-ink-900 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100 bg-no-repeat bg-[length:14px_14px]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2371717a'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="individual">Individual</option>
          <option value="company">Empresa</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Aplicar</Button>
        {hasFilters && (
          <Link href="/clients" className="text-[12.5px] text-ink-500 hover:text-ink-900 underline">
            Limpiar
          </Link>
        )}
      </form>

      {!rows || rows.length === 0 ? (
        <EmptyState
          title="Aún no hay clientes"
          action={
            <Link href="/clients/new">
              <Button size="sm"><Plus className="h-3.5 w-3.5" /> Crear el primero</Button>
            </Link>
          }
        >
          Crea el primer cliente o ajusta los filtros.
        </EmptyState>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Tipo</TH>
                <TH>Plan</TH>
                <TH>Coworking</TH>
                <TH>Último pago</TH>
                <TH className="text-right">MRR</TH>
                <TH>Estado</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c: any) => {
                const status = c.derived_status as string;
                const tone = STATUS_TONE[status] ?? "neutral";
                const dot = STATUS_DOT[status] ?? "neutral";
                const mrr = mrrByClient.get(c.id);
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div>
                          <Link href={`/clients/${c.id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                            {c.name}
                          </Link>
                          {(c.company_name || c.email) && (
                            <div className="text-[12px] text-ink-500">{c.company_name ?? c.email}</div>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="text-[12.5px] text-ink-500">{c.client_type === "company" ? "Empresa" : "Individual"}</TD>
                    <TD className="text-[12.5px]">
                      {mrr?.plan ? (
                        <span className="text-ink-800">
                          {mrr.plan}
                          {mrr.seats > 1 && <span className="text-ink-500"> × {mrr.seats}</span>}
                        </span>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </TD>
                    <TD className="text-[12.5px] text-ink-500">{cwMap.get(c.coworking_id) ?? "—"}</TD>
                    <TD className="text-[12.5px] text-ink-500">{formatDate(c.last_paid_at)}</TD>
                    <TD className="text-right tabular text-[13px]">
                      {mrr && mrr.mrr > 0 ? (
                        <span className="font-medium text-ink-950">{formatCurrency(mrr.mrr)}</span>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={tone}>
                        <span className={"h-1.5 w-1.5 rounded-full " + (dotBg[dot] ?? "bg-ink-400")} />
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <Link href={`/clients/${c.id}`} className="text-[12.5px] text-ink-500 hover:text-ink-900">
                        Abrir →
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            hrefFor={pageHref}
          />
        </>
      )}
    </div>
  );
}
