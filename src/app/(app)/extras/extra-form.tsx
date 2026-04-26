"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import type { Coworking } from "@/lib/types";

export function ExtraForm({
  coworkings, defaultCoworkingId,
}: {
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      coworking_id: fd.get("coworking_id"),
      type: fd.get("type"),
      identifier: fd.get("identifier"),
      monthly_price: Number(fd.get("monthly_price") || 0),
      status: fd.get("status"),
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const { error } = await supabase.from("extras").insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push("/extras");
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Coworking">
            <Select name="coworking_id" defaultValue={defaultCoworkingId ?? ""} required>
              {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select name="type" defaultValue="locker" required>
              <option value="locker">Taquilla</option>
              <option value="screen">Pantalla</option>
              <option value="equipment">Equipamiento</option>
              <option value="other">Otro</option>
            </Select>
          </Field>
          <Field label="Identificador"><Input name="identifier" placeholder="P-01 / T-12…" required /></Field>
          <Field label="Precio mensual (€)"><Input name="monthly_price" type="number" step="0.01" required /></Field>
          <Field label="Estado">
            <Select name="status" defaultValue="available">
              <option value="available">Disponible</option>
              <option value="rented">Alquilado</option>
              <option value="returned">Devuelto</option>
              <option value="pending">Pendiente</option>
            </Select>
          </Field>
          <div className="md:col-span-2"><Field label="Notas"><Textarea name="notes" /></Field></div>

          {error && <p className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear extra"}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
