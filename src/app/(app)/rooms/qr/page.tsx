import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { QrPosters } from "./qr-posters";

export const dynamic = "force-dynamic";

export default async function RoomsQrPage() {
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = coworkings.map((c) => c.id);

  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("meeting_rooms")
    .select("id, name, color, capacity, coworking_id, sort_order")
    .in("coworking_id", cwIds.length ? cwIds : [""])
    .eq("is_active", true)
    .order("coworking_id", { ascending: true })
    .order("sort_order", { ascending: true });

  const cwMap = new Map(coworkings.map((c) => [c.id, c.name]));
  const enriched = (rooms ?? []).map((r: any) => ({
    ...r,
    coworking_name: cwMap.get(r.coworking_id) ?? "",
  }));

  // IMPORTANTE: nunca usar VERCEL_URL aquí — es la URL del deploy actual,
  // y en previews queda hardcodeada en el QR impreso (que entonces apunta a
  // ese build viejo para siempre). Usar siempre el dominio de producción.
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://crm-coworkup.vercel.app";

  return <QrPosters rooms={enriched} baseUrl={baseUrl} />;
}
