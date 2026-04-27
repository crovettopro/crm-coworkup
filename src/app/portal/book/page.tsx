import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookFlow } from "./book-flow";

export const dynamic = "force-dynamic";

export default async function PortalBookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, coworking_id")
    .eq("auth_user_id", user.id)
    .single();
  if (!client) redirect("/portal");

  const { data: rooms } = await supabase
    .from("meeting_rooms")
    .select("id, coworking_id, name, capacity, color, sort_order")
    .eq("coworking_id", client.coworking_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const date = params.date ?? today;
  const dayStart = new Date(date + "T00:00:00").toISOString();
  const dayEnd = new Date(date + "T23:59:59").toISOString();

  const { data: bookings } = await supabase
    .from("room_bookings")
    .select("id, room_id, start_at, end_at, client_id, source, status")
    .eq("coworking_id", client.coworking_id)
    .eq("status", "confirmed")
    .gte("start_at", dayStart)
    .lte("start_at", dayEnd);

  const { data: balanceArr } = await supabase.rpc("client_meeting_hours_balance", {
    p_client_id: client.id,
    p_week_anchor: date,
  });
  const balance = Array.isArray(balanceArr) ? balanceArr[0] : balanceArr;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink-950">Reservar sala</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          {balance
            ? `Tienes ${(balance.remaining_minutes / 60).toFixed(2)}h disponibles esta semana.`
            : "Selecciona día, sala y hora."}
        </p>
      </div>
      <BookFlow
        clientId={client.id}
        clientName={client.name}
        coworkingId={client.coworking_id}
        rooms={(rooms ?? []) as any}
        bookings={(bookings ?? []) as any}
        date={date}
        balance={balance}
      />
    </div>
  );
}
