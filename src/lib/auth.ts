import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Profile, Coworking } from "@/lib/types";

export const ACTIVE_CW_COOKIE = "active_cw";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !data) {
    // The trigger should have created this row; if not, force logout
    redirect("/login");
  }
  return data as Profile;
}

export async function getVisibleCoworkings(profile: Profile): Promise<Coworking[]> {
  const supabase = await createClient();
  let query = supabase.from("coworkings").select("*").order("name");
  if (profile.role !== "super_admin" && profile.coworking_id) {
    query = query.eq("id", profile.coworking_id);
  }
  const { data } = await query;
  return (data ?? []) as Coworking[];
}

export async function resolveCwFilter(
  profile: Profile,
  coworkings: Coworking[],
  cwParam?: string | null,
  options: { allowAll?: boolean } = { allowAll: true },
): Promise<string[]> {
  if (profile.role !== "super_admin" && profile.coworking_id) {
    return [profile.coworking_id];
  }
  let value = cwParam;
  if (!value) {
    const cookieStore = await cookies();
    value = cookieStore.get(ACTIVE_CW_COOKIE)?.value ?? null;
  }
  if (!value || value === "all") {
    if (options.allowAll) return coworkings.map((c) => c.id);
    return coworkings[0] ? [coworkings[0].id] : [];
  }
  return [value];
}

export async function getActiveCw(profile: Profile): Promise<string | "all"> {
  if (profile.role !== "super_admin" && profile.coworking_id) return profile.coworking_id;
  const cookieStore = await cookies();
  return (cookieStore.get(ACTIVE_CW_COOKIE)?.value as any) ?? "all";
}
