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

  // Validación + datos del cliente vía RPC SECURITY DEFINER (las tablas
  // tienen RLS y el portal corre sin auth Supabase).
  const { data, error } = await supabase
    .rpc("portal_validate_client", {
      p_client_id: clientId,
      p_coworking_id: coworkingId,
    })
    .single();

  if (error) {
    const code = (error.message || "").trim();
    if (code === "CLIENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Cliente no encontrado para este coworking" },
        { status: 404 },
      );
    }
    if (code === "NO_ACTIVE_SUB") {
      return NextResponse.json(
        {
          error:
            "Tu suscripción no está activa. Acércate a recepción para renovar antes de reservar.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: error.message || "No se pudo validar el cliente." },
      { status: 400 },
    );
  }

  const row = data as any;
  await setPortalCookie({
    email: row.client_email ?? "",
    clientId: row.client_id,
    name: row.client_name,
    coworkingId,
    coworkingName: row.coworking_name ?? "",
  });

  return NextResponse.json({ ok: true, name: row.client_name });
}
