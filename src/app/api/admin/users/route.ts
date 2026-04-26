import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Solo super admin" }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, password, role, coworking_id } = body;
  if (!email || !password || !role) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // The trigger created the profile with default role. Now upgrade to the chosen role and assign coworking.
  await admin.from("profiles").update({
    role,
    coworking_id: coworking_id || null,
    name,
    invited_by: user.id,
  }).eq("id", created.user!.id);

  return NextResponse.json({ ok: true, id: created.user!.id });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Solo super admin" }, { status: 403 });

  const body = await req.json();
  const { id, role, coworking_id, name } = body;
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role, coworking_id: coworking_id || null, name }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return NextResponse.json({ error: "Solo super admin" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (id === user.id) return NextResponse.json({ error: "No puedes borrarte a ti mismo" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
