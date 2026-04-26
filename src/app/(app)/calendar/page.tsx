import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings, resolveCwFilter } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarBoard } from "./calendar-board";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = await resolveCwFilter(profile, coworkings, null, { allowAll: false });

  const now = new Date();
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1); // 1-12

  // Range to fetch: include 1 month before & after to fill the visible grid edges
  const monthStart = new Date(Date.UTC(year, month - 2, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  const supabase = await createClient();
  // Events visible: those of selected coworkings OR global (coworking_id IS NULL)
  const { data: events } = await supabase
    .from("calendar_events")
    .select("*, coworkings(name)")
    .or(`coworking_id.in.(${cwIds.join(",")}),coworking_id.is.null`)
    .gte("start_date", monthStart.toISOString())
    .lte("start_date", monthEnd.toISOString())
    .order("start_date");

  return (
    <div>
      <PageHeader
        title="Calendario"
        subtitle="Eventos del coworking, festivos y alquileres externos."
      />
      <CalendarBoard
        events={events ?? []}
        year={year}
        month={month}
        coworkings={coworkings}
        canManage={profile.role === "super_admin" || profile.role === "manager"}
        defaultCoworkingId={profile.role === "super_admin" ? null : profile.coworking_id}
      />
    </div>
  );
}
