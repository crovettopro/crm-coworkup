import { NextResponse } from "next/server";
import { getPortalCookie } from "@/lib/portal-cookie";

export const runtime = "nodejs";

export async function GET() {
  const id = await getPortalCookie();
  if (!id) return NextResponse.json({ identified: false });
  return NextResponse.json({
    identified: true,
    email: id.email,
    clientId: id.clientId,
    name: id.name,
    coworkingId: id.coworkingId,
    coworkingName: id.coworkingName,
  });
}
