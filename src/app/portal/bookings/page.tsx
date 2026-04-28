import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalCookie } from "@/lib/portal-cookie";
import { BookingsList } from "./bookings-list";

export const dynamic = "force-dynamic";

export default async function PortalBookingsPage() {
  const identity = await getPortalCookie();
  if (!identity) {
    redirect("/portal/login?next=/portal/bookings");
  }

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("quick_list_bookings", {
    p_email: identity.email,
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink-950">Mis reservas</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Próximas y pasadas. Puedes cancelar las próximas.
        </p>
      </div>
      <BookingsList rows={(rows ?? []) as any} />
    </div>
  );
}
