"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/types";
import { Calendar, X } from "lucide-react";

export function ScheduleBajaPanel({ client, canRevert }: { client: Client; canRevert: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "schedule" | "now">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scheduleBaja(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    const reason = fd.get("reason") as string;
    const supabase = createClient();
    const { error } = await supabase.from("clients")
      .update({ scheduled_end_date: date, cancellation_reason: reason || null })
      .eq("id", client.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setMode("idle");
    router.refresh();
  }

  async function bajaNow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm("¿Confirmar la baja inmediata? Se cancelarán las suscripciones activas.")) return;
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const reason = fd.get("reason") as string;
    const today = new Date().toISOString().slice(0, 10);
    const supabase = createClient();
    const [c, s] = await Promise.all([
      supabase.from("clients").update({
        status: "inactive",
        end_date: today,
        scheduled_end_date: null,
        cancellation_reason: reason || null,
      }).eq("id", client.id),
      supabase.from("subscriptions").update({ status: "cancelled", end_date: today }).eq("client_id", client.id).eq("status", "active"),
    ]);
    setBusy(false);
    if (c.error || s.error) { setError(c.error?.message ?? s.error?.message ?? "Error"); return; }
    setMode("idle");
    router.refresh();
  }

  async function cancelScheduled() {
    if (!confirm("¿Cancelar la baja programada?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("clients").update({ scheduled_end_date: null }).eq("id", client.id);
    setBusy(false);
    router.refresh();
  }

  async function reactivate() {
    if (!confirm("¿Reactivar este cliente? Volverá a estado pendiente.")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("clients").update({
      status: "pending",
      end_date: null,
      cancellation_reason: null,
    }).eq("id", client.id);
    setBusy(false);
    router.refresh();
  }

  // Already inactive
  if (client.status === "inactive") {
    return (
      <Card>
        <CardHeader><CardTitle>Baja</CardTitle></CardHeader>
        <CardBody className="pt-0 space-y-2">
          <p className="text-sm">
            <Badge tone="neutral">Cliente de baja</Badge>
            <span className="ml-2 text-ink-500">desde {formatDate(client.end_date)}</span>
          </p>
          {client.cancellation_reason && (
            <p className="text-[12px] text-ink-600">Motivo: {client.cancellation_reason}</p>
          )}
          {canRevert && (
            <Button size="sm" variant="outline" onClick={reactivate} disabled={busy}>Reactivar</Button>
          )}
        </CardBody>
      </Card>
    );
  }

  // Already has scheduled baja
  if (client.scheduled_end_date) {
    return (
      <Card>
        <CardHeader><CardTitle>Baja programada</CardTitle></CardHeader>
        <CardBody className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-medium text-ink-900">{formatDate(client.scheduled_end_date)}</span>
            </span>
            <button onClick={cancelScheduled} className="text-[12px] text-ink-500 hover:text-ink-900 inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Cancelar
            </button>
          </div>
          {client.cancellation_reason && (
            <p className="text-[12px] text-ink-600 bg-ink-50 rounded-lg p-2">Motivo: {client.cancellation_reason}</p>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Dar de baja</CardTitle></CardHeader>
      <CardBody className="pt-0 space-y-3">
        {mode === "idle" && (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => setMode("schedule")} className="w-full">
              <Calendar className="h-3.5 w-3.5" /> Programar
            </Button>
            <Button size="sm" variant="danger" onClick={() => setMode("now")} className="w-full border border-red-600">
              Baja inmediata
            </Button>
          </div>
        )}

        {mode === "schedule" && (
          <form onSubmit={scheduleBaja} className="space-y-3">
            <Field label="Fecha efectiva">
              <Input name="date" type="date" required min={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Motivo (opcional)">
              <Textarea name="reason" placeholder="Mudanza, cierre de empresa…" />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Programar"}</Button>
            </div>
          </form>
        )}

        {mode === "now" && (
          <form onSubmit={bajaNow} className="space-y-3">
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
              ⚠ Esto cancelará las suscripciones activas y marcará al cliente como baja hoy mismo.
            </p>
            <Field label="Motivo">
              <Textarea name="reason" required placeholder="Mudanza, cierre de empresa…" />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>Cancelar</Button>
              <Button type="submit" size="sm" variant="danger" disabled={busy}>{busy ? "Procesando…" : "Confirmar baja"}</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
