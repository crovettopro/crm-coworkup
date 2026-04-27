import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarPlus, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default async function PortalHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, coworking_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!client) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-[14px] text-amber-900 font-medium">
          Tu email no está vinculado a un cliente del coworking.
        </p>
        <p className="mt-1 text-[12.5px] text-amber-800">
          Avisa al equipo para que te dé de alta. Mientras tanto no puedes reservar.
        </p>
      </div>
    );
  }

  const { data: balanceArr } = await supabase.rpc("client_meeting_hours_balance", {
    p_client_id: client.id,
  });
  const balance = Array.isArray(balanceArr) ? balanceArr[0] : balanceArr;

  const nowISO = new Date().toISOString();
  const { data: upcoming } = await supabase
    .from("room_bookings")
    .select("id, start_at, end_at, room_id, status, meeting_rooms(name, color)")
    .eq("client_id", client.id)
    .eq("status", "confirmed")
    .gte("end_at", nowISO)
    .order("start_at", { ascending: true })
    .limit(6);

  const incH = balance ? balance.included_minutes / 60 : 0;
  const remH = balance ? balance.remaining_minutes / 60 : 0;
  const usedH = balance ? balance.used_minutes / 60 : 0;
  const pct = incH > 0 ? Math.min(100, Math.round((usedH / incH) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] text-ink-500">Hola{client.name ? `, ${client.name.split(" ")[0]}` : ""}</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink-950 leading-tight">
          Tus salas de reuniones
        </h1>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl bg-ink-950 text-white p-6 shadow-lg relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11.5px] uppercase tracking-[0.08em] text-brand-400 font-medium">
              Saldo de esta semana
            </p>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[44px] font-semibold leading-none tracking-tight">
                {remH.toFixed(remH % 1 === 0 ? 0 : 2)}
              </span>
              <span className="text-[16px] text-ink-300">de {incH.toFixed(0)}h restantes</span>
            </div>
          </div>
          <Link
            href="/portal/book"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 h-11 text-[13.5px] font-semibold text-ink-950 hover:bg-brand-400 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" /> Reservar sala
          </Link>
        </div>
        <div className="mt-5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-brand-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-ink-400">
          {usedH.toFixed(usedH % 1 === 0 ? 0 : 2)}h usadas · se renueva el lunes
        </p>
      </div>

      {/* Upcoming */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink-950">Próximas reservas</h2>
          <Link
            href="/portal/bookings"
            className="text-[12.5px] text-ink-500 hover:text-ink-900 inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!upcoming || upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-white p-6 text-center">
            <Clock className="mx-auto h-5 w-5 text-ink-400 mb-1.5" />
            <p className="text-[13.5px] text-ink-500">No tienes reservas próximas.</p>
            <Link
              href="/portal/book"
              className="inline-flex mt-3 items-center gap-1.5 text-[12.5px] font-medium text-ink-900 hover:underline"
            >
              Reservar ahora <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b: any) => {
              const s = new Date(b.start_at);
              const e = new Date(b.end_at);
              return (
                <li key={b.id}>
                  <Link
                    href="/portal/bookings"
                    className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 hover:border-ink-300 hover:shadow-sm transition"
                  >
                    <span
                      className="inline-block h-9 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: b.meeting_rooms?.color ?? "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-ink-950 truncate">
                        {b.meeting_rooms?.name}
                      </p>
                      <p className="text-[12px] text-ink-500 capitalize">{fmt(s)}</p>
                    </div>
                    <div className="text-right tabular text-[12.5px] font-mono text-ink-700">
                      {fmtTime(s)}–{fmtTime(e)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
