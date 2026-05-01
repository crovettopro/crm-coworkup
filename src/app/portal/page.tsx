import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalCookie } from "@/lib/portal-cookie";
import { CalendarPlus, Clock, ArrowRight, Building2 } from "lucide-react";

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

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ coworking?: string }>;
}) {
  const params = await searchParams;
  const identity = await getPortalCookie();
  const supabase = await createClient();

  // Si la URL trae coworking (alguien escaneando un QR llegó hasta aquí), saltamos
  // directo al selector de cliente.
  if (!identity && params.coworking) {
    redirect(`/portal/select?coworking=${params.coworking}`);
  }

  // -----------------------------------------------------------------
  // Sin cookie → selector de coworking. Es el "front door" si alguien
  // llega al portal sin haber escaneado el QR de una sala concreta.
  // RPC pública (SECURITY DEFINER) — la tabla coworkings tiene RLS y
  // el portal corre sin auth Supabase.
  // -----------------------------------------------------------------
  if (!identity) {
    const { data: coworkings } = await supabase.rpc("portal_list_coworkings");

    return (
      <div className="space-y-6">
        <div>
          <p className="text-[13px] text-ink-500">Cowork Up</p>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink-950 leading-tight">
            ¿Dónde quieres reservar?
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-500">
            Elige tu coworking y luego selecciona tu nombre.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(coworkings ?? []).map((cw: any) => (
            <Link
              key={cw.id}
              href={`/portal/select?coworking=${cw.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-5 py-5 hover:border-ink-700 hover:shadow-md transition-all"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink-950 text-white shrink-0">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.08em] font-medium text-ink-500">
                  Coworking
                </p>
                <p className="text-[16px] font-semibold text-ink-950 truncate">
                  {cw.name}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-ink-900 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // Con cookie: dashboard con balance + próximas reservas
  // -----------------------------------------------------------------
  const { data: balanceArr } = await supabase.rpc(
    "client_meeting_hours_balance",
    { p_client_id: identity.clientId },
  );
  const balance = Array.isArray(balanceArr) ? balanceArr[0] : balanceArr;

  const { data: upcoming } = await supabase.rpc("quick_list_bookings", {
    p_email: identity.email,
  });

  const now = Date.now();
  const upcomingFiltered = (upcoming ?? [])
    .filter(
      (b: any) =>
        new Date(b.end_at).getTime() >= now && b.status === "confirmed",
    )
    .slice(0, 6);

  const incH = balance ? balance.included_minutes / 60 : 0;
  const remH = balance ? balance.remaining_minutes / 60 : 0;
  const usedH = balance ? balance.used_minutes / 60 : 0;
  const pct = incH > 0 ? Math.min(100, Math.round((usedH / incH) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] text-ink-500">
          Hola{identity.name ? `, ${identity.name.split(" ")[0]}` : ""}
        </p>
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
        {upcomingFiltered.length === 0 ? (
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
            {upcomingFiltered.map((b: any) => {
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
                      style={{ backgroundColor: b.room_color ?? "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-ink-950 truncate">
                        {b.room_name}
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
