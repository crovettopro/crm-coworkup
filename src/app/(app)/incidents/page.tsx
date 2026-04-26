import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge, Dot } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  maintenance: "Mantenimiento", cleaning: "Limpieza", internet: "Internet", climate: "Climatización",
  furniture: "Mobiliario", access: "Acceso", client: "Cliente", other: "Otro",
};
const PRIORITY_TONE: Record<string, any> = { low: "muted", medium: "info", high: "warning", urgent: "danger" };
const STATUS_TONE: Record<string, any> = {
  open: "warning", in_progress: "info", waiting_provider: "info", resolved: "success", cancelled: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Abierta", in_progress: "En proceso", waiting_provider: "Pdte. proveedor",
  resolved: "Resuelta", cancelled: "Cancelada",
};

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; status?: string }>;
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
  const { data: incidents } = await q;

  return (
    <div>
      <PageHeader
        title="Incidencias"
        subtitle={`${incidents?.length ?? 0} ${incidents?.length === 1 ? "registrada" : "registradas"}`}
        actions={<Link href="/incidents/new"><Button><Plus className="h-4 w-4" /> Nueva</Button></Link>}
      />

      <form className="mb-4 flex gap-2" action="/incidents">
        {params.cw && <input type="hidden" name="cw" value={params.cw} />}
        <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <Button type="submit" variant="outline">Aplicar</Button>
      </form>

      {!incidents || incidents.length === 0 ? (
        <EmptyState title="Sin incidencias">
          Cuando algo necesite seguimiento, regístralo aquí.
        </EmptyState>
      ) : (
        <Table>
          <THead><TR>
            <TH>Incidencia</TH><TH>Tipo</TH><TH>Prioridad</TH><TH>Estado</TH>
            <TH>Responsable</TH><TH>Abierta por</TH><TH>Fecha</TH>
          </TR></THead>
          <TBody>
            {incidents.map((i: any) => (
              <TR key={i.id} className="cursor-pointer">
                <TD>
                  <Link href={`/incidents/${i.id}`} className="block">
                    <p className="font-medium text-ink-900 hover:underline">{i.title}</p>
                    {i.description && <p className="text-[12px] text-ink-500 line-clamp-1">{i.description}</p>}
                  </Link>
                </TD>
                <TD className="text-[12px]"><Link href={`/incidents/${i.id}`}>{TYPE_LABEL[i.type] ?? i.type}</Link></TD>
                <TD>
                  <Link href={`/incidents/${i.id}`} className="inline-flex items-center gap-2">
                    <Dot tone={i.priority === "urgent" || i.priority === "high" ? "danger" : i.priority === "medium" ? "warning" : "neutral"} />
                    <Badge tone={PRIORITY_TONE[i.priority]}>{i.priority}</Badge>
                  </Link>
                </TD>
                <TD><Link href={`/incidents/${i.id}`}><Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status] ?? i.status}</Badge></Link></TD>
                <TD className="text-[13px]"><Link href={`/incidents/${i.id}`}>{i.responsible ?? "—"}</Link></TD>
                <TD className="text-[12px] text-ink-500"><Link href={`/incidents/${i.id}`}>{i.author?.name ?? i.author?.email ?? "—"}</Link></TD>
                <TD className="text-[12px] text-ink-500"><Link href={`/incidents/${i.id}`}>{formatDate(i.created_date)}</Link></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
