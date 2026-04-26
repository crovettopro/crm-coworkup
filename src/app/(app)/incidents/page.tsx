import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Seg, SegLink } from "@/components/ui/seg";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  maintenance: "Mantenimiento", cleaning: "Limpieza", internet: "Internet", climate: "Climatización",
  furniture: "Mobiliario", access: "Acceso", client: "Cliente", other: "Otro",
};
const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral" | "muted" | "info"> = {
  low: "muted",
  medium: "warning",
  high: "danger",
  urgent: "danger",
};
const PRIORITY_DOT: Record<string, string> = {
  low: "bg-ink-400",
  medium: "bg-amber-500",
  high: "bg-red-500",
  urgent: "bg-red-500",
};
const STATUS_TONE: Record<string, "success" | "warning" | "info" | "neutral"> = {
  open: "warning",
  in_progress: "info",
  waiting_provider: "info",
  resolved: "success",
  cancelled: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  waiting_provider: "Pdte. proveedor",
  resolved: "Resuelta",
  cancelled: "Cancelada",
};

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });

  const supabase = await createClient();
  let q = supabase
    .from("incidents")
    .select("*, author:profiles!incidents_created_by_fkey(name, email)")
    .in("coworking_id", cwIds)
    .order("created_at", { ascending: false });
  if (params.status) q = q.eq("status", params.status);
  if (params.q) q = q.ilike("title", `%${params.q}%`);
  const { data: incidents } = await q;

  function statusHref(s: string) {
    const sp = new URLSearchParams();
    if (params.cw) sp.set("cw", params.cw);
    if (params.q) sp.set("q", params.q);
    if (s) sp.set("status", s);
    const qs = sp.toString();
    return qs ? `/incidents?${qs}` : `/incidents`;
  }

  const cwMap = new Map(coworkings.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Incidencias"
        subtitle={`${incidents?.length ?? 0} ${incidents?.length === 1 ? "registrada" : "registradas"}`}
        actions={
          <Link href="/incidents/new">
            <Button size="sm" variant="primary"><Plus className="h-3.5 w-3.5" /> Nueva incidencia</Button>
          </Link>
        }
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Seg>
          <SegLink href={statusHref("")} active={!params.status}>Todas</SegLink>
          <SegLink href={statusHref("open")} active={params.status === "open"}>Abiertas</SegLink>
          <SegLink href={statusHref("in_progress")} active={params.status === "in_progress"}>En proceso</SegLink>
          <SegLink href={statusHref("waiting_provider")} active={params.status === "waiting_provider"}>Proveedor</SegLink>
          <SegLink href={statusHref("resolved")} active={params.status === "resolved"}>Resueltas</SegLink>
        </Seg>
        <form action="/incidents" className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {params.cw && <input type="hidden" name="cw" value={params.cw} />}
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar incidencia…"
              className="h-8 w-full rounded-md border border-ink-200 bg-white pl-8 pr-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">Aplicar</Button>
        </form>
      </div>

      {!incidents || incidents.length === 0 ? (
        <EmptyState title="Sin incidencias">
          Cuando algo necesite seguimiento, regístralo aquí.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Incidencia</TH>
              <TH>Coworking</TH>
              <TH>Tipo</TH>
              <TH>Prioridad</TH>
              <TH>Estado</TH>
              <TH>Creada</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {incidents.map((i: any) => (
              <TR key={i.id}>
                <TD>
                  <Link href={`/incidents/${i.id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                    {i.title}
                  </Link>
                  {i.description && (
                    <p className="text-[12px] text-ink-500 line-clamp-1">{i.description}</p>
                  )}
                </TD>
                <TD className="text-[12.5px] text-ink-500">{cwMap.get(i.coworking_id) ?? "—"}</TD>
                <TD className="text-[12.5px] text-ink-700">{TYPE_LABEL[i.type] ?? i.type}</TD>
                <TD>
                  <Badge tone={PRIORITY_TONE[i.priority] ?? "neutral"}>
                    <span className={"h-1.5 w-1.5 rounded-full " + (PRIORITY_DOT[i.priority] ?? "bg-ink-400")} />
                    {i.priority}
                  </Badge>
                </TD>
                <TD>
                  <Badge tone={STATUS_TONE[i.status] ?? "neutral"}>
                    {STATUS_LABEL[i.status] ?? i.status}
                  </Badge>
                </TD>
                <TD className="text-[12.5px] text-ink-500 font-mono">{formatDate(i.created_date)}</TD>
                <TD className="text-right">
                  <Link href={`/incidents/${i.id}`} className="text-[12.5px] text-ink-500 hover:text-ink-900">
                    Abrir →
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
