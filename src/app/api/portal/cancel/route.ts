import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalCookie } from "@/lib/portal-cookie";

export const runtime = "nodejs";

const ERRS: Record<string, string> = {
  EMAIL_NOT_FOUND: "Tu email no está dado de alta.",
  BOOKING_NOT_FOUND: "Esa reserva no existe.",
  NOT_OWNER: "Esa reserva no es tuya.",
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
  const email = (emailFromBody || cookie?.email || "").toLowerCase();
  const bookingId = String(body?.booking_id ?? "");

  if (!email) return NextResponse.json({ error: "Falta el email." }, { status: 400 });
  if (!bookingId) return NextResponse.json({ error: "Falta booking_id." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("quick_cancel_booking", {
    p_email: email,
    p_booking_id: bookingId,
  });

  if (error) {
    const code = (error.message || "").trim();
    const msg = ERRS[code] || "No se pudo cancelar.";
    const status = code === "EMAIL_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
  return NextResponse.json({ ok: true });
}
