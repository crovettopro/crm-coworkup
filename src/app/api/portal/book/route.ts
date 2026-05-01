import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalCookie, setPortalCookie } from "@/lib/portal-cookie";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_FOUND:
    "Ese email no está dado de alta como cliente. Avisa al equipo del coworking.",
  CLIENT_NOT_FOUND:
    "Tu identidad ha caducado. Vuelve a entrar desde el QR de la sala.",
  ROOM_NOT_FOUND: "Esa sala ya no está disponible.",
  ROOM_DIFFERENT_COWORKING:
    "Esa sala no pertenece a tu coworking.",
  INVALID_TIME_RANGE: "El rango horario es inválido.",
  DURATION_TOO_SHORT: "La duración mínima es 15 minutos.",
  DURATION_TOO_LONG: "La duración máxima es 6 horas.",
  START_IN_PAST: "No puedes reservar en el pasado.",
};

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cookie = await getPortalCookie();
  const emailFromBody = String(body?.email ?? "").trim().toLowerCase();
  // Si tenemos cookie con clientId (selector por nombre), priorizamos esa vía
  // — funciona también para clientes sin email registrado.
  const useClientId = !!cookie?.clientId && !emailFromBody;
  const email = (emailFromBody || cookie?.email || "").toLowerCase();
  const roomId = String(body?.room_id ?? "");
  const startAt = String(body?.start_at ?? "");
  const endAt = String(body?.end_at ?? "");

  if (!useClientId && (!email || !email.includes("@"))) {
    return NextResponse.json({ error: "Falta el email." }, { status: 400 });
  }
  if (!roomId || !startAt || !endAt) {
    return NextResponse.json({ error: "Faltan datos de la reserva." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = useClientId
    ? await supabase
        .rpc("quick_book_room_by_client_id", {
          p_client_id: cookie!.clientId,
          p_room_id: roomId,
          p_start_at: startAt,
          p_end_at: endAt,
        })
        .single()
    : await supabase
        .rpc("quick_book_room", {
          p_email: email,
          p_room_id: roomId,
          p_start_at: startAt,
          p_end_at: endAt,
        })
        .single();

  if (error) {
    // Postgres exception messages come through error.message
    const code = (error.message || "").trim();
    if (code === "23P01") {
      return NextResponse.json(
        { error: "Ese hueco acaba de ser reservado por otra persona. Elige otro." },
        { status: 409 },
      );
    }
    const msg = ERROR_MESSAGES[code] || error.message || "No se pudo reservar.";
    // Detect overlap exclusion at PG level (different code path)
    if (msg.toLowerCase().includes("rb_no_overlap")) {
      return NextResponse.json(
        { error: "Ese hueco acaba de ser reservado por otra persona. Elige otro." },
        { status: 409 },
      );
    }
    const status = code === "EMAIL_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  // Refresca cookie si nueva o si email cambió (solo en flujo email)
  if (!useClientId && (!cookie || cookie.email !== email)) {
    const { data: clientData } = await supabase
      .rpc("quick_get_client", { p_email: email })
      .single();
    if (clientData) {
      const c = clientData as any;
      await setPortalCookie({
        email,
        clientId: c.id,
        name: c.name,
        coworkingId: c.coworking_id,
        coworkingName: c.coworking_name ?? "",
      });
    }
  }

  return NextResponse.json({ ok: true, booking: data });
}
