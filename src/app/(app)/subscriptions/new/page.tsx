import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SubscriptionForm } from "../subscription-form";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = profile.role === "super_admin" ? coworkings.map((c) => c.id) : [profile.coworking_id!];

  const supabase = await createClient();
  const [{ data: clients }, { data: plans }] = await Promise.all([
    supabase.from("clients").select("id, name, company_name, coworking_id").in("coworking_id", cwIds).order("name"),
    supabase.from("plans").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Nueva suscripción" subtitle="Asigna un plan a un cliente" />
      <SubscriptionForm
        coworkings={coworkings}
        clients={clients ?? []}
        plans={plans ?? []}
        defaultClientId={params.client}
      />
    </div>
  );
}
