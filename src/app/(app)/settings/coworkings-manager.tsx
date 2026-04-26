"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, X, Save } from "lucide-react";
import type { Coworking } from "@/lib/types";

export function CoworkingsManager({ initial }: { initial: Coworking[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get("name"),
      address: fd.get("address") || null,
      status: fd.get("status"),
      total_capacity: fd.get("total_capacity") ? Number(fd.get("total_capacity")) : null,
      fixed_desks_capacity: fd.get("fixed_desks_capacity") ? Number(fd.get("fixed_desks_capacity")) : null,
      flexible_capacity: fd.get("flexible_capacity") ? Number(fd.get("flexible_capacity")) : null,
      offices_capacity: fd.get("offices_capacity") ? Number(fd.get("offices_capacity")) : null,
      lockers_capacity: fd.get("lockers_capacity") ? Number(fd.get("lockers_capacity")) : null,
      screens_capacity: fd.get("screens_capacity") ? Number(fd.get("screens_capacity")) : null,
      manager_name: fd.get("manager_name") || null,
      notes: fd.get("notes") || null,
    };
    const supabase = createClient();
    const id = editingId;
    const res = id
      ? await supabase.from("coworkings").update(payload).eq("id", id)
      : await supabase.from("coworkings").insert(payload);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    setCreating(false); setEditingId(null);
    router.refresh();
  }

  const editing = editingId ? initial.find((c) => c.id === editingId) : null;

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100 -mx-1">
        {initial.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-1 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">{c.name}</p>
              <p className="text-[12px] text-ink-500">
                Capacidad {c.total_capacity ?? 0} · {c.fixed_desks_capacity ?? 0} fijos · {c.offices_capacity ?? 0} oficinas
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={c.status === "active" ? "success" : c.status === "unmanaged" ? "muted" : "danger"}>
                {c.status === "active" ? "Activo" : c.status === "unmanaged" ? "No gestionado" : "Cerrado"}
              </Badge>
              <button onClick={() => { setEditingId(c.id); setCreating(false); }} className="text-ink-500 hover:text-ink-900"><Pencil className="h-3.5 w-3.5" /></button>
            </div>
          </li>
        ))}
      </ul>

      {!creating && !editingId && (
        <Button variant="outline" size="sm" onClick={() => { setCreating(true); setEditingId(null); }}>
          <Plus className="h-3.5 w-3.5" /> Nuevo coworking
        </Button>
      )}

      {(creating || editingId) && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4 space-y-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-medium text-ink-900">{editingId ? "Editar coworking" : "Nuevo coworking"}</p>
            <button type="button" onClick={() => { setCreating(false); setEditingId(null); }} className="text-ink-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input name="name" required defaultValue={editing?.name ?? ""} /></Field>
            <Field label="Estado">
              <Select name="status" defaultValue={editing?.status ?? "active"}>
                <option value="active">Activo</option>
                <option value="unmanaged">No gestionado</option>
                <option value="closed">Cerrado</option>
              </Select>
            </Field>
          </div>
          <Field label="Dirección"><Input name="address" defaultValue={editing?.address ?? ""} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Capacidad total"><Input name="total_capacity" type="number" defaultValue={editing?.total_capacity ?? ""} /></Field>
            <Field label="Puestos fijos"><Input name="fixed_desks_capacity" type="number" defaultValue={editing?.fixed_desks_capacity ?? ""} /></Field>
            <Field label="Flex"><Input name="flexible_capacity" type="number" defaultValue={editing?.flexible_capacity ?? ""} /></Field>
            <Field label="Oficinas"><Input name="offices_capacity" type="number" defaultValue={editing?.offices_capacity ?? ""} /></Field>
            <Field label="Taquillas"><Input name="lockers_capacity" type="number" defaultValue={editing?.lockers_capacity ?? ""} /></Field>
            <Field label="Pantallas"><Input name="screens_capacity" type="number" defaultValue={editing?.screens_capacity ?? ""} /></Field>
          </div>
          <Field label="Responsable"><Input name="manager_name" defaultValue={editing?.manager_name ?? ""} /></Field>
          <Field label="Notas"><Input name="notes" defaultValue={editing?.notes ?? ""} /></Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setCreating(false); setEditingId(null); }}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={busy}><Save className="h-3.5 w-3.5" /> {busy ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
