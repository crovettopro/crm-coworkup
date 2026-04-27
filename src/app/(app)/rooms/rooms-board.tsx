"use client";

import { useMemo, useState } from "react";
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
const ROOM_COL_PX = 160;
const ROW_PX = 56;

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

const SOURCE_TINT: Record<string, { bg: string; ring: string; text: string }> = {
  client: { bg: "bg-brand-100/80", ring: "ring-brand-300", text: "text-brand-900" },
  staff: { bg: "bg-emerald-100/80", ring: "ring-emerald-300", text: "text-emerald-900" },
  walk_in: { bg: "bg-amber-100/80", ring: "ring-amber-300", text: "text-amber-900" },
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

  function goDay(offsetDays: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offsetDays);
    router.push(`/rooms?date=${isoDate(d)}`);
  }
  function goDate(d: string) {
    router.push(`/rooms?date=${d}`);
  }
  const todayISO = isoDate(new Date());

  function bookingTitle(b: Booking) {
    if (b.source === "walk_in") return b.walk_in_name || "Walk-in";
    if (b.clients?.company_name) return b.clients.company_name;
    return b.clients?.name || "Reserva";
  }

  const timelineWidth = TOTAL_SLOTS * SLOT_PX;

  return (
    <div>
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

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-12 text-center text-[13px] text-ink-500">
          No hay salas registradas para este coworking. Aplica la migration 0006 para crearlas.
        </div>
      ) : (
        <div className="rounded-lg border border-ink-200 bg-white overflow-hidden">
          <div className="flex">
            {/* Sticky room column */}
            <div className="shrink-0 border-r border-ink-200 bg-white" style={{ width: ROOM_COL_PX }}>
              {/* Header cell */}
              <div
                className="border-b border-ink-200 bg-ink-50/60 px-3 flex items-center text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-500"
                style={{ height: 36 }}
              >
                Sala
              </div>
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-ink-200 px-3 flex items-center gap-2"
                  style={{ height: ROW_PX }}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: r.color ?? "#6366f1" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-950 leading-tight">
                      {r.name}
                    </p>
                    {r.capacity ? (
                      <p className="text-[11px] text-ink-500 leading-tight mt-0.5">
                        {r.capacity}p
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Scrollable timeline */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: timelineWidth }}>
                {/* Time header */}
                <div className="flex border-b border-ink-200 bg-ink-50/30" style={{ height: 36 }}>
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
                                "h-full shrink-0 transition-colors hover:bg-brand-50 " +
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
                        const startSlot = Math.max(0, Math.min(TOTAL_SLOTS, slotIndexFromDate(start)));
                        const endSlot = Math.max(
                          startSlot + 1,
                          Math.min(TOTAL_SLOTS, endSlotFromDate(end)),
                        );
                        const left = startSlot * SLOT_PX;
                        const width = (endSlot - startSlot) * SLOT_PX - 2;
                        const tint = SOURCE_TINT[b.source] ?? SOURCE_TINT.staff;
                        return (
                          <button
                            key={b.id}
                            onClick={() => setDialogState({ mode: "edit", booking: b })}
                            style={{ left: left + 1, width, top: 4, bottom: 4 }}
                            className={
                              "absolute overflow-hidden rounded-md px-2 text-left text-[11.5px] font-medium ring-1 transition-shadow hover:shadow-md " +
                              tint.bg +
                              " " +
                              tint.ring +
                              " " +
                              tint.text
                            }
                            title={`${fmtTime(start)} → ${fmtTime(end)} · ${bookingTitle(b)}`}
                          >
                            <div className="truncate leading-tight">{bookingTitle(b)}</div>
                            <div className="truncate text-[10.5px] opacity-75 leading-tight font-mono">
                              {fmtTime(start)}–{fmtTime(end)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
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

function Legend({ tone, label }: { tone: "brand" | "emerald" | "amber"; label: string }) {
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
