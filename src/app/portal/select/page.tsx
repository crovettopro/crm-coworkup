import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SelectClientFlow } from "./select-flow";

export const dynamic = "force-dynamic";

export default async function PortalSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ coworking?: string; room?: string; next?: string }>;
}) {
  const params = await searchParams;
  const coworkingId = params.coworking;
  if (!coworkingId) {
    // Sin coworking → al picker de coworking
    redirect("/portal");
  }

  const supabase = await createClient();

  // Las tablas tienen RLS y el portal corre sin auth Supabase — usamos RPCs
  // SECURITY DEFINER que solo exponen lo mínimo (id+name).
  const { data: coworkings } = await supabase.rpc("portal_list_coworkings");
  const cw = (coworkings ?? []).find((c: any) => c.id === coworkingId);
  if (!cw) redirect("/portal");

  const { data: clientsRpc } = await supabase.rpc(
    "portal_clients_with_active_sub",
    { p_coworking_id: coworkingId },
  );
  const clients = ((clientsRpc ?? []) as any[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const nextUrl = params.next ?? `/portal/book?coworking=${coworkingId}${params.room ? `&room=${params.room}` : ""}`;

  return (
    <SelectClientFlow
      coworkingId={coworkingId}
      coworkingName={cw.name}
      clients={clients}
      nextUrl={nextUrl}
    />
  );
}
