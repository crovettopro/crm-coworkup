"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seg, SegButton } from "@/components/ui/seg";
import { BookingDialog } from "./booking-dialog";
import { DayGrid } from "@/app/portal/book/book-flow";

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

const SLOT_MIN = 30;

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
function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}
function formatMin(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function RoomsBoard({
  date,
  rooms,
  bookings,
  clients,
  coworkingId,
  openMin,
  closeMin,
}: {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  clients: ClientLite[];
  coworkingId: string;
  openMin: number;
  closeMin: number;
}) {
  const totalSlots = Math.max(0, Math.floor((closeMin - openMin) / SLOT_MIN));
  const openHours = (closeMin - openMin) / 60;
  const router = useRouter();
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; roomId?: string; startSlot?: number }
    | { mode: "edit"; booking: Booking }
    | null
  >(null);

  const todayISO = isoDate(new Date());
  const isToday = date === todayISO;

  // Live re-render every minute when viewing today (current-time line)
  const [, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, [isToday]);

  // Day stats
  const stats = useMemo(() => {
    const totalMin = bookings.reduce((acc, b) => {
      const ms = new Date(b.end_at).getTime() - new Date(b.start_at).getTime();
      return acc + ms / 60000;
    }, 0);
    const capacityMin = rooms.length * (closeMin - openMin);
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

  // Occupancy matrix (slot × room)
  const occupied = useMemo(() => {
    const occ: boolean[][] = Array(totalSlots)
      .fill(null)
      .map(() => Array(rooms.length).fill(false));
    for (const b of bookings) {
      if (b.status !== "confirmed") continue;
      const colIdx = rooms.findIndex((r) => r.id === b.room_id);
      if (colIdx < 0) continue;
      const ss = Math.floor((minutesOfDay(new Date(b.start_at)) - openMin) / SLOT_MIN);
      const se = Math.ceil((minutesOfDay(new Date(b.end_at)) - openMin) / SLOT_MIN);
      for (let s = Math.max(0, ss); s < Math.min(totalSlots, se); s++) {
        occ[s][colIdx] = true;
      }
    }
    return occ;
  }, [bookings, rooms, openMin, totalSlots]);

  function goDay(offsetDays: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offsetDays);
    router.push(`/rooms?date=${isoDate(d)}`);
  }
  function goDate(d: string) {
    router.push(`/rooms?date=${d}`);
  }

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
        <Link
          href="/rooms/qr"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 text-[12.5px] font-medium text-ink-700 hover:bg-ink-50"
          title="Imprimir QR de este coworking"
        >
          <QrCode className="h-3.5 w-3.5" /> QR
        </Link>
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
            sub={`Sobre ${(rooms.length * openHours).toFixed(openHours % 1 === 0 ? 0 : 1)}h disponibles`}
          />
          <StatCard
            label="Ocupación"
            value={`${stats.utilization}%`}
            sub={`del horario ${formatMin(openMin)} – ${formatMin(closeMin)}`}
            accent={stats.utilization >= 50 ? "ok" : undefined}
          />
          <StatCard
            label="Salas activas"
            value={String(rooms.length)}
            sub={rooms.map((r) => r.name).join(" · ")}
          />
        </div>
      )}

      <DayGrid
        rooms={rooms as any}
        occupied={occupied}
        bookings={bookings as any}
        isSlotPast={() => false}
        onSlotClick={(roomId, slotIdx) =>
          setDialogState({ mode: "create", roomId, startSlot: slotIdx })
        }
        onBookingClick={(b) =>
          setDialogState({ mode: "edit", booking: b as any })
        }
        showCurrentTimeLine={isToday}
        date={date}
        showBookingTitles={true}
        openMin={openMin}
        closeMin={closeMin}
      />

      {dialogState && (
        <BookingDialog
          mode={dialogState.mode}
          rooms={rooms}
          clients={clients}
          coworkingId={coworkingId}
          date={date}
          prefillRoomId={dialogState.mode === "create" ? dialogState.roomId : undefined}
          prefillStartSlot={
            dialogState.mode === "create" ? dialogState.startSlot : undefined
          }
          existing={dialogState.mode === "edit" ? dialogState.booking : undefined}
          slotMin={SLOT_MIN}
          dayStartHour={openMin / 60}
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
