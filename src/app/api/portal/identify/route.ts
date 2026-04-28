import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setPortalCookie } from "@/lib/portal-cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("quick_get_client", { p_email: email })
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        identified: false,
        error: "Tu email no está dado de alta como cliente. Avisa al equipo del coworking.",
      },
      { status: 404 },
    );
  }

  const row = data as any;
  await setPortalCookie({
    email,
    clientId: row.id,
    name: row.name,
    coworkingId: row.coworking_id,
    coworkingName: row.coworking_name ?? "",
  });

  return NextResponse.json({
    identified: true,
    email,
    clientId: row.id,
    name: row.name,
    coworkingId: row.coworking_id,
    coworkingName: row.coworking_name ?? "",
  });
}
