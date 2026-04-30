"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Check,
  AlertCircle,
  Users,
  X,
  Sparkles,
  Mail,
} from "lucide-react";

type Room = { id: string; name: string; capacity: number | null; color: string | null };
type Booking = { room_id: string; start_at: string; end_at: string };
type Balance = { included_minutes: number; used_minutes: number; remaining_minutes: number } | null;

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const SLOT_MIN = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MIN; // 2
const TOTAL_SLOTS = (DAY_END_HOUR - DAY_START_HOUR) * SLOTS_PER_HOUR; // 28
const ROW_PX = 44;
const HEADER_PX = 38;
const TIME_COL_PX = 56;
const DURATIONS = [30, 60, 90, 120, 180, 240];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtHM(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDur(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function slotStartIdx(d: Date) {
  return (d.getHours() - DAY_START_HOUR) * SLOTS_PER_HOUR + Math.floor(d.getMinutes() / SLOT_MIN);
}
function slotEndIdx(d: Date) {
  return (d.getHours() - DAY_START_HOUR) * SLOTS_PER_HOUR + Math.ceil(d.getMinutes() / SLOT_MIN);
}
function slotLabel(idx: number) {
  const h = DAY_START_HOUR + Math.floor(idx / SLOTS_PER_HOUR);
  const m = (idx % SLOTS_PER_HOUR) * SLOT_MIN;
  return `${pad(h)}:${pad(m)}`;
}
function slotStartTimestamp(date: string, idx: number) {
  const d = new Date(date + "T00:00:00");
  const totalMin = DAY_START_HOUR * 60 + idx * SLOT_MIN;
  d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
  return d.getTime();
}
function dayPills(today: Date, count = 7) {
  const pills: { date: string; label: string; sub: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    pills.push({
      date: isoDate(d),
      label:
        i === 0
          ? "Hoy"
          : i === 1
          ? "Mañana"
          : d.toLocaleDateString("es-ES", { weekday: "short" }),
      sub: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    });
  }
  return pills;
}

type ClickedSlot = { roomId: string; start: number; maxEnd: number };

export function BookFlow({
  prefilledEmail,
  prefilledName,
  rooms,
  bookings,
  date,
  balance,
  initialRoomId,
}: {
  prefilledEmail: string | null;
  prefilledName: string | null;
  coworkingId: string;
  rooms: Room[];
  bookings: Booking[];
  date: string;
  balance: Balance;
  initialRoomId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ClickedSlot | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    start: number;
    end: number;
    room: string;
  } | null>(null);
  const [emailInput, setEmailInput] = useState<string>(prefilledEmail ?? "");

  const today = new Date();
  const pills = useMemo(() => dayPills(today, 7), [today.toDateString()]);
  const isToday = useMemo(
    () => isSameDay(new Date(date + "T12:00:00"), new Date()),
    [date],
  );

  function setDate(newDate: string) {
    setPending(null);
    setSuccess(null);
    setError(null);
    router.push(`/portal/book?date=${newDate}`);
  }

  // Build occupancy + per-room sorted bookings (start ms)
  const { occupied, perRoomSorted } = useMemo(() => {
    const occ: boolean[][] = Array(TOTAL_SLOTS)
      .fill(null)
      .map(() => Array(rooms.length).fill(false));
    const sortedByRoom = new Map<string, { start: number; end: number }[]>();
    for (const b of bookings) {
      const colIdx = rooms.findIndex((r) => r.id === b.room_id);
      if (colIdx < 0) continue;
      const start = new Date(b.start_at);
      const end = new Date(b.end_at);
      const ss = slotStartIdx(start);
      const se = slotEndIdx(end);
      for (let s = Math.max(0, ss); s < Math.min(TOTAL_SLOTS, se); s++) {
        occ[s][colIdx] = true;
      }
      const arr = sortedByRoom.get(b.room_id) ?? [];
      arr.push({ start: start.getTime(), end: end.getTime() });
      sortedByRoom.set(b.room_id, arr);
    }
    for (const arr of sortedByRoom.values()) arr.sort((a, b) => a.start - b.start);
    return { occupied: occ, perRoomSorted: sortedByRoom };
  }, [bookings, rooms]);

  // For "is past" rendering on today
  const nowMs = Date.now();
  function isSlotPast(slotIdx: number) {
    if (!isToday) return false;
    return slotStartTimestamp(date, slotIdx) + SLOT_MIN * 60 * 1000 <= nowMs;
  }

  function openSlot(roomId: string, slotIdx: number) {
    const start = slotStartTimestamp(date, slotIdx);
    // Find next booking in this room after `start` to compute maxEnd
    const list = perRoomSorted.get(roomId) ?? [];
    let maxEnd = slotStartTimestamp(date, TOTAL_SLOTS); // end of day
    for (const b of list) {
      if (b.start > start) {
        maxEnd = Math.min(maxEnd, b.start);
        break;
      }
    }
    setPending({ roomId, start, maxEnd });
    setError(null);
    const maxMin = Math.floor((maxEnd - start) / 60000);
    const allowed = DURATIONS.filter((m) => m <= maxMin);
    setDuration(allowed[Math.min(1, allowed.length - 1)] ?? Math.min(60, maxMin));
  }

  async function handleConfirm() {
    if (!pending) return;
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Escribe tu email para confirmar.");
      return;
    }
    const start = pending.start;
    const end = start + duration * 60 * 1000;
    if (end > pending.maxEnd) {
      setError("La duración no cabe en este hueco.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/portal/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        room_id: pending.roomId,
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      let msg = "No se pudo reservar.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* ignore */
      }
      setError(msg);
      return;
    }
    const roomName = rooms.find((r) => r.id === pending.roomId)?.name ?? "Sala";
    setSuccess({ start, end, room: roomName });
    setPending(null);
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white border border-emerald-100 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="text-[22px] font-semibold text-ink-950">¡Reserva confirmada!</h2>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {success.room} · {fmtHM(success.start)}–{fmtHM(success.end)}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-500 capitalize">
          {new Date(success.start).toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setSuccess(null)}
            className="h-10 rounded-md border border-ink-200 bg-white px-4 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
          >
            Reservar otra
          </button>
          <a
            href="/portal/bookings"
            className="h-10 inline-flex items-center rounded-md bg-ink-950 px-4 text-[13px] font-semibold text-white hover:bg-ink-800"
          >
            Ver mis reservas
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Day strip */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <div className="flex gap-2">
          {pills.map((p) => {
            const active = p.date === date;
            return (
              <button
                key={p.date}
                onClick={() => setDate(p.date)}
                className={
                  "shrink-0 rounded-xl px-4 py-2.5 transition text-left min-w-[78px] " +
                  (active
                    ? "bg-ink-950 text-white shadow-sm"
                    : "bg-white border border-ink-200 hover:border-ink-300 text-ink-700")
                }
              >
                <div className="text-[10.5px] uppercase tracking-[0.06em] font-medium opacity-80 capitalize">
                  {p.label}
                </div>
                <div className="text-[14px] font-semibold capitalize mt-0.5">
                  {p.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vertical grid */}
      <DayGrid
        rooms={rooms}
        occupied={occupied}
        bookings={bookings}
        isSlotPast={isSlotPast}
        onSlotClick={openSlot}
        showCurrentTimeLine={isToday}
        date={date}
        highlightRoomId={initialRoomId}
      />

      {/* Booking sheet */}
      {pending && (
        <BookingSheet
          start={pending.start}
          maxEnd={pending.maxEnd}
          duration={duration}
          setDuration={setDuration}
          balance={balance}
          email={emailInput}
          setEmail={setEmailInput}
          rememberedName={prefilledEmail ? prefilledName : null}
          roomName={rooms.find((r) => r.id === pending.roomId)?.name ?? ""}
          busy={busy}
          error={error}
          onClose={() => {
            setPending(null);
            setError(null);
          }}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

// =====================================================================
// DayGrid: vertical grid (hora ↓, salas →) compartido cliente / staff
// =====================================================================
type BookingForGrid = {
  id?: string;
  room_id: string;
  start_at: string;
  end_at: string;
  source?: "client" | "staff" | "walk_in";
  status?: "confirmed" | "cancelled";
  walk_in_name?: string | null;
  clients?: { name: string; company_name: string | null } | null;
};

export function DayGrid({
  rooms,
  occupied,
  bookings,
  isSlotPast,
  onSlotClick,
  onBookingClick,
  showCurrentTimeLine,
  date,
  highlightRoomId,
  showBookingTitles,
}: {
  rooms: Room[];
  occupied: boolean[][];
  bookings: BookingForGrid[];
  isSlotPast?: (slotIdx: number) => boolean;
  onSlotClick: (roomId: string, slotIdx: number) => void;
  onBookingClick?: (b: BookingForGrid) => void;
  showCurrentTimeLine?: boolean;
  date: string;
  highlightRoomId?: string;
  showBookingTitles?: boolean;
}) {
  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center">
        <p className="text-[13.5px] text-ink-700 font-medium">
          No hay salas activas para este coworking.
        </p>
      </div>
    );
  }

  const totalHeight = HEADER_PX + TOTAL_SLOTS * ROW_PX;
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${TIME_COL_PX}px repeat(${rooms.length}, minmax(0, 1fr))`,
    gridTemplateRows: `${HEADER_PX}px repeat(${TOTAL_SLOTS}, ${ROW_PX}px)`,
    height: totalHeight,
  };

  // Current-time line position (only when showCurrentTimeLine)
  const now = new Date();
  let nowOffsetPx: number | null = null;
  if (showCurrentTimeLine) {
    const h = now.getHours();
    if (h >= DAY_START_HOUR && h < DAY_END_HOUR) {
      const slot = (h - DAY_START_HOUR) * SLOTS_PER_HOUR + now.getMinutes() / SLOT_MIN;
      nowOffsetPx = HEADER_PX + slot * ROW_PX;
    }
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="relative" style={gridStyle}>
        {/* Header: empty time corner */}
        <div
          className="border-b border-r border-ink-200 bg-ink-50/60 flex items-center justify-center text-[10px] font-medium uppercase tracking-[0.06em] text-ink-500"
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          Hora
        </div>

        {/* Header: room names */}
        {rooms.map((r, i) => {
          const isHighlight = highlightRoomId === r.id;
          return (
            <div
              key={r.id}
              className={
                "border-b border-ink-200 px-3 flex items-center gap-2 relative " +
                (i < rooms.length - 1 ? "border-r border-ink-200 " : "") +
                (isHighlight ? "bg-brand-50/60" : "bg-ink-50/30")
              }
              style={{ gridRow: 1, gridColumn: i + 2 }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.color ?? "#6366f1" }}
              />
              <p className="text-[13px] font-semibold text-ink-950 truncate">{r.name}</p>
              {r.capacity ? (
                <span className="text-[10.5px] text-ink-500 font-mono inline-flex items-center gap-0.5 ml-auto">
                  <Users className="h-2.5 w-2.5" /> {r.capacity}
                </span>
              ) : null}
            </div>
          );
        })}

        {/* Time labels + cells */}
        {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => (
          <SlotRow
            key={slotIdx}
            slotIdx={slotIdx}
            rooms={rooms}
            occupied={occupied}
            isSlotPast={isSlotPast?.(slotIdx) ?? false}
            onSlotClick={onSlotClick}
            highlightRoomId={highlightRoomId}
          />
        ))}

        {/* Bookings overlay */}
        {bookings
          .filter((b) => (b.status ?? "confirmed") === "confirmed")
          .map((b, idx) => {
            const colIdx = rooms.findIndex((r) => r.id === b.room_id);
            if (colIdx < 0) return null;
            const start = new Date(b.start_at);
            const end = new Date(b.end_at);
            const ss = Math.max(0, slotStartIdx(start));
            const se = Math.min(TOTAL_SLOTS, slotEndIdx(end));
            if (se <= ss) return null;
            return (
              <BookingBlock
                key={b.id ?? `${b.room_id}-${b.start_at}-${idx}`}
                booking={b}
                gridRowStart={ss + 2}
                gridRowEnd={se + 2}
                gridColumn={colIdx + 2}
                onClick={onBookingClick}
                showTitles={showBookingTitles ?? !!onBookingClick}
              />
            );
          })}

        {/* Current-time horizontal line */}
        {nowOffsetPx !== null && (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              top: nowOffsetPx,
              left: TIME_COL_PX,
              right: 0,
              height: 0,
            }}
          >
            <div className="relative">
              <div className="absolute -left-1.5 -top-[3px] h-1.5 w-1.5 rounded-full bg-red-500" />
              <div className="h-px w-full bg-red-500/80 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotRow({
  slotIdx,
  rooms,
  occupied,
  isSlotPast,
  onSlotClick,
  highlightRoomId,
}: {
  slotIdx: number;
  rooms: Room[];
  occupied: boolean[][];
  isSlotPast: boolean;
  onSlotClick: (roomId: string, slotIdx: number) => void;
  highlightRoomId?: string;
}) {
  const isHourMark = slotIdx % SLOTS_PER_HOUR === 0;
  return (
    <>
      <div
        className={
          "border-r border-ink-200 px-2 flex items-start justify-end pt-1 text-[10.5px] font-mono tabular text-ink-500 " +
          (isHourMark ? "border-t border-ink-200 font-semibold text-ink-700" : "")
        }
        style={{ gridRow: slotIdx + 2, gridColumn: 1 }}
      >
        {isHourMark ? slotLabel(slotIdx) : ""}
      </div>
      {rooms.map((r, i) => {
        const isOcc = occupied[slotIdx]?.[i];
        const isLastCol = i === rooms.length - 1;
        const isHighlight = highlightRoomId === r.id;
        const cellClass = [
          "relative",
          !isLastCol ? "border-r border-ink-200" : "",
          isHourMark ? "border-t border-ink-200" : "border-t border-ink-100",
          isHighlight ? "bg-brand-50/30" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div
            key={r.id}
            className={cellClass}
            style={{ gridRow: slotIdx + 2, gridColumn: i + 2 }}
          >
            {!isOcc && !isSlotPast && (
              <button
                onClick={() => onSlotClick(r.id, slotIdx)}
                className="absolute inset-0 transition-colors hover:bg-emerald-50 focus:bg-emerald-50 outline-none"
                aria-label={`Reservar ${r.name} a las ${slotLabel(slotIdx)}`}
              />
            )}
            {isSlotPast && (
              <div
                className="absolute inset-0 bg-ink-50/60 pointer-events-none"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function initials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function bookingTitle(b: BookingForGrid) {
  if (b.source === "walk_in") return b.walk_in_name || "Walk-in";
  if (b.clients?.company_name) return b.clients.company_name;
  return b.clients?.name || "Reservado";
}
function bookingPersonName(b: BookingForGrid) {
  if (b.source === "walk_in") return b.walk_in_name || "Walk-in";
  return b.clients?.name || "—";
}

const BLOCK_TINTS: Record<string, { bg: string; ring: string; text: string; chip: string }> = {
  client: {
    bg: "bg-brand-100/90",
    ring: "ring-brand-300",
    text: "text-brand-950",
    chip: "bg-brand-500 text-white",
  },
  staff: {
    bg: "bg-emerald-100/90",
    ring: "ring-emerald-300",
    text: "text-emerald-950",
    chip: "bg-emerald-500 text-white",
  },
  walk_in: {
    bg: "bg-amber-100/90",
    ring: "ring-amber-300",
    text: "text-amber-950",
    chip: "bg-amber-500 text-white",
  },
  occupied: {
    bg: "bg-ink-100",
    ring: "ring-ink-200",
    text: "text-ink-700",
    chip: "bg-ink-400 text-white",
  },
};

function BookingBlock({
  booking,
  gridRowStart,
  gridRowEnd,
  gridColumn,
  onClick,
  showTitles,
}: {
  booking: BookingForGrid;
  gridRowStart: number;
  gridRowEnd: number;
  gridColumn: number;
  onClick?: (b: BookingForGrid) => void;
  showTitles: boolean;
}) {
  const tint = showTitles
    ? BLOCK_TINTS[booking.source ?? "staff"] ?? BLOCK_TINTS.staff
    : BLOCK_TINTS.occupied;
  const start = new Date(booking.start_at);
  const end = new Date(booking.end_at);
  const heightRows = gridRowEnd - gridRowStart;
  const Element: any = onClick ? "button" : "div";
  return (
    <Element
      onClick={onClick ? () => onClick(booking) : undefined}
      style={{
        gridRow: `${gridRowStart} / ${gridRowEnd}`,
        gridColumn,
        margin: "2px",
        zIndex: 5,
      }}
      className={
        "relative overflow-hidden rounded-md ring-1 px-1.5 py-1 text-left flex flex-col " +
        tint.bg +
        " " +
        tint.ring +
        " " +
        tint.text +
        (onClick ? " transition-shadow hover:shadow-md cursor-pointer" : " cursor-default")
      }
      title={`${start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
    >
      {showTitles ? (
        <>
          <div className="flex items-center gap-1 min-w-0">
            {heightRows > 1 && (
              <span
                className={
                  "shrink-0 grid place-items-center h-4 w-4 rounded-full text-[8.5px] font-bold " +
                  tint.chip
                }
              >
                {initials(bookingPersonName(booking))}
              </span>
            )}
            <span className="truncate text-[11.5px] font-semibold leading-tight">
              {bookingTitle(booking)}
            </span>
          </div>
          {heightRows >= 2 && (
            <span className="text-[10px] opacity-70 font-mono leading-tight mt-0.5">
              {start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}–
              {end.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </>
      ) : (
        <span className="text-[11px] opacity-80 font-medium tracking-tight self-center my-auto">
          Ocupado
        </span>
      )}
    </Element>
  );
}

// =====================================================================
// BookingSheet (modal): reusa estilos previos, ahora con email field
// =====================================================================
function BookingSheet({
  start,
  maxEnd,
  duration,
  setDuration,
  balance,
  email,
  setEmail,
  rememberedName,
  roomName,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  start: number;
  maxEnd: number;
  duration: number;
  setDuration: (m: number) => void;
  balance: Balance;
  email: string;
  setEmail: (e: string) => void;
  rememberedName: string | null;
  roomName: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const maxMin = Math.floor((maxEnd - start) / 60000);
  const end = start + duration * 60 * 1000;
  const exceedsBalance = balance && balance.remaining_minutes - duration < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[440px] bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border-t sm:border border-ink-100 overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink-200" />
        </div>

        <div className="flex items-start justify-between px-6 pt-4 pb-2">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.08em] font-medium text-ink-500">
              Nueva reserva
            </p>
            <h3 className="mt-0.5 text-[18px] font-semibold text-ink-950">{roomName}</h3>
            <p className="text-[12.5px] text-ink-500 capitalize mt-0.5">
              {new Date(start).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="rounded-xl bg-ink-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">
                Inicio
              </p>
              <p className="text-[20px] font-semibold tabular font-mono text-ink-950">
                {fmtHM(start)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-400" />
            <div className="text-right">
              <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">
                Fin
              </p>
              <p className="text-[20px] font-semibold tabular font-mono text-ink-950">
                {fmtHM(end)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500 mb-1.5">
              Tu email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-[14.5px] text-ink-950 placeholder:text-ink-400 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
              />
            </div>
            {rememberedName && (
              <p className="mt-1 text-[11.5px] text-ink-500">
                Te tenemos como{" "}
                <span className="font-medium text-ink-700">{rememberedName}</span>
              </p>
            )}
          </div>

          <div>
            <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500 mb-2">
              Duración
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((m) => {
                const fits = m <= maxMin;
                const active = m === duration;
                return (
                  <button
                    key={m}
                    disabled={!fits}
                    onClick={() => setDuration(m)}
                    className={
                      "h-9 rounded-md px-3.5 text-[12.5px] font-medium transition border " +
                      (active
                        ? "bg-ink-950 text-white border-ink-950"
                        : fits
                        ? "bg-white text-ink-700 border-ink-200 hover:border-ink-400"
                        : "bg-ink-50 text-ink-300 border-ink-100 cursor-not-allowed line-through")
                    }
                  >
                    {fmtDur(m)}
                  </button>
                );
              })}
            </div>
            {maxMin < 60 && (
              <p className="mt-1.5 text-[11px] text-ink-500">
                Hueco máximo desde {fmtHM(start)}: {fmtDur(maxMin)}
              </p>
            )}
          </div>

          {balance && (
            <div
              className={
                "rounded-xl px-3.5 py-2.5 text-[12.5px] flex items-start gap-2 " +
                (exceedsBalance
                  ? "bg-amber-50 border border-amber-200 text-amber-900"
                  : "bg-emerald-50/70 border border-emerald-100 text-emerald-800")
              }
            >
              {exceedsBalance ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Esta reserva supera tu saldo semanal en{" "}
                    {fmtDur(Math.abs(balance.remaining_minutes - duration))}.
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Te quedarán{" "}
                    <span className="font-semibold">
                      {((balance.remaining_minutes - duration) / 60).toFixed(2)}h
                    </span>{" "}
                    esta semana después de reservar.
                  </span>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="text-[12.5px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="h-11 rounded-lg border border-ink-200 bg-white px-4 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 h-11 rounded-lg bg-ink-950 px-5 text-[13px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Reservando…" : "Confirmar reserva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
