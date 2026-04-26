import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { EXTRA_TYPE_LABEL } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, MonitorSmartphone, Lock, Package } from "lucide-react";
import { ExtraTile } from "@/components/extra-tile";

export const dynamic = "force-dynamic";

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
  const others  = (extras ?? []).filter((e: any) => e.type !== "locker" && e.type !== "screen");
  const monthlyIncome = (assignments ?? []).reduce((acc: number, a: any) => acc + Number(a.price ?? 0), 0);

  const assignmentByExtraId = new Map<string, any>();
  (assignments ?? []).forEach((a: any) => assignmentByExtraId.set(a.extra_id, a));

  return (
    <div>
      <PageHeader
        title="Monitores y taquillas"
        subtitle="Haz clic en un item para asignarlo a un cliente o liberarlo."
        actions={<Link href="/extras/new"><Button><Plus className="h-4 w-4" /> Añadir item</Button></Link>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryCard
          icon={<Lock className="h-4 w-4" />}
          label="Taquillas"
          rented={lockers.filter((e: any) => e.status === "rented").length}
          total={lockers.length}
        />
        <SummaryCard
          icon={<MonitorSmartphone className="h-4 w-4" />}
          label="Monitores"
          rented={screens.filter((e: any) => e.status === "rented").length}
          total={screens.length}
        />
        <SummaryCard
          icon={<Package className="h-4 w-4" />}
          label="Ingresos mensuales"
          customRight={<span className="font-display text-[20px] font-semibold text-ink-900">{formatCurrency(monthlyIncome)}</span>}
        />
      </div>

      <h2 className="font-display text-[15px] font-semibold text-ink-900 mb-3">Inventario</h2>
      {(extras ?? []).length === 0 ? (
        <EmptyState title="Sin items configurados">
          Añade taquillas, monitores u otro equipamiento.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {[
            { title: "Taquillas", items: lockers, icon: <Lock className="h-3.5 w-3.5" /> },
            { title: "Monitores", items: screens, icon: <MonitorSmartphone className="h-3.5 w-3.5" /> },
            ...(others.length > 0 ? [{ title: "Otros", items: others, icon: <Package className="h-3.5 w-3.5" /> }] : []),
          ].map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.icon} {group.title}
                  <span className="ml-2 text-[11px] font-medium text-ink-500">
                    {group.items.filter((e: any) => e.status === "rented").length}/{group.items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                {group.items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-500">Sin {group.title.toLowerCase()}.</p>
                ) : (
                  <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {group.items.map((e: any) => (
                      <li key={e.id}>
                        <ExtraTile
                          extra={e}
                          assignment={assignmentByExtraId.get(e.id) ?? null}
                          clients={(clients ?? []).map((c: any) => ({ id: c.id, name: c.name }))}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-display text-[15px] font-semibold text-ink-900 mb-3">Alquileres en curso</h2>
      {!assignments || assignments.length === 0 ? (
        <EmptyState title="Sin alquileres en curso" />
      ) : (
        <Table>
          <THead><TR><TH>Cliente</TH><TH>Item</TH><TH>Precio</TH><TH>Desde</TH></TR></THead>
          <TBody>
            {assignments.map((a: any) => (
              <TR key={a.id}>
                <TD><Link href={`/clients/${a.client_id}`} className="font-medium hover:underline">{a.clients?.name ?? "—"}</Link></TD>
                <TD className="text-[13px]">{EXTRA_TYPE_LABEL[a.extras?.type as keyof typeof EXTRA_TYPE_LABEL]} · <span className="font-mono">{a.extras?.identifier}</span></TD>
                <TD className="font-medium">{formatCurrency(a.price)}<span className="text-[12px] text-ink-500">/mes</span></TD>
                <TD className="text-[12px]">{formatDate(a.start_date)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, rented, total, customRight,
}: {
  icon: React.ReactNode;
  label: string;
  rented?: number;
  total?: number;
  customRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-500">
          <span className="text-ink-400">{icon}</span> {label}
        </p>
      </div>
      {customRight ? (
        <div className="mt-3">{customRight}</div>
      ) : (
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-[26px] font-semibold text-ink-900">{rented}</span>
          <span className="text-[13px] text-ink-500 mb-1">de {total} alquilados</span>
        </div>
      )}
    </div>
  );
}
