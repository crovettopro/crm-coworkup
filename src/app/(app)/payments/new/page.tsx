import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentForm } from "../payment-form";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = profile.role === "super_admin" ? coworkings.map((c) => c.id) : [profile.coworking_id!];
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company_name, coworking_id")
    .in("coworking_id", cwIds)
    .order("name");
  return (
    <div>
      <PageHeader title="Nuevo pago" />
      <PaymentForm clients={clients ?? []} defaultClientId={params.client} />
    </div>
  );
}
