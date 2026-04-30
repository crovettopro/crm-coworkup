import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalCookie } from "@/lib/portal-cookie";
import { BookFlow } from "./book-flow";

export const dynamic = "force-dynamic";

export default async function PortalBookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; room?: string; coworking?: string }>;
}) {
  const params = await searchParams;
  const cookie = await getPortalCookie();
  const supabase = await createClient();

  // 1) Determinar coworking. Prioridad: ?coworking= > ?room= > cookie.
  //    Si no hay ninguno, mandamos a identificarse (necesitamos saber qué
  //    salas mostrar). Antes el ?room= pre-seleccionaba una sola sala;
  //    ahora con la vista de grid mostramos ambas siempre, y `room` sólo
  //    se usa para resaltarla visualmente.
  let coworkingId: string | null = null;
  let initialRoomId: string | null = null;

  if (params.coworking) {
    coworkingId = params.coworking;
  }
  if (!coworkingId && params.room) {
    const { data: r } = await supabase
      .rpc("room_info", { p_room_id: params.room })
      .single();
    if (r) {
      const row = r as any;
      initialRoomId = row.id;
      coworkingId = row.coworking_id;
    }
  } else if (params.room) {
    initialRoomId = params.room;
  }
  if (!coworkingId && cookie) {
    coworkingId = cookie.coworkingId;
  }
  if (!coworkingId) {
    redirect("/portal/login?next=/portal/book");
  }

  const { data: rooms } = await supabase.rpc("rooms_for_coworking", {
    p_coworking_id: coworkingId,
  });

  const today = new Date().toISOString().slice(0, 10);
  const date = params.date ?? today;

  const { data: bookings } = await supabase.rpc("coworking_bookings_for_day", {
    p_coworking_id: coworkingId,
    p_day: date,
  });

  let balance: any = null;
  if (cookie) {
    const { data: balanceArr } = await supabase.rpc(
      "client_meeting_hours_balance",
      { p_client_id: cookie.clientId, p_week_anchor: date },
    );
    balance = Array.isArray(balanceArr) ? balanceArr[0] : balanceArr;
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink-950">
          Reservar sala
        </h1>
        <p className="mt-1 text-[13px] text-ink-500">
          {balance
            ? `Tienes ${(balance.remaining_minutes / 60).toFixed(2)}h disponibles esta semana.`
            : "Pulsa un hueco libre y te pediremos sólo el email para confirmar."}
        </p>
      </div>
      <BookFlow
        prefilledEmail={cookie?.email ?? null}
        prefilledName={cookie?.name ?? null}
        coworkingId={coworkingId}
        rooms={(rooms ?? []) as any}
        bookings={(bookings ?? []) as any}
        date={date}
        balance={balance}
        initialRoomId={
          initialRoomId && (rooms ?? []).some((r: any) => r.id === initialRoomId)
            ? initialRoomId
            : undefined
        }
      />
    </div>
  );
}
