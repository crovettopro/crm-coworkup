import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { KpiGrid, Kpi } from "@/components/ui/kpi";
import { ExtrasGrid } from "@/components/extras-grid";
import { EXTRA_TYPE_LABEL } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
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
      .select("id, extra_id, client_id, start_date, price, status, clients(id, name), extras(type, identifier)")
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
  const monthlyIncome = (assignments ?? []).reduce((acc: number, a: any) => acc + Number(a.price ?? 0), 0);

  const assignmentByExtraId = new Map<string, any>();
  (assignments ?? []).forEach((a: any) => assignmentByExtraId.set(a.extra_id, a));

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
          label="Ingresos mensuales"
          value={formatCurrency(monthlyIncome)}
          hint={`${totalRented} de ${totalItems} items en uso`}
        />
      </KpiGrid>

      <ExtrasGrid
        lockers={lockers}
        monitors={screens}
        others={others}
        assignments={(assignments ?? []) as any}
        clients={(clients ?? []).map((c: any) => ({ id: c.id, name: c.name }))}
        initialTab="lockers"
      />

      <Card>
        <CardHeader>
          <CardTitle>Alquileres en curso</CardTitle>
          <span className="text-[12px] text-ink-500">{assignments?.length ?? 0}</span>
        </CardHeader>
        <CardBody className="p-0">
          {!assignments || assignments.length === 0 ? (
            <EmptyState title="Sin alquileres en curso" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Item</TH>
                  <TH className="text-right">Precio</TH>
                  <TH>Desde</TH>
                </TR>
              </THead>
              <TBody>
                {assignments.map((a: any) => (
                  <TR key={a.id}>
                    <TD>
                      <Link href={`/clients/${a.client_id}`} className="text-[13px] font-medium text-ink-950 hover:underline">
                        {a.clients?.name ?? "—"}
                      </Link>
                    </TD>
                    <TD className="text-[12.5px]">
                      <span className="text-ink-700">
                        {EXTRA_TYPE_LABEL[a.extras?.type as keyof typeof EXTRA_TYPE_LABEL]}
                      </span>{" "}
                      ·{" "}
                      <span className="font-mono text-ink-950">{a.extras?.identifier}</span>
                    </TD>
                    <TD className="text-right tabular text-[13px] font-medium text-ink-950">
                      {formatCurrency(a.price)}
                      <span className="text-[11px] text-ink-500"> /mes</span>
                    </TD>
                    <TD className="text-[12.5px] text-ink-500 font-mono">{formatDate(a.start_date)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
