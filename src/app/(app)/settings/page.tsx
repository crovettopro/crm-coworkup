import Link from "next/link";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Seg, SegLink } from "@/components/ui/seg";
import { Button } from "@/components/ui/button";
import { CoworkingsManager } from "./coworkings-manager";
import { UsersManager } from "./users-manager";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

type Tab = "coworkings" | "users" | "import";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const isSuper = profile.role === "super_admin";
  const coworkings = await getVisibleCoworkings(profile);
  const supabase = await createClient();
  const { data: profiles } = isSuper
    ? await supabase.from("profiles").select("*").order("created_at")
    : { data: [profile] };

  const tab: Tab = params.tab === "users" || params.tab === "import" ? params.tab : "coworkings";

  function tabHref(t: Tab) {
    return t === "coworkings" ? "/settings" : `/settings?tab=${t}`;
  }

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle={isSuper ? "Coworkings, usuarios e importación CSV" : "Tu información"}
      />

      <div className="mb-3.5">
        <Seg>
          {isSuper && <SegLink href={tabHref("coworkings")} active={tab === "coworkings"}>Coworkings</SegLink>}
          <SegLink href={tabHref("users")} active={tab === "users"}>Usuarios</SegLink>
          {isSuper && <SegLink href={tabHref("import")} active={tab === "import"}>Importar CSV</SegLink>}
        </Seg>
      </div>

      {tab === "coworkings" && isSuper && (
        <Card>
          <CardHeader>
            <CardTitle>Coworkings</CardTitle>
            <span className="text-[12px] text-ink-500">{coworkings.length}</span>
          </CardHeader>
          <CardBody>
            <CoworkingsManager initial={coworkings} />
          </CardBody>
        </Card>
      )}

      {tab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle>Usuarios internos</CardTitle>
            <span className="text-[12px] text-ink-500">{profiles?.length ?? 0}</span>
          </CardHeader>
          <CardBody>
            <UsersManager initial={profiles ?? []} coworkings={coworkings} canManage={isSuper} />
          </CardBody>
        </Card>
      )}

      {tab === "import" && isSuper && (
        <div className="rounded-md border border-dashed border-ink-300 bg-white px-12 py-14 text-center">
          <p className="text-[14px] font-semibold text-ink-900">Importar clientes y pagos desde CSV</p>
          <p className="mt-1 text-[13px] text-ink-500">
            Sube un archivo .csv con tus históricos para hacer una importación masiva (idempotente).
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/import">
              <Button size="sm" variant="primary">
                <Download className="h-3.5 w-3.5" /> Ir al importador
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-[11.5px] text-ink-400">
            Tip: el script python en <span className="font-mono">import_data/import.py</span> también permite import vía API.
          </p>
        </div>
      )}
    </div>
  );
}
