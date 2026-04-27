"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seg, SegButton } from "@/components/ui/seg";
import { BookingDialog } from "./booking-dialog";

type Room = {
  id: string;
  coworking_id: string;
  name: string;
  capacity: number | null;
  color: string | null;
  sort_order: number | null;
};

type Booking = {
  id: string;
  room_id: string;
  client_id: string | null;
  walk_in_name: string | null;
  start_at: string;
  end_at: string;
  status: "confirmed" | "cancelled";
  source: "client" | "staff" | "walk_in";
  notes: string | null;
  clients?: { name: string; company_name: string | null } | null;
};

type ClientLite = { id: string; name: string; company_name: string | null; coworking_id: string };

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const SLOT_MIN = 15;
const SLOT_PX = 24;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (DAY_END_HOUR - DAY_START_HOUR) * SLOTS_PER_HOUR;
const ROOM_COL_PX = 168;
const ROW_PX = 64;
const HEADER_PX = 38;

function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayLabel(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}
function slotIndexFromDate(d: Date) {
  return (d.getHours() - DAY_START_HOUR) * SLOTS_PER_HOUR + Math.floor(d.getMinutes() / SLOT_MIN);
}
function endSlotFromDate(d: Date) {
  return Math.ceil((d.getHours() - DAY_START_HOUR) * SLOTS_PER_HOUR + d.getMinutes() / SLOT_MIN);
}
function initials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SOURCE_TINT: Record<
  string,
  { bg: string; ring: string; text: string; chipBg: string; chipText: string }
> = {
  client: {
    bg: "bg-brand-100/90",
    ring: "ring-brand-300",
    text: "text-brand-950",
    chipBg: "bg-brand-500",
    chipText: "text-white",
  },
  staff: {
    bg: "bg-emerald-100/90",
    ring: "ring-emerald-300",
    text: "text-emerald-950",
    chipBg: "bg-emerald-500",
    chipText: "text-white",
  },
  walk_in: {
    bg: "bg-amber-100/90",
    ring: "ring-amber-300",
    text: "text-amber-950",
    chipBg: "bg-amber-500",
    chipText: "text-white",
  },
};

export function RoomsBoard({
  date,
  rooms,
  bookings,
  clients,
  coworkingId,
}: {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  clients: ClientLite[];
  coworkingId: string;
}) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; roomId?: string; startSlot?: number }
    | { mode: "edit"; booking: Booking }
    | null
  >(null);

  const todayISO = isoDate(new Date());
  const isToday = date === todayISO;

  // Live current-time line (only for today)
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, [isToday]);

  const headerSlots = useMemo(() => {
    const arr: { slot: number; isHour: boolean; label: string }[] = [];
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      const min = (s % SLOTS_PER_HOUR) * SLOT_MIN;
      const isHour = min === 0;
      const h = DAY_START_HOUR + Math.floor(s / SLOTS_PER_HOUR);
      arr.push({ slot: s, isHour, label: isHour ? `${pad(h)}:00` : "" });
    }
    return arr;
  }, []);

  // Day stats
  const stats = useMemo(() => {
    const totalMin = bookings.reduce((acc, b) => {
      const ms = new Date(b.end_at).getTime() - new Date(b.start_at).getTime();
      return acc + ms / 60000;
    }, 0);
    const capacityMin = rooms.length * (DAY_END_HOUR - DAY_START_HOUR) * 60;
    const utilization = capacityMin > 0 ? Math.round((totalMin / capacityMin) * 100) : 0;
    const walkIns = bookings.filter((b) => b.source === "walk_in").length;
    const clientBookings = bookings.filter((b) => b.source === "client").length;
    const staffBookings = bookings.filter((b) => b.source === "staff").length;
    return {
      count: bookings.length,
      hours: totalMin / 60,
      utilization,
      walkIns,
      clientBookings,
      staffBookings,
    };
  }, [bookings, rooms.length]);

  function goDay(offsetDays: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offsetDays);
    router.push(`/rooms?date=${isoDate(d)}`);
  }
  function goDate(d: string) {
    router.push(`/rooms?date=${d}`);
  }

  function bookingTitle(b: Booking) {
    if (b.source === "walk_in") return b.walk_in_name || "Walk-in";
    if (b.clients?.company_name) return b.clients.company_name;
    return b.clients?.name || "Reserva";
  }
  function bookingPersonName(b: Booking) {
    if (b.source === "walk_in") return b.walk_in_name || "Walk-in";
    return b.clients?.name || "—";
  }

  const timelineWidth = TOTAL_SLOTS * SLOT_PX;

  // Current-time x position
  const nowX = useMemo(() => {
    if (!isToday) return null;
    const h = now.getHours();
    if (h < DAY_START_HOUR || h >= DAY_END_HOUR) return null;
    const slot =
      (h - DAY_START_HOUR) * SLOTS_PER_HOUR + now.getMinutes() / SLOT_MIN;
    return slot * SLOT_PX;
  }, [isToday, now]);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
          onClick={() => goDay(-1)}
          aria-label="Día anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[14px] font-semibold capitalize text-ink-950 min-w-[180px]">
          {dayLabel(date)}
        </div>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
          onClick={() => goDay(1)}
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <Seg>
          <SegButton active={date === todayISO} onClick={() => goDate(todayISO)}>
            Hoy
          </SegButton>
        </Seg>
        <input
          type="date"
          value={date}
          onChange={(e) => goDate(e.target.value)}
          className="h-8 rounded-md border border-ink-200 bg-white px-2 text-[12.5px] text-ink-900 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
        />
        <div className="ml-auto flex items-center gap-3 text-[11.5px] text-ink-500">
          <Legend tone="brand" label="Cliente" />
          <Legend tone="emerald" label="Staff" />
          <Legend tone="amber" label="Walk-in" />
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setDialogState({ mode: "create" })}
          className="ml-1"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva reserva
        </Button>
      </div>

      {/* Stats strip */}
      {rooms.length > 0 && (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            label="Reservas"
            value={String(stats.count)}
            sub={`${stats.clientBookings} cliente · ${stats.staffBookings} staff · ${stats.walkIns} walk-in`}
          />
          <StatCard
            label="Horas reservadas"
            value={`${stats.hours.toFixed(stats.hours % 1 === 0 ? 0 : 1)}h`}
            sub={`Sobre ${rooms.length * (DAY_END_HOUR - DAY_START_HOUR)}h disponibles`}
          />
          <StatCard
            label="Ocupación"
            value={`${stats.utilization}%`}
            sub="del horario 08:00 – 22:00"
            accent={stats.utilization >= 50 ? "ok" : undefined}
          />
          <StatCard
            label="Salas activas"
            value={String(rooms.length)}
            sub={rooms.map((r) => r.name).join(" · ")}
          />
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-12 text-center text-[13px] text-ink-500">
          No hay salas registradas para este coworking. Aplica la migration 0006 para crearlas.
        </div>
      ) : (
        <div className="rounded-xl border border-ink-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex">
            {/* Sticky room column */}
            <div
              className="shrink-0 border-r border-ink-200 bg-white"
              style={{ width: ROOM_COL_PX }}
            >
              <div
                className="border-b border-ink-200 bg-ink-50/60 px-3 flex items-center text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-500"
                style={{ height: HEADER_PX }}
              >
                Sala
              </div>
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-ink-200 px-3 flex items-center gap-2.5 relative"
                  style={{ height: ROW_PX }}
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: r.color ?? "#6366f1" }}
                  />
                  <div className="min-w-0 flex-1 ml-1.5">
                    <p className="truncate text-[13.5px] font-semibold text-ink-950 leading-tight">
                      {r.name}
                    </p>
                    {r.capacity ? (
                      <p className="text-[11px] text-ink-500 leading-tight mt-0.5">
                        {r.capacity} personas
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Scrollable timeline */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: timelineWidth, position: "relative" }}>
                {/* Time header */}
                <div
                  className="flex border-b border-ink-200 bg-ink-50/30"
                  style={{ height: HEADER_PX }}
                >
                  {headerSlots.map((h) => (
                    <div
                      key={h.slot}
                      style={{ width: SLOT_PX }}
                      className={
                        "shrink-0 text-center text-[10.5px] font-mono text-ink-500 flex items-center justify-center " +
                        (h.isHour ? "border-l border-ink-200" : "")
                      }
                    >
                      {h.label}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {rooms.map((room) => {
                  const items = bookings.filter((b) => b.room_id === room.id);
                  return (
                    <div
                      key={room.id}
                      className="relative border-b border-ink-200"
                      style={{ height: ROW_PX, width: timelineWidth }}
                    >
                      {/* Slot background grid (clickable) */}
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: TOTAL_SLOTS }).map((_, slot) => {
                          const isHour = slot % SLOTS_PER_HOUR === 0;
                          return (
                            <button
                              key={slot}
                              onClick={() =>
                                setDialogState({
                                  mode: "create",
                                  roomId: room.id,
                                  startSlot: slot,
                                })
                              }
                              style={{ width: SLOT_PX }}
                              className={
                                "h-full shrink-0 transition-colors hover:bg-brand-50/70 " +
                                (isHour ? "border-l border-ink-200" : "")
                              }
                              aria-label={`Reservar ${room.name}`}
                            />
                          );
                        })}
                      </div>

                      {/* Bookings */}
                      {items.map((b) => {
                        const start = new Date(b.start_at);
                        const end = new Date(b.end_at);
                        const startSlot = Math.max(
                          0,
                          Math.min(TOTAL_SLOTS, slotIndexFromDate(start)),
                        );
                        const endSlot = Math.max(
                          startSlot + 1,
                          Math.min(TOTAL_SLOTS, endSlotFromDate(end)),
                        );
                        const left = startSlot * SLOT_PX;
                        const width = (endSlot - startSlot) * SLOT_PX - 2;
                        const tint = SOURCE_TINT[b.source] ?? SOURCE_TINT.staff;
                        const wide = width >= 96;
                        return (
                          <button
                            key={b.id}
                            onClick={() => setDialogState({ mode: "edit", booking: b })}
                            style={{ left: left + 1, width, top: 5, bottom: 5 }}
                            className={
                              "absolute group overflow-hidden rounded-md text-left ring-1 transition-all hover:shadow-md hover:-translate-y-px flex items-center gap-1.5 px-1.5 " +
                              tint.bg +
                              " " +
                              tint.ring +
                              " " +
                              tint.text
                            }
                            title={`${fmtTime(start)} → ${fmtTime(end)} · ${bookingTitle(
                              b,
                            )}`}
                          >
                            {wide && (
                              <span
                                className={
                                  "shrink-0 grid place-items-center h-6 w-6 rounded-full text-[10px] font-bold " +
                                  tint.chipBg +
                                  " " +
                                  tint.chipText
                                }
                              >
                                {initials(bookingPersonName(b))}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-[11.5px] font-semibold leading-tight">
                                {bookingTitle(b)}
                              </div>
                              {wide && (
                                <div className="truncate text-[10.5px] opacity-75 leading-tight font-mono">
                                  {fmtTime(start)}–{fmtTime(end)}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Current-time vertical line */}
                {nowX !== null && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-10"
                    style={{ left: nowX }}
                  >
                    <div className="h-full w-px bg-red-500/80 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
                    <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {dialogState && (
        <BookingDialog
          mode={dialogState.mode}
          rooms={rooms}
          clients={clients}
          coworkingId={coworkingId}
          date={date}
          prefillRoomId={dialogState.mode === "create" ? dialogState.roomId : undefined}
          prefillStartSlot={dialogState.mode === "create" ? dialogState.startSlot : undefined}
          existing={dialogState.mode === "edit" ? dialogState.booking : undefined}
          slotMin={SLOT_MIN}
          dayStartHour={DAY_START_HOUR}
          onClose={() => setDialogState(null)}
          onSaved={() => {
            setDialogState(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "ok";
}) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3.5 py-2.5">
      <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-[20px] font-semibold tracking-tight tabular " +
          (accent === "ok" ? "text-emerald-700" : "text-ink-950")
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-500 truncate" title={sub}>
        {sub}
      </p>
    </div>
  );
}

function Legend({
  tone,
  label,
}: {
  tone: "brand" | "emerald" | "amber";
  label: string;
}) {
  const cls =
    tone === "brand"
      ? "bg-brand-400"
      : tone === "emerald"
      ? "bg-emerald-400"
      : "bg-amber-400";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={"inline-block h-1.5 w-1.5 rounded-full " + cls} /> {label}
    </span>
  );
}
