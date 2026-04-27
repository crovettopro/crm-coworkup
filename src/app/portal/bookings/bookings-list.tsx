"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CalendarPlus, Clock, X } from "lucide-react";

type Row = {
  id: string;
  start_at: string;
  end_at: string;
  status: "confirmed" | "cancelled";
  source: "client" | "staff" | "walk_in";
  notes: string | null;
  meeting_rooms: { name: string; color: string | null; capacity: number | null };
};

function fmt(d: Date) {
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function BookingsList({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = Date.now();

  const upcoming = rows.filter((r) => new Date(r.end_at).getTime() >= now && r.status === "confirmed");
  const past = rows.filter((r) => new Date(r.end_at).getTime() < now || r.status === "cancelled");

  async function cancelBooking(id: string) {
    if (!confirm("¿Cancelar esta reserva? Recuperarás las horas.")) return;
    setBusyId(id);
    const supabase = createClient();
    await supabase
      .from("room_bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[13.5px] font-semibold text-ink-950 mb-2.5">Próximas</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-white p-6 text-center">
            <Clock className="mx-auto h-5 w-5 text-ink-400 mb-1.5" />
            <p className="text-[13px] text-ink-500">No tienes reservas próximas.</p>
            <Link
              href="/portal/book"
              className="inline-flex mt-3 items-center gap-1.5 text-[12.5px] font-medium text-ink-900 hover:underline"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Reservar ahora
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b) => {
              const s = new Date(b.start_at);
              const e = new Date(b.end_at);
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5"
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
                    {b.notes && (
                      <p className="text-[11.5px] text-ink-500 italic mt-0.5 truncate">
                        {b.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right tabular text-[12.5px] font-mono text-ink-700 mr-1">
                    {fmtTime(s)}–{fmtTime(e)}
                  </div>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    disabled={busyId === b.id}
                    title="Cancelar"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-[13.5px] font-semibold text-ink-950 mb-2.5">Histórico</h2>
          <ul className="space-y-1.5">
            {past.map((b) => {
              const s = new Date(b.start_at);
              const e = new Date(b.end_at);
              const isCancelled = b.status === "cancelled";
              return (
                <li
                  key={b.id}
                  className={
                    "flex items-center gap-3 rounded-lg border border-ink-100 bg-white/60 p-3 " +
                    (isCancelled ? "opacity-60" : "")
                  }
                >
                  <span
                    className="inline-block h-7 w-1 rounded-full shrink-0"
                    style={{ backgroundColor: b.meeting_rooms?.color ?? "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-ink-700 truncate">
                      {b.meeting_rooms?.name}
                      {isCancelled && (
                        <span className="ml-2 text-[10.5px] font-normal italic text-ink-500">
                          (cancelada)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-ink-500 capitalize">{fmt(s)}</p>
                  </div>
                  <div className="text-right tabular text-[11.5px] font-mono text-ink-500">
                    {fmtTime(s)}–{fmtTime(e)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
