import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setPortalCookie } from "@/lib/portal-cookie";

export const runtime = "nodejs";

// Identifica al cliente por click directo en /portal/select (escaneando el QR
// fuera de la sala). Valida que pertenece al coworking del QR y que tiene una
// suscripción vigente (incluyendo gracia 7d post-vencimiento).
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = String(body?.clientId ?? "").trim();
  const coworkingId = String(body?.coworkingId ?? "").trim();
  if (!clientId || !coworkingId) {
    return NextResponse.json({ error: "clientId y coworkingId requeridos" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, coworking_id, status")
    .eq("id", clientId)
    .eq("coworking_id", coworkingId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: "Cliente no encontrado para este coworking" },
      { status: 404 },
    );
  }

  // Sub vigente o en gracia 7d (mismo criterio que dashboard / occupancy)
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, end_date")
    .eq("client_id", clientId)
    .eq("status", "active");

  const today = new Date().toISOString().slice(0, 10);
  const graceCutoff = new Date();
  graceCutoff.setDate(graceCutoff.getDate() - 7);
  const graceISO = graceCutoff.toISOString().slice(0, 10);
  const hasValid = (subs ?? []).some(
    (s) => !s.end_date || s.end_date >= graceISO,
  );

  if (!hasValid) {
    return NextResponse.json(
      {
        error:
          "Tu suscripción no está activa. Acércate a recepción para renovar antes de reservar.",
      },
      { status: 403 },
    );
  }

  const { data: cw } = await supabase
    .from("coworkings")
    .select("name")
    .eq("id", coworkingId)
    .single();

  await setPortalCookie({
    email: client.email ?? "",
    clientId: client.id,
    name: client.name,
    coworkingId: client.coworking_id,
    coworkingName: cw?.name ?? "",
  });

  return NextResponse.json({ ok: true, name: client.name });
}
