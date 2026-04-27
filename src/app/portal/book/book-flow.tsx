"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Check, AlertCircle, Users } from "lucide-react";

type Room = { id: string; name: string; capacity: number | null; color: string | null };
type Booking = { id: string; room_id: string; start_at: string; end_at: string; client_id: string | null };
type Balance = { included_minutes: number; used_minutes: number; remaining_minutes: number } | null;

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const SLOT_MIN = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (DAY_END_HOUR - DAY_START_HOUR) * SLOTS_PER_HOUR;
const DURATIONS = [15, 30, 45, 60, 90, 120];

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
function slotLabel(slot: number) {
  const total = DAY_START_HOUR * 60 + slot * SLOT_MIN;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
function dateFromSlot(date: string, slot: number) {
  const total = DAY_START_HOUR * 60 + slot * SLOT_MIN;
  const d = new Date(date + "T00:00:00");
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d;
}
function slotIndexFromDate(d: Date) {
  return (d.getHours() - DAY_START_HOUR) * SLOTS_PER_HOUR + Math.floor(d.getMinutes() / SLOT_MIN);
}

export function BookFlow({
  clientId,
  clientName,
  coworkingId,
  rooms,
  bookings,
  date,
  balance,
}: {
  clientId: string;
  clientName: string;
  coworkingId: string;
  rooms: Room[];
  bookings: Booking[];
  date: string;
  balance: Balance;
}) {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.id ?? "");
  const [startSlot, setStartSlot] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setDate(newDate: string) {
    setStartSlot(null);
    setSuccess(false);
    setError(null);
    router.push(`/portal/book?date=${newDate}`);
  }

  function shiftDay(offset: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setDate(isoDate(d));
  }

  // Cálculo de slots ocupados para la sala seleccionada
  const occupiedSlots = useMemo(() => {
    const set = new Set<number>();
    if (!selectedRoom) return set;
    for (const b of bookings) {
      if (b.room_id !== selectedRoom) continue;
      const s = new Date(b.start_at);
      const e = new Date(b.end_at);
      const startIdx = Math.max(0, slotIndexFromDate(s));
      const endIdx = Math.min(
        TOTAL_SLOTS,
        Math.ceil((e.getHours() - DAY_START_HOUR) * SLOTS_PER_HOUR + e.getMinutes() / SLOT_MIN),
      );
      for (let i = startIdx; i < endIdx; i++) set.add(i);
    }
    return set;
  }, [bookings, selectedRoom]);

  const slotsNeeded = duration / SLOT_MIN;

  function isSlotSelectable(slot: number) {
    for (let i = 0; i < slotsNeeded; i++) {
      if (slot + i >= TOTAL_SLOTS) return false;
      if (occupiedSlots.has(slot + i)) return false;
    }
    // No pasado
    const d = dateFromSlot(date, slot);
    if (d.getTime() < Date.now() - 60 * 60 * 1000) return false;
    return true;
  }

  const todayISO = isoDate(new Date());

  const wouldExceed =
    balance && startSlot !== null && balance.remaining_minutes - duration < 0;

  async function handleConfirm() {
    if (startSlot === null || !selectedRoom) return;
    if (wouldExceed) {
      setError(
        `No tienes saldo suficiente esta semana. Te quedan ${(balance!.remaining_minutes / 60).toFixed(2)}h y la reserva ocupa ${(duration / 60).toFixed(2)}h.`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    const start = dateFromSlot(date, startSlot);
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const supabase = createClient();
    const { error } = await supabase.from("room_bookings").insert({
      room_id: selectedRoom,
      coworking_id: coworkingId,
      client_id: clientId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "confirmed",
      source: "client",
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("rb_no_overlap") || error.code === "23P01") {
        setError("Otra persona acaba de reservar ese hueco. Elige otro.");
      } else {
        setError(error.message);
      }
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoom);

  if (success) {
    return (
      <div className="rounded-2xl bg-white border border-emerald-100 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-[20px] font-semibold text-ink-950">¡Reserva confirmada!</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-500">
          {selectedRoomObj?.name} · {dayLabel(date)} · {slotLabel(startSlot!)}–
          {slotLabel(startSlot! + slotsNeeded)}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              setSuccess(false);
              setStartSlot(null);
            }}
            className="h-9 rounded-md border border-ink-200 bg-white px-4 text-[12.5px] font-medium text-ink-700 hover:bg-ink-50"
          >
            Reservar otra
          </button>
          <a
            href="/portal/bookings"
            className="h-9 inline-flex items-center rounded-md bg-ink-950 px-4 text-[12.5px] font-medium text-white hover:bg-ink-800"
          >
            Ver mis reservas
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Día */}
      <Section number={1} title="Elige el día">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-ink-200 bg-white hover:bg-ink-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            min={todayISO}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-ink-200 bg-white px-2.5 text-[13px] text-ink-900 hover:border-ink-300 focus:outline-none focus:border-ink-700 focus:ring-2 focus:ring-ink-100"
          />
          <button
            onClick={() => shiftDay(1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-ink-200 bg-white hover:bg-ink-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="ml-1 text-[13px] text-ink-700 capitalize">{dayLabel(date)}</div>
        </div>
      </Section>

      {/* Step 2: Sala */}
      <Section number={2} title="Elige la sala">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {rooms.map((r) => {
            const active = r.id === selectedRoom;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRoom(r.id);
                  setStartSlot(null);
                }}
                className={
                  "rounded-xl border p-3.5 text-left transition " +
                  (active
                    ? "border-ink-900 bg-ink-950 text-white"
                    : "border-ink-200 bg-white hover:border-ink-300 hover:shadow-sm")
                }
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: r.color ?? "#6366f1" }}
                  />
                  <p className="text-[13.5px] font-semibold">{r.name}</p>
                </div>
                {r.capacity ? (
                  <p
                    className={
                      "inline-flex items-center gap-1 text-[11.5px] " +
                      (active ? "text-ink-300" : "text-ink-500")
                    }
                  >
                    <Users className="h-3 w-3" /> {r.capacity} personas
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Step 3: Duración */}
      <Section number={3} title="¿Cuánto rato?">
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((m) => {
            const active = m === duration;
            return (
              <button
                key={m}
                onClick={() => {
                  setDuration(m);
                  setStartSlot(null);
                }}
                className={
                  "h-9 rounded-md border px-3.5 text-[12.5px] font-medium transition " +
                  (active
                    ? "border-ink-900 bg-ink-950 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-300")
                }
              >
                {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ` ${m % 60}m` : ""}`}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Step 4: Hora */}
      <Section number={4} title="Hora de inicio">
        {selectedRoom ? (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
            {Array.from({ length: TOTAL_SLOTS }).map((_, slot) => {
              const selectable = isSlotSelectable(slot);
              const occupied = occupiedSlots.has(slot);
              const isHour = slot % SLOTS_PER_HOUR === 0;
              const active = startSlot === slot;
              return (
                <button
                  key={slot}
                  disabled={!selectable}
                  onClick={() => setStartSlot(slot)}
                  className={
                    "h-9 rounded-md text-[12px] font-medium font-mono tabular transition " +
                    (active
                      ? "bg-ink-950 text-white"
                      : occupied
                      ? "bg-red-50 text-red-300 cursor-not-allowed line-through"
                      : !selectable
                      ? "bg-ink-50 text-ink-300 cursor-not-allowed"
                      : isHour
                      ? "bg-white text-ink-900 ring-1 ring-ink-200 hover:ring-ink-400"
                      : "bg-white text-ink-700 ring-1 ring-ink-100 hover:ring-ink-300")
                  }
                >
                  {slotLabel(slot)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-500">Selecciona una sala primero.</p>
        )}
      </Section>

      {/* Confirm */}
      {startSlot !== null && (
        <div className="rounded-2xl bg-white border border-ink-100 p-5 sticky bottom-4 shadow-md">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div>
              <p className="text-[11.5px] uppercase tracking-[0.06em] text-ink-500">Reserva</p>
              <p className="text-[15px] font-semibold text-ink-950">
                {selectedRoomObj?.name}
                <span className="text-ink-500 font-normal mx-1.5">·</span>
                <span className="capitalize">{dayLabel(date)}</span>
                <span className="text-ink-500 font-normal mx-1.5">·</span>
                <span className="font-mono">
                  {slotLabel(startSlot)}–{slotLabel(startSlot + slotsNeeded)}
                </span>
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11.5px] uppercase tracking-[0.06em] text-ink-500">Cliente</p>
              <p className="text-[13px] text-ink-900">{clientName}</p>
            </div>
          </div>
          {wouldExceed && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Esta reserva supera tu saldo semanal. Habla con el equipo del coworking para
                añadir horas o elige una más corta.
              </span>
            </div>
          )}
          {error && (
            <p className="mb-3 text-[12.5px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setStartSlot(null)}
              className="h-10 rounded-md border border-ink-200 bg-white px-4 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
            >
              Cambiar
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy || !!wouldExceed}
              className="flex-1 h-10 rounded-md bg-ink-950 px-5 text-[13px] font-semibold text-white hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Reservando…" : "Confirmar reserva"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-950 text-white text-[10.5px] font-semibold">
          {number}
        </span>
        <h2 className="text-[14px] font-semibold text-ink-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}
