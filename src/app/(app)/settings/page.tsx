import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CoworkingsManager } from "./coworkings-manager";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getProfile();
  const isSuper = profile.role === "super_admin";
  const coworkings = await getVisibleCoworkings(profile);
  const supabase = await createClient();
  const { data: profiles } = isSuper
    ? await supabase.from("profiles").select("*").order("created_at")
    : { data: [profile] };

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle={isSuper ? "Coworkings y usuarios. Las suscripciones se gestionan en su propia sección." : "Tu información"}
      />

      <div className="space-y-5">
        {isSuper && (
          <Card>
            <CardHeader><CardTitle>Coworkings</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <CoworkingsManager initial={coworkings} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Usuarios internos</CardTitle></CardHeader>
          <CardBody className="pt-0">
            <UsersManager initial={profiles ?? []} coworkings={coworkings} canManage={isSuper} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
