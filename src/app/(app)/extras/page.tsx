import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { ExtrasGrid } from "@/components/extras-grid";
import { Plus, MonitorSmartphone, Lock, Package } from "lucide-react";

export const revalidate = 30;

export default async function ExtrasPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });

  const supabase = await createClient();
  const [{ data: extras }, { data: assignments }, { data: clients }] = await Promise.all([
    supabase.from("extras").select("*").in("coworking_id", cwIds).order("type").order("identifier"),
    supabase
      .from("client_extras")
      .select("id, extra_id, client_id, start_date, status, clients(id, name), extras(type, identifier)")
      .in("coworking_id", cwIds)
      .eq("status", "rented")
      .order("start_date", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name")
      .in("coworking_id", cwIds)
      .neq("status", "inactive")
      .order("name")
      .limit(500),
  ]);

  const lockers = (extras ?? []).filter((e: any) => e.type === "locker");
  const screens = (extras ?? []).filter((e: any) => e.type === "screen");
  const others = (extras ?? []).filter((e: any) => e.type !== "locker" && e.type !== "screen");

  const lockersRented = lockers.filter((e: any) => e.status === "rented").length;
  const screensRented = screens.filter((e: any) => e.status === "rented").length;
  const totalItems = (extras ?? []).length;
  const totalRented = (extras ?? []).filter((e: any) => e.status === "rented").length;

  return (
    <div>
      <PageHeader
        title="Monitores y taquillas"
        subtitle="Asigna inventario a clientes haciendo clic"
        actions={
          <Link href="/extras/new">
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5" /> Añadir
            </Button>
          </Link>
        }
      />

      <KpiGrid cols={3} className="mb-4">
        <Kpi
          icon={<Lock className="h-3 w-3" />}
          label="Taquillas"
          value={`${lockersRented}/${lockers.length}`}
          hint="alquiladas"
        />
        <Kpi
          icon={<MonitorSmartphone className="h-3 w-3" />}
          label="Monitores"
          value={`${screensRented}/${screens.length}`}
          hint="alquilados"
        />
        <Kpi
          accent
          icon={<Package className="h-3 w-3" />}
          label="Total en uso"
          value={`${totalRented}/${totalItems}`}
          hint="items asignados"
        />
      </KpiGrid>

      <ExtrasGrid
        lockers={lockers}
        monitors={screens}
        others={others}
        assignments={(assignments ?? []).map((a: any) => ({
          id: a.id,
          extra_id: a.extra_id,
          client_id: a.client_id,
          start_date: a.start_date,
          // La query devuelve `clients` (relación). Lo normalizamos a `client`
          // (singular) que es lo que espera ExtraTile para mostrar el nombre.
          client: a.clients ? { id: a.clients.id, name: a.clients.name } : null,
        }))}
        clients={(clients ?? []).map((c: any) => ({ id: c.id, name: c.name }))}
        initialTab="lockers"
      />
    </div>
  );
}
