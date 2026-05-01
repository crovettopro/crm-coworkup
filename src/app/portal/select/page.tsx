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

  const { data: cw } = await supabase
    .from("coworkings")
    .select("id, name")
    .eq("id", coworkingId)
    .maybeSingle();

  if (!cw) redirect("/portal");

  // Clientes con sub vigente o en gracia 7d en este coworking. La excepción
  // OV+otra ya queda cubierta porque OV cuenta como sub vigente.
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceISO = graceCutoff.toISOString().slice(0, 10);

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("client_id, end_date, plan_name, clients!inner(id, name, coworking_id)")
    .eq("status", "active")
    .or(`end_date.is.null,end_date.gte.${graceISO}`)
    .eq("clients.coworking_id", coworkingId);

  // Dedup por client_id (un cliente puede tener OV + otra → sale dos veces)
  const seen = new Set<string>();
  const clients: { id: string; name: string }[] = [];
  for (const s of (subs ?? []) as any[]) {
    const c = s.clients;
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    clients.push({ id: c.id, name: c.name });
  }
  clients.sort((a, b) => a.name.localeCompare(b.name, "es"));

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
