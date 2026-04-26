import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { IncidentEditor } from "./editor";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ChevronLeft, Calendar, User, Building2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  maintenance: "Mantenimiento", cleaning: "Limpieza", internet: "Internet", climate: "Climatización",
  furniture: "Mobiliario", access: "Acceso", client: "Cliente", other: "Otro",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Abierta", in_progress: "En proceso", waiting_provider: "Pdte. proveedor",
  resolved: "Resuelta", cancelled: "Cancelada",
};
const STATUS_TONE: Record<string, any> = {
  open: "warning", in_progress: "info", waiting_provider: "info", resolved: "success", cancelled: "muted",
};
const PRIORITY_TONE: Record<string, any> = { low: "muted", medium: "info", high: "warning", urgent: "danger" };

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);

  const supabase = await createClient();
  const { data: incident } = await supabase
    .from("incidents")
    .select("*, author:profiles!incidents_created_by_fkey(name, email), client:clients(id, name)")
    .eq("id", id)
    .single();

  if (!incident) notFound();

  const cwName = coworkings.find((c) => c.id === incident.coworking_id)?.name ?? "—";

  return (
    <div>
      <Link href="/incidents" className="inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-900 mb-2">
        <ChevronLeft className="h-3 w-3" /> Incidencias
      </Link>

      <PageHeader title={incident.title} subtitle={TYPE_LABEL[incident.type] ?? incident.type} />

      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2">
          <Dot tone={incident.priority === "urgent" || incident.priority === "high" ? "danger" : incident.priority === "medium" ? "warning" : "neutral"} />
          <Badge tone={PRIORITY_TONE[incident.priority]}>Prioridad {incident.priority}</Badge>
        </span>
        <Badge tone={STATUS_TONE[incident.status]}>{STATUS_LABEL[incident.status]}</Badge>
        <span className="text-[12px] text-ink-500 inline-flex items-center gap-1.5">
          <Building2 className="h-3 w-3" /> {cwName}
        </span>
        <span className="text-[12px] text-ink-500 inline-flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> Abierta {formatDate(incident.created_date)}
        </span>
        {incident.author && (
          <span className="text-[12px] text-ink-500 inline-flex items-center gap-1.5">
            <User className="h-3 w-3" /> Por {incident.author.name ?? incident.author.email}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
            <CardBody className="pt-0">
              {incident.description ? (
                <p className="text-sm text-ink-700 whitespace-pre-wrap">{incident.description}</p>
              ) : (
                <p className="text-sm text-ink-500 italic">Sin descripción.</p>
              )}
            </CardBody>
          </Card>

          {incident.notes && (
            <Card>
              <CardHeader><CardTitle>Notas internas</CardTitle></CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-ink-700 whitespace-pre-wrap">{incident.notes}</p>
              </CardBody>
            </Card>
          )}

          {(incident.estimated_cost || incident.final_cost) && (
            <Card>
              <CardHeader><CardTitle>Coste</CardTitle></CardHeader>
              <CardBody className="pt-0 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-ink-500">Estimado</p>
                  <p className="font-display text-[20px] font-semibold text-ink-900">{formatCurrency(incident.estimated_cost ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-ink-500">Final</p>
                  <p className="font-display text-[20px] font-semibold text-ink-900">{incident.final_cost ? formatCurrency(incident.final_cost) : "—"}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <IncidentEditor incident={incident} canDelete={profile.role === "super_admin"} />
        </div>
      </div>
    </div>
  );
}
