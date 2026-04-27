"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { X, Trash2, AlertCircle } from "lucide-react";

type Room = { id: string; name: string; capacity: number | null; color: string | null };
type ClientLite = { id: string; name: string; company_name: string | null; coworking_id: string };

type ExistingBooking = {
  id: string;
  room_id: string;
  client_id: string | null;
  walk_in_name: string | null;
  start_at: string;
  end_at: string;
  source: "client" | "staff" | "walk_in";
  notes: string | null;
};

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateAndTimeToISOLocal(date: string, time: string) {
  // date: yyyy-mm-dd, time: HH:MM
  return `${date}T${time}:00`;
}

export function BookingDialog({
  mode,
  rooms,
  clients,
  coworkingId,
  date,
  prefillRoomId,
  prefillStartSlot,
  existing,
  slotMin,
  dayStartHour,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  rooms: Room[];
  clients: ClientLite[];
  coworkingId: string;
  date: string;
  prefillRoomId?: string;
  prefillStartSlot?: number;
  existing?: ExistingBooking;
  slotMin: number;
  dayStartHour: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit" && !!existing;

  const initialDate = isEdit ? existing!.start_at.slice(0, 10) : date;
  const initialTime = useMemo(() => {
    if (isEdit) {
      const d = new Date(existing!.start_at);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    if (prefillStartSlot !== undefined) {
      const total = dayStartHour * 60 + prefillStartSlot * slotMin;
      return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
    }
    return "10:00";
  }, [isEdit, existing, prefillStartSlot, dayStartHour, slotMin]);

  const initialDuration = useMemo(() => {
    if (isEdit) {
      const s = new Date(existing!.start_at).getTime();
      const e = new Date(existing!.end_at).getTime();
      return Math.round((e - s) / 60000);
    }
    return 60;
  }, [isEdit, existing]);

  const [bookingDate, setBookingDate] = useState(initialDate);
  const [bookingTime, setBookingTime] = useState(initialTime);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [roomId, setRoomId] = useState<string>(
    isEdit ? existing!.room_id : prefillRoomId || rooms[0]?.id || "",
  );
  const [isWalkIn, setIsWalkIn] = useState<boolean>(
    isEdit ? existing!.source === "walk_in" : false,
  );
  const [clientId, setClientId] = useState<string>(
    isEdit && existing!.client_id ? existing!.client_id : "",
  );
  const [clientSearch, setClientSearch] = useState<string>("");
  const [walkInName, setWalkInName] = useState<string>(
    isEdit && existing!.walk_in_name ? existing!.walk_in_name : "",
  );
  const [walkInEmail, setWalkInEmail] = useState<string>("");
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>(isEdit ? existing!.notes ?? "" : "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<{
    included_minutes: number;
    used_minutes: number;
    remaining_minutes: number;
  } | null>(null);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 8);
    const q = clientSearch.trim().toLowerCase();
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company_name || "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [clientSearch, clients]);

  const selectedClient = clients.find((c) => c.id === clientId);

  useEffect(() => {
    let alive = true;
    if (!clientId || isWalkIn) {
      setBalance(null);
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("client_meeting_hours_balance", {
        p_client_id: clientId,
        p_week_anchor: bookingDate,
      });
      if (!alive) return;
      if (error) {
        setBalance(null);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setBalance({
          included_minutes: row.included_minutes,
          used_minutes: row.used_minutes,
          remaining_minutes: row.remaining_minutes,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [clientId, isWalkIn, bookingDate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!roomId) {
      setError("Selecciona una sala.");
      setBusy(false);
      return;
    }
    if (!isWalkIn && !clientId) {
      setError("Selecciona un cliente o marca walk-in.");
      setBusy(false);
      return;
    }
    if (isWalkIn && !walkInName.trim()) {
      setError("Indica el nombre del walk-in.");
      setBusy(false);
      return;
    }

    const startISO = dateAndTimeToISOLocal(bookingDate, bookingTime);
    const start = new Date(startISO);
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const supabase = createClient();

    if (isEdit) {
      const { error: updErr } = await supabase
        .from("room_bookings")
        .update({
          room_id: roomId,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          notes: notes || null,
        })
        .eq("id", existing!.id);
      if (updErr) {
        setError(updErr.message);
        setBusy(false);
        return;
      }
    } else {
      const payload: any = {
        room_id: roomId,
        coworking_id: coworkingId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "confirmed",
        source: isWalkIn ? "walk_in" : "staff",
        notes: notes || null,
      };
      if (isWalkIn) {
        payload.walk_in_name = walkInName.trim();
        payload.walk_in_email = walkInEmail.trim() || null;
        payload.walk_in_phone = walkInPhone.trim() || null;
      } else {
        payload.client_id = clientId;
      }
      const { error: insErr } = await supabase.from("room_bookings").insert(payload);
      if (insErr) {
        if (insErr.message.toLowerCase().includes("rb_no_overlap") || insErr.code === "23P01") {
          setError("Esa sala ya tiene una reserva que se solapa con esta hora.");
        } else {
          setError(insErr.message);
        }
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onSaved();
  }

  async function handleCancel() {
    if (!existing) return;
    if (!confirm("¿Cancelar esta reserva? Liberará la sala.")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("room_bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", existing.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
  }

  const balanceMins = duration;
  const wouldRemain = balance ? balance.remaining_minutes - balanceMins : null;
  const overdraft = !isWalkIn && balance && wouldRemain !== null && wouldRemain < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-xl border border-ink-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
          <h2 className="font-display text-[16px] font-semibold text-ink-900">
            {isEdit ? "Reserva" : "Nueva reserva"}
          </h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 text-left">
          <Field label="Sala">
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.capacity ? ` · ${r.capacity}p` : ""}
                </option>
              ))}
            </Select>
          </Field>

          {!isEdit && (
            <div className="flex items-center gap-2 rounded-md border border-ink-200 bg-ink-50/40 px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setIsWalkIn(false);
                }}
                className={
                  "h-7 rounded-md px-3 text-[12.5px] font-medium transition " +
                  (!isWalkIn
                    ? "bg-white text-ink-950 shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-ink-500 hover:text-ink-900")
                }
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsWalkIn(true);
                  setClientId("");
                }}
                className={
                  "h-7 rounded-md px-3 text-[12.5px] font-medium transition " +
                  (isWalkIn
                    ? "bg-white text-ink-950 shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-ink-500 hover:text-ink-900")
                }
              >
                Walk-in
              </button>
              <span className="ml-auto text-[11.5px] text-ink-500">
                {isWalkIn
                  ? "Persona externa, no descuenta horas"
                  : "Cliente del coworking, descuenta de su saldo"}
              </span>
            </div>
          )}

          {!isWalkIn ? (
            <Field label="Cliente">
              {!clientId ? (
                <div>
                  <Input
                    placeholder="Buscar por nombre o empresa…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  {filteredClients.length > 0 && (
                    <div className="mt-1 rounded-md border border-ink-200 bg-white shadow-overlay max-h-56 overflow-y-auto">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[13px] text-ink-800 hover:bg-ink-50"
                          onClick={() => {
                            setClientId(c.id);
                            setClientSearch("");
                          }}
                        >
                          <div className="font-medium text-ink-950">{c.name}</div>
                          {c.company_name && (
                            <div className="text-[11.5px] text-ink-500">{c.company_name}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 h-8">
                  <div className="truncate text-[13px] text-ink-900">
                    {selectedClient?.name}
                    {selectedClient?.company_name && (
                      <span className="ml-1.5 text-[11.5px] text-ink-500">
                        · {selectedClient.company_name}
                      </span>
                    )}
                  </div>
                  {!isEdit && (
                    <button
                      type="button"
                      className="text-[11.5px] text-ink-500 hover:text-ink-900 underline"
                      onClick={() => setClientId("")}
                    >
                      cambiar
                    </button>
                  )}
                </div>
              )}
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre">
                <Input
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  required
                  placeholder="Nombre y apellidos"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={walkInEmail}
                  onChange={(e) => setWalkInEmail(e.target.value)}
                  placeholder="opcional"
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="opcional"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha">
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Hora inicio">
              <Input
                type="time"
                step={slotMin * 60}
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                required
              />
            </Field>
            <Field label="Duración">
              <Select
                value={String(duration)}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ` ${m % 60}m` : ""}`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {balance && !isWalkIn && (
            <div
              className={
                "rounded-md px-3 py-2 text-[12.5px] " +
                (overdraft
                  ? "border border-amber-200 bg-amber-50 text-amber-900"
                  : "border border-ink-100 bg-ink-50/50 text-ink-700")
              }
            >
              <div className="flex items-center justify-between">
                <span>Saldo semanal del cliente</span>
                <span className="tabular font-medium">
                  {(balance.remaining_minutes / 60).toFixed(2)}h restantes ·{" "}
                  {(balance.included_minutes / 60).toFixed(0)}h totales
                </span>
              </div>
              {overdraft && (
                <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
                  <AlertCircle className="h-3 w-3" />
                  Esta reserva excede el saldo en{" "}
                  {(Math.abs(wouldRemain!) / 60).toFixed(2)}h. El admin puede confirmarla igual.
                </div>
              )}
            </div>
          )}

          <Field label="Notas">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={busy}
                className="text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Cancelar reserva
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Guardando…" : isEdit ? "Guardar" : "Reservar"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
