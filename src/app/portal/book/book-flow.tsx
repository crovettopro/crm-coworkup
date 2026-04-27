"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Users,
  Clock,
  Lock,
  X,
  Sparkles,
} from "lucide-react";

type Room = { id: string; name: string; capacity: number | null; color: string | null };
type Booking = { id: string; room_id: string; start_at: string; end_at: string; client_id: string | null };
type Balance = { included_minutes: number; used_minutes: number; remaining_minutes: number } | null;

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const SLOT_MIN = 15;
const DURATIONS = [30, 45, 60, 90, 120, 180];

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
function snap15Up(ts: number) {
  const d = new Date(ts);
  const m = d.getMinutes();
  const add = (15 - (m % 15)) % 15;
  d.setMinutes(m + add, 0, 0);
  return d.getTime();
}
function dayBounds(date: string) {
  const start = new Date(date + "T00:00:00");
  start.setHours(DAY_START_HOUR, 0, 0, 0);
  const end = new Date(date + "T00:00:00");
  end.setHours(DAY_END_HOUR, 0, 0, 0);
  return { start: start.getTime(), end: end.getTime() };
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type TimelineItem =
  | { kind: "free"; start: number; end: number }
  | { kind: "busy"; start: number; end: number };

function buildTimeline(bookings: Booking[], roomId: string, date: string): TimelineItem[] {
  const { start: dayStart, end: dayEnd } = dayBounds(date);
  const isToday = isSameDay(new Date(date + "T12:00:00"), new Date());
  const minStart = isToday ? Math.max(dayStart, snap15Up(Date.now())) : dayStart;
  if (minStart >= dayEnd) return [];

  const sorted = bookings
    .filter((b) => b.room_id === roomId)
    .map((b) => ({
      start: new Date(b.start_at).getTime(),
      end: new Date(b.end_at).getTime(),
    }))
    .filter((b) => b.end > minStart && b.start < dayEnd)
    .sort((a, b) => a.start - b.start);

  const items: TimelineItem[] = [];
  let cursor = minStart;
  for (const b of sorted) {
    const bs = Math.max(b.start, minStart);
    const be = Math.min(b.end, dayEnd);
    if (bs > cursor) items.push({ kind: "free", start: cursor, end: bs });
    items.push({ kind: "busy", start: bs, end: be });
    cursor = Math.max(cursor, b.end);
    if (cursor >= dayEnd) break;
  }
  if (cursor < dayEnd) items.push({ kind: "free", start: cursor, end: dayEnd });

  return items.filter((i) => i.end - i.start >= SLOT_MIN * 60 * 1000);
}

function dayPills(today: Date, count = 7) {
  const pills: { date: string; label: string; sub: string; isToday: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label =
      i === 0
        ? "Hoy"
        : i === 1
        ? "Mañana"
        : d.toLocaleDateString("es-ES", { weekday: "short" });
    pills.push({
      date: isoDate(d),
      label,
      sub: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      isToday: i === 0,
    });
  }
  return pills;
}

export function BookFlow({
  clientId,
  clientName,
  coworkingId,
  rooms,
  bookings,
  date,
  balance,
  initialRoomId,
}: {
  clientId: string;
  clientName: string;
  coworkingId: string;
  rooms: Room[];
  bookings: Booking[];
  date: string;
  balance: Balance;
  initialRoomId?: string;
}) {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<string>(
    initialRoomId ?? rooms[0]?.id ?? "",
  );
  const [pendingChunk, setPendingChunk] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    start: number;
    end: number;
    room: string;
  } | null>(null);

  const today = new Date();
  const pills = useMemo(() => dayPills(today, 7), [today.toDateString()]);

  function setDate(newDate: string) {
    setPendingChunk(null);
    setSuccess(null);
    setError(null);
    router.push(`/portal/book?date=${newDate}`);
  }

  const items = useMemo(
    () => (selectedRoom ? buildTimeline(bookings, selectedRoom, date) : []),
    [bookings, selectedRoom, date],
  );

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoom);

  function openChunk(chunk: { start: number; end: number }) {
    const maxMin = Math.floor((chunk.end - chunk.start) / 60000);
    const allowed = DURATIONS.filter((m) => m <= maxMin);
    setDuration(allowed[allowed.length - 1] ?? Math.min(60, maxMin));
    setPendingChunk(chunk);
    setError(null);
  }

  async function handleConfirm() {
    if (!pendingChunk || !selectedRoom) return;
    const start = pendingChunk.start;
    const end = start + duration * 60 * 1000;
    if (end > pendingChunk.end) {
      setError("La duración no cabe en este hueco.");
      return;
    }
    if (balance && balance.remaining_minutes - duration < 0) {
      setError(
        `No tienes saldo suficiente. Te quedan ${(balance.remaining_minutes / 60).toFixed(2)}h y la reserva ocupa ${(duration / 60).toFixed(2)}h.`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insErr } = await supabase.from("room_bookings").insert({
      room_id: selectedRoom,
      coworking_id: coworkingId,
      client_id: clientId,
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      status: "confirmed",
      source: "client",
    });
    setBusy(false);
    if (insErr) {
      if (
        insErr.message.toLowerCase().includes("rb_no_overlap") ||
        insErr.code === "23P01"
      ) {
        setError("Otra persona acaba de reservar ese hueco. Elige otro.");
      } else {
        setError(insErr.message);
      }
      return;
    }
    setSuccess({
      start,
      end,
      room: selectedRoomObj?.name ?? "Sala",
    });
    setPendingChunk(null);
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

      {/* Room selector */}
      {rooms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {rooms.map((r) => {
            const active = r.id === selectedRoom;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRoom(r.id);
                  setPendingChunk(null);
                }}
                className={
                  "inline-flex items-center gap-2 h-10 rounded-xl px-4 transition border " +
                  (active
                    ? "bg-ink-950 text-white border-ink-950"
                    : "bg-white text-ink-800 border-ink-200 hover:border-ink-300")
                }
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color ?? "#6366f1" }}
                />
                <span className="text-[13.5px] font-semibold">{r.name}</span>
                {r.capacity ? (
                  <span
                    className={
                      "inline-flex items-center gap-1 text-[11.5px] font-mono " +
                      (active ? "text-ink-300" : "text-ink-500")
                    }
                  >
                    <Users className="h-3 w-3" /> {r.capacity}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-ink-950">
            Huecos disponibles
          </h2>
          {selectedRoomObj && (
            <span className="text-[11.5px] text-ink-500">
              {selectedRoomObj.name}
              {selectedRoomObj.capacity ? ` · ${selectedRoomObj.capacity}p` : ""}
            </span>
          )}
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <Clock className="mx-auto h-6 w-6 text-ink-400 mb-2" />
            <p className="text-[13.5px] text-ink-700 font-medium">
              No quedan huecos en {selectedRoomObj?.name ?? "esta sala"}.
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              Prueba otro día o cambia de sala.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it, idx) =>
              it.kind === "free" ? (
                <li key={idx}>
                  <button
                    onClick={() => openChunk(it)}
                    className="group w-full rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-300 transition p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200/80 transition">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-emerald-950 tabular font-mono">
                          {fmtHM(it.start)}
                          <span className="text-emerald-700 font-normal mx-1">→</span>
                          {fmtHM(it.end)}
                        </p>
                        <p className="text-[12px] text-emerald-700">
                          {fmtDur((it.end - it.start) / 60000)} libre · pulsa para reservar
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-emerald-700 shrink-0" />
                    </div>
                  </button>
                </li>
              ) : (
                <li key={idx}>
                  <div className="rounded-2xl bg-ink-50 border border-ink-100 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-medium text-ink-700 tabular font-mono">
                          {fmtHM(it.start)}
                          <span className="text-ink-400 font-normal mx-1">→</span>
                          {fmtHM(it.end)}
                        </p>
                        <p className="text-[11.5px] text-ink-500">Ocupado</p>
                      </div>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {/* Booking sheet */}
      {pendingChunk && (
        <BookingSheet
          chunk={pendingChunk}
          duration={duration}
          setDuration={setDuration}
          balance={balance}
          clientName={clientName}
          roomName={selectedRoomObj?.name ?? ""}
          busy={busy}
          error={error}
          onClose={() => {
            setPendingChunk(null);
            setError(null);
          }}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

function BookingSheet({
  chunk,
  duration,
  setDuration,
  balance,
  clientName,
  roomName,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  chunk: { start: number; end: number };
  duration: number;
  setDuration: (m: number) => void;
  balance: Balance;
  clientName: string;
  roomName: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const maxMin = Math.floor((chunk.end - chunk.start) / 60000);
  const end = chunk.start + duration * 60 * 1000;
  const exceedsBalance =
    balance && balance.remaining_minutes - duration < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[440px] bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border-t sm:border border-ink-100 overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink-200" />
        </div>

        <div className="flex items-start justify-between px-6 pt-4 pb-2">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.08em] font-medium text-ink-500">
              Nueva reserva
            </p>
            <h3 className="mt-0.5 text-[18px] font-semibold text-ink-950">
              {roomName}
            </h3>
            <p className="text-[12.5px] text-ink-500 capitalize mt-0.5">
              {new Date(chunk.start).toLocaleDateString("es-ES", {
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
          {/* Time summary */}
          <div className="rounded-xl bg-ink-50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-ink-500">
                Inicio
              </p>
              <p className="text-[20px] font-semibold tabular font-mono text-ink-950">
                {fmtHM(chunk.start)}
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

          {/* Duration chips */}
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
            {maxMin < 30 && (
              <p className="mt-1.5 text-[11px] text-ink-500">
                Hueco máximo: {fmtDur(maxMin)}
              </p>
            )}
          </div>

          {/* Balance hint */}
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
                    Habla con el equipo si necesitas ampliar.
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

          {/* Reserved as */}
          <p className="text-[11.5px] text-ink-500">
            A nombre de <span className="font-medium text-ink-800">{clientName}</span>
          </p>

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
              disabled={busy || !!exceedsBalance}
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
