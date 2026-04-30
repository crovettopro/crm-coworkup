import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { RoomsBoard } from "./rooms-board";

export const dynamic = "force-dynamic";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ cw?: string; date?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, params.cw, { allowAll: false });
  const activeCw = cwIds[0];

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const date = params.date ?? today;

  const { data: rooms } = await supabase
    .from("meeting_rooms")
    .select("id, coworking_id, name, capacity, color, sort_order, is_active")
    .eq("coworking_id", activeCw)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  // Horario de apertura del coworking activo
  const { data: cwRow } = await supabase
    .from("coworkings")
    .select("open_min, close_min")
    .eq("id", activeCw)
    .single();
  const openMin = (cwRow as any)?.open_min ?? 480;
  const closeMin = (cwRow as any)?.close_min ?? 1320;

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;
  const { data: bookings } = await supabase
    .from("room_bookings")
    .select(
      "id, room_id, client_id, walk_in_name, start_at, end_at, status, source, notes, clients(name, company_name)",
    )
    .eq("coworking_id", activeCw)
    .eq("status", "confirmed")
    .gte("start_at", new Date(dayStart).toISOString())
    .lte("start_at", new Date(dayEnd).toISOString())
    .order("start_at", { ascending: true });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company_name, coworking_id")
    .eq("coworking_id", activeCw)
    .in("status", ["active", "pending", "overdue"])
    .order("name", { ascending: true });

  return (
    <div>
      <PageHeader title="Salas" subtitle="Reservas del día" />
      <RoomsBoard
        date={date}
        rooms={(rooms ?? []) as any}
        bookings={(bookings ?? []) as any}
        clients={(clients ?? []) as any}
        coworkingId={activeCw}
        openMin={openMin}
        closeMin={closeMin}
      />
    </div>
  );
}
