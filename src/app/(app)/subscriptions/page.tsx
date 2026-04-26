import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { PlansManager } from "../settings/plans-manager";
import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, null, { allowAll: false });

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .in("coworking_id", cwIds)
    .order("billing_cycle")
    .order("default_price", { ascending: false });

  const cwName = coworkings.find((c) => c.id === cwIds[0])?.name ?? "—";

  if (profile.role !== "super_admin") {
    return (
      <div>
        <PageHeader title="Suscripciones" subtitle={`Catálogo de ${cwName}`} />
        <Card>
          <CardBody className="pt-5">
            <PlansList plans={plans ?? []} />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Suscripciones"
        subtitle={`Catálogo de ${cwName} · cambia de coworking en el selector superior`}
      />
      <Card>
        <CardBody className="pt-5">
          <PlansManager initial={plans ?? []} coworkingId={cwIds[0]} coworkingName={cwName} />
        </CardBody>
      </Card>
    </div>
  );
}

function PlansList({ plans }: { plans: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border border-ink-100 p-4">
          <p className="font-display text-[15px] font-semibold text-ink-900">{p.name}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-500 mt-1">
            {p.billing_cycle === "monthly" ? "Mensual" : "Pase puntual"}
          </p>
          <p className="font-display text-[20px] font-semibold text-ink-900 mt-3">{formatCurrency(p.default_price)}</p>
          <p className="text-[12px] text-ink-500">+ IVA · {p.duration_days ?? "—"} días</p>
          {p.description && <p className="mt-2 text-[12px] text-ink-600">{p.description}</p>}
        </div>
      ))}
    </div>
  );
}
