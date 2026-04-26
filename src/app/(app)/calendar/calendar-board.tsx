"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Sparkles, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Coworking } from "@/lib/types";
import { suggestionsForMonth, toEventInsert } from "@/lib/valencia-events";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: "Festivo",
  community: "Comunidad",
  external_rental: "Alquiler externo",
  maintenance: "Mantenimiento",
  custom: "Otro",
  contract_start: "Inicio contrato",
  contract_end: "Fin contrato",
  renewal: "Renovación",
  payment_due: "Pago",
  invoice_due: "Factura",
  deposit_return: "Devolución fianza",
  incident_review: "Revisión incidencia",
  client_signup: "Alta cliente",
  client_churn: "Baja cliente",
};

function eventColor(type: string, custom?: string | null): string {
  if (custom) return custom;
  return ({
    holiday: "#ef4444",
    community: "#f0b429",
    external_rental: "#0ea5e9",
    maintenance: "#8b5cf6",
    custom: "#64748b",
  } as Record<string, string>)[type] ?? "#64748b";
}

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  event_type: string;
  start_date: string;
  end_date?: string | null;
  coworking_id: string | null;
  coworkings?: { name: string } | null;
  color?: string | null;
  location?: string | null;
  all_day?: boolean | null;
};

export function CalendarBoard({
  events, year, month, coworkings, canManage, defaultCoworkingId,
}: {
  events: EventRow[];
  year: number;
  month: number; // 1-12
  coworkings: Coworking[];
  canManage: boolean;
  defaultCoworkingId?: string | null;
}) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  // Build calendar grid (weeks starting Monday)
  const monthIdx = month - 1; // 0-11
  const firstOfMonth = new Date(year, monthIdx, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Mon
  const gridStart = new Date(year, monthIdx, 1 - startWeekday);
  const gridDays: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    gridDays.push(d);
  }

  // Group events by day key (YYYY-MM-DD local)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const start = new Date(e.start_date);
      const end = e.end_date ? new Date(e.end_date) : start;
      // Iterate from start to end day inclusive
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cur <= last) {
        const key = isoLocal(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  function isoLocal(d: Date) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function navigate(delta: number) {
    const d = new Date(year, monthIdx + delta, 1);
    router.push(`/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }

  function goToday() {
    const today = new Date();
    router.push(`/calendar?year=${today.getFullYear()}&month=${today.getMonth() + 1}`);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="!px-2"><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <h2 className="text-[15px] font-semibold text-ink-950 capitalize min-w-[140px] text-center tracking-tight">
            {MONTH_LABELS[monthIdx]} {year}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigate(1)} className="!px-2"><ChevronRight className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSuggest(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Sugerir fechas Valencia
            </Button>
            <Button size="sm" onClick={() => { setSelectedDay(new Date(year, monthIdx, 1)); setCreating(true); }}>
              <Plus className="h-3.5 w-3.5" /> Nuevo evento
            </Button>
          </div>
        )}
      </div>

      {/* Grid 7-col, gap 1px sobre fondo ink-200 para crear líneas finas */}
      <div className="rounded-md border border-ink-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-ink-100">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2.5 py-2 text-center text-[10.5px] uppercase tracking-[0.05em] font-medium text-ink-500"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-ink-200">
          {gridDays.map((d, i) => {
            const isCurrentMonth = d.getMonth() === monthIdx;
            const isToday = isoLocal(d) === isoLocal(new Date());
            const dayEvents = eventsByDay.get(isoLocal(d)) ?? [];
            return (
              <button
                key={i}
                onClick={() => { setSelectedDay(d); setCreating(false); }}
                className={cn(
                  "min-h-[96px] p-2 text-left transition-colors flex flex-col",
                  isCurrentMonth ? "bg-white hover:bg-ink-50/60" : "bg-ink-100 text-ink-400 hover:bg-ink-100/80",
                )}
              >
                {isToday ? (
                  <span className="inline-grid place-items-center text-[12px] font-semibold w-[22px] h-[22px] rounded-[5px] bg-ink-950 text-brand-400">
                    {d.getDate()}
                  </span>
                ) : (
                  <span className={cn(
                    "inline-flex items-center text-[12px] font-medium px-0.5",
                    isCurrentMonth ? "text-ink-700" : "text-ink-300",
                  )}>
                    {d.getDate()}
                  </span>
                )}
                <div className="mt-1.5 space-y-1 overflow-hidden flex-1">
                  {dayEvents.slice(0, 3).map((e) => {
                    const isHoliday = e.event_type === "holiday";
                    const customColor = e.color ?? null;
                    if (isHoliday) {
                      return (
                        <div
                          key={e.id}
                          className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium bg-red-50 text-red-700"
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      );
                    }
                    if (isToday && !customColor) {
                      return (
                        <div
                          key={e.id}
                          className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium bg-brand-100 text-brand-700"
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={e.id}
                        className="truncate rounded px-1.5 py-0.5 text-[11px]"
                        style={
                          customColor
                            ? {
                                background: `${customColor}15`,
                                color: customColor,
                              }
                            : undefined
                        }
                        title={e.title}
                      >
                        {!customColor ? (
                          <span className="text-ink-800">{e.title}</span>
                        ) : (
                          e.title
                        )}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-ink-500">+{dayEvents.length - 3} más</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day events drawer */}
      {selectedDay && !creating && (
        <DayDrawer
          day={selectedDay}
          events={eventsByDay.get(isoLocal(selectedDay)) ?? []}
          coworkings={coworkings}
          canManage={canManage}
          onClose={() => setSelectedDay(null)}
          onAddNew={() => setCreating(true)}
        />
      )}

      {/* Create event modal */}
      {creating && selectedDay && (
        <CreateEventModal
          day={selectedDay}
          coworkings={coworkings}
          defaultCoworkingId={defaultCoworkingId}
          onClose={() => { setCreating(false); setSelectedDay(null); }}
        />
      )}

      {/* Suggest Valencia modal */}
      {showSuggest && (
        <SuggestValenciaModal
          year={year}
          monthIdx0={monthIdx}
          coworkings={coworkings}
          defaultCoworkingId={defaultCoworkingId}
          onClose={() => setShowSuggest(false)}
        />
      )}
    </>
  );
}

function DayDrawer({
  day, events, coworkings, canManage, onClose, onAddNew,
}: {
  day: Date;
  events: EventRow[];
  coworkings: Coworking[];
  canManage: boolean;
  onClose: () => void;
  onAddNew: () => void;
}) {
  const router = useRouter();
  async function deleteEvent(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    const supabase = createClient();
    await supabase.from("calendar_events").delete().eq("id", id);
    router.refresh();
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-xl border border-ink-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-display text-[16px] font-semibold text-ink-900 capitalize">
              {day.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h3>
            <p className="text-[12px] text-ink-500">{events.length} evento{events.length === 1 ? "" : "s"}</p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-ink-500 text-center py-6">No hay eventos este día.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: eventColor(e.event_type, e.color) }} />
                        <p className="font-medium text-ink-900 text-sm">{e.title}</p>
                      </div>
                      {e.description && <p className="text-[12px] text-ink-600 mb-1">{e.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone="muted">{EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}</Badge>
                        <Badge tone={e.coworking_id ? "info" : "brand"}>
                          {e.coworking_id ? e.coworkings?.name : "Global"}
                        </Badge>
                      </div>
                    </div>
                    {canManage && (
                      <button onClick={() => deleteEvent(e.id)} className="text-ink-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {canManage && (
          <div className="px-6 py-4 border-t border-ink-100 flex justify-end">
            <Button size="sm" onClick={onAddNew}>
              <Plus className="h-3.5 w-3.5" /> Añadir evento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEventModal({
  day, coworkings, defaultCoworkingId, onClose,
}: {
  day: Date;
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"global" | "local">(defaultCoworkingId ? "local" : "global");

  function isoLocal(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const startStr = fd.get("start_date") as string;
    const endStr = fd.get("end_date") as string;
    const start = new Date(startStr + "T00:00:00");
    const end = endStr ? new Date(endStr + "T23:59:59") : new Date(startStr + "T23:59:59");
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").insert({
      title: fd.get("title"),
      description: fd.get("description") || null,
      event_type: fd.get("event_type"),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      coworking_id: scope === "global" ? null : (fd.get("coworking_id") || defaultCoworkingId),
      location: fd.get("location") || null,
      all_day: true,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-xl border border-ink-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h3 className="font-display text-[16px] font-semibold text-ink-900">Nuevo evento</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <Field label="Título"><Input name="title" required autoFocus placeholder="Ej. Cierre por Fallas" /></Field>
          <Field label="Descripción"><Textarea name="description" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="event_type" defaultValue="community">
                <option value="community">Evento del coworking</option>
                <option value="holiday">Festivo (cerrado)</option>
                <option value="external_rental">Alquiler externo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="custom">Otro</option>
              </Select>
            </Field>
            <Field label="Alcance">
              <Select value={scope} onChange={(e) => setScope(e.target.value as any)}>
                <option value="global">Global (todos los coworkings)</option>
                <option value="local">Solo un coworking</option>
              </Select>
            </Field>
            {scope === "local" && (
              <Field label="Coworking">
                <Select name="coworking_id" defaultValue={defaultCoworkingId ?? coworkings[0]?.id ?? ""}>
                  {coworkings.filter((c) => c.status !== "closed").map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Inicio"><Input name="start_date" type="date" defaultValue={isoLocal(day)} required /></Field>
            <Field label="Fin (opcional)"><Input name="end_date" type="date" defaultValue={isoLocal(day)} /></Field>
          </div>
          <Field label="Ubicación / Sala (opcional)"><Input name="location" /></Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={busy}>{busy ? "Creando…" : "Crear evento"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuggestValenciaModal({
  year, monthIdx0, coworkings, defaultCoworkingId, onClose,
}: {
  year: number;
  monthIdx0: number;
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const monthSuggestions = suggestionsForMonth(year, monthIdx0);
  // Show all year too
  const allYear = useMemo(() => {
    const map = new Map<number, ReturnType<typeof suggestionsForMonth>>();
    for (let i = 0; i < 12; i++) {
      const arr = suggestionsForMonth(year, i);
      if (arr.length) map.set(i, arr);
    }
    return Array.from(map.entries());
  }, [year]);

  const [picked, setPicked] = useState<Set<string>>(new Set(monthSuggestions.map((s) => s.title)));
  const [scope, setScope] = useState<"global" | "local">("global");
  const [coworkingId, setCoworkingId] = useState(defaultCoworkingId ?? coworkings[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function toggle(title: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  }

  async function importPicked() {
    setBusy(true);
    const supabase = createClient();
    const inserts = allYear
      .flatMap(([, arr]) => arr)
      .filter((s) => picked.has(s.title))
      .map((s) => toEventInsert(s, year, scope === "global" ? null : coworkingId));
    if (inserts.length === 0) { setBusy(false); return; }
    const { error } = await supabase.from("calendar_events").insert(inserts);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setDone(inserts.length);
    router.refresh();
    setTimeout(onClose, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
      <div className="w-full max-w-[640px] rounded-2xl bg-white shadow-xl border border-ink-100 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-display text-[16px] font-semibold text-ink-900 inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" /> Fechas relevantes en Valencia {year}
            </h3>
            <p className="text-[12px] text-ink-500 mt-0.5">Selecciona las que quieres añadir al calendario.</p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-4 border-b border-ink-100 grid grid-cols-2 gap-3">
          <Field label="Alcance">
            <Select value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <option value="global">Global (todos los coworkings)</option>
              <option value="local">Solo un coworking</option>
            </Select>
          </Field>
          {scope === "local" && (
            <Field label="Coworking">
              <Select value={coworkingId} onChange={(e) => setCoworkingId(e.target.value)}>
                {coworkings.filter((c) => c.status !== "closed").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {allYear.map(([mIdx, arr]) => (
            <div key={mIdx}>
              <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-2 capitalize">{MONTH_LABELS[mIdx]}</p>
              <div className="space-y-1.5">
                {arr.map((s) => {
                  const checked = picked.has(s.title);
                  return (
                    <label key={s.title} className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition",
                      checked ? "border-ink-900 bg-ink-50" : "border-ink-100 hover:border-ink-200"
                    )}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(s.title)} className="h-4 w-4" />
                      <span className="text-base">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900">{s.title}</p>
                        <p className="text-[11px] text-ink-500 truncate">{s.description}</p>
                      </div>
                      <Badge tone={s.event_type === "holiday" ? "danger" : "warning"}>
                        {s.event_type === "holiday" ? "Festivo" : "Comunidad"}
                      </Badge>
                      <span className="text-[11px] text-ink-500 font-mono">
                        {String(s.startDay).padStart(2, "0")}/{String(s.startMonth).padStart(2, "0")}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-between">
          <p className="text-[12px] text-ink-500">{picked.size} seleccionados</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="button" size="sm" disabled={busy || picked.size === 0} onClick={importPicked}>
              {done ? `✓ Añadidos ${done}` : busy ? "Importando…" : `Añadir ${picked.size} eventos`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
