import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge, Dot } from "@/components/ui/badge";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_LABEL: Record<string, string> = {
  active: "Activo", overdue: "Impago", inactive: "Baja", pending: "Pendiente", casual: "Casual",
};
const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "warning"> = {
  active: "success", overdue: "danger", inactive: "neutral", pending: "warning", casual: "neutral",
};
const STATUS_DOT: Record<string, "success" | "danger" | "neutral" | "warning"> = {
  active: "success", overdue: "danger", inactive: "neutral", pending: "warning", casual: "neutral",
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

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${total} ${total === 1 ? "cliente" : "clientes"}${total > PAGE_SIZE ? ` · página ${page} de ${totalPages}` : ""}`}
        actions={
          <Link href="/clients/new">
            <Button><Plus className="h-4 w-4" /> Nuevo cliente</Button>
          </Link>
        }
      />

      <form className="mb-5 flex flex-wrap gap-2" action="/clients">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar por nombre, empresa o email…"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm placeholder:text-ink-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-100"
          />
        </div>
        <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <select name="type" defaultValue={params.type ?? ""} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">Todos los tipos</option>
          <option value="individual">Individual</option>
          <option value="company">Empresa</option>
        </select>
        <Button type="submit" variant="outline" size="md">Aplicar</Button>
      </form>

      {!rows || rows.length === 0 ? (
        <EmptyState
          title="Aún no hay clientes"
          action={
            <Link href="/clients/new">
              <Button><Plus className="h-4 w-4" /> Crear el primero</Button>
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
                <TH>Coworking</TH>
                <TH>Último pago</TH>
                <TH>Estado</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c: any) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/clients/${c.id}`} className="block">
                      <p className="font-medium text-ink-900 hover:underline">{c.name}</p>
                      {(c.company_name || c.email) && (
                        <p className="text-[12px] text-ink-500">{c.company_name ?? c.email}</p>
                      )}
                    </Link>
                  </TD>
                  <TD className="text-[13px]">{c.client_type === "company" ? "Empresa" : "Individual"}</TD>
                  <TD className="text-[13px] text-ink-600">{cwMap.get(c.coworking_id) ?? "—"}</TD>
                  <TD className="text-[12px] text-ink-600">{formatDate(c.last_paid_at)}</TD>
                  <TD>
                    <span className="inline-flex items-center gap-2">
                      <Dot tone={STATUS_DOT[c.derived_status] ?? "neutral"} />
                      <Badge tone={STATUS_TONE[c.derived_status] ?? "neutral"}>{STATUS_LABEL[c.derived_status] ?? c.derived_status}</Badge>
                    </span>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/clients/${c.id}`} className="text-[13px] font-medium text-ink-700 hover:text-ink-900">
                      Abrir →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[12px] text-ink-500">
                Mostrando {from + 1}–{Math.min(to + 1, total)} de {total}
              </p>
              <div className="flex items-center gap-1">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-[13px] hover:bg-ink-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-100 bg-ink-50 px-3 text-[13px] text-ink-400">
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </span>
                )}
                <span className="px-3 text-[13px] text-ink-700">
                  Página {page} de {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-[13px] hover:bg-ink-50"
                  >
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
