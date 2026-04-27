import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookingsList } from "./bookings-list";

export const dynamic = "force-dynamic";

export default async function PortalBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!client) redirect("/portal");

  const { data: rows } = await supabase
    .from("room_bookings")
    .select("id, start_at, end_at, status, source, notes, room_id, meeting_rooms(name, color, capacity)")
    .eq("client_id", client.id)
    .order("start_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink-950">Mis reservas</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Próximas y pasadas. Puedes cancelar las próximas.
        </p>
      </div>
      <BookingsList rows={(rows ?? []) as any} />
    </div>
  );
}
