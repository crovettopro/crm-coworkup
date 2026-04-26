import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ExtraForm } from "../extra-form";

export const dynamic = "force-dynamic";

export default async function NewExtraPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  return (
    <div>
      <PageHeader title="Nuevo extra" subtitle="Da de alta una taquilla, pantalla u otro equipamiento" />
      <ExtraForm coworkings={coworkings} defaultCoworkingId={profile.coworking_id ?? coworkings[0]?.id} />
    </div>
  );
}
