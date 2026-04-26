import Link from "next/link";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ClientQuickForm } from "../client-quick-form";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const writableCws = coworkings.filter((c) => c.status === "active");
  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        subtitle="Datos mínimos para crear el cliente. Puedes completar el resto después."
        actions={<Link href="/clients"><Button variant="outline">Cancelar</Button></Link>}
      />
      <div className="mx-auto max-w-[560px]">
        <ClientQuickForm coworkings={writableCws} defaultCoworkingId={profile.coworking_id ?? writableCws[0]?.id} />
      </div>
    </div>
  );
}
