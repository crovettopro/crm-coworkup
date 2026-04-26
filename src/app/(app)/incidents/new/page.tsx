import Link from "next/link";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { IncidentForm } from "../incident-form";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  return (
    <div>
      <PageHeader
        title="Nueva incidencia"
        subtitle="Registra el problema y el responsable de resolverlo."
        actions={<Link href="/incidents"><Button variant="outline">Cancelar</Button></Link>}
      />
      <div className="mx-auto max-w-[640px]">
        <IncidentForm coworkings={coworkings} defaultCoworkingId={profile.coworking_id ?? coworkings[0]?.id} currentUserId={profile.id} />
      </div>
    </div>
  );
}
