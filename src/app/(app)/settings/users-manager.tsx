"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Trash2, Pencil } from "lucide-react";
import type { Coworking, Profile } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";

export function UsersManager({
  initial, coworkings, canManage,
}: {
  initial: Profile[];
  coworkings: Coworking[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        name: fd.get("name"),
        password: fd.get("password"),
        role: fd.get("role"),
        coworking_id: fd.get("coworking_id") || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Error"); return; }
    setCreating(false);
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        name: fd.get("name"),
        role: fd.get("role"),
        coworking_id: fd.get("coworking_id") || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Error"); return; }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error");
      return;
    }
    router.refresh();
  }

  const editing = editingId ? initial.find((p) => p.id === editingId) : null;

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100 -mx-1">
        {initial.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-1 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-700 text-[13px] font-semibold">
                {(p.name ?? p.email).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-ink-900">{p.name ?? p.email.split("@")[0]}</p>
                <p className="text-[12px] text-ink-500">{p.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-ink-500">{coworkings.find((c) => c.id === p.coworking_id)?.name ?? "Todos"}</span>
              <Badge tone={p.role === "super_admin" ? "dark" : p.role === "manager" ? "info" : "neutral"}>
                {ROLE_LABEL[p.role]}
              </Badge>
              {canManage && (
                <>
                  <button onClick={() => { setEditingId(p.id); setCreating(false); }} className="text-ink-500 hover:text-ink-900">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700" disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && !creating && !editingId && (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> Invitar usuario
        </Button>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4 space-y-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-medium text-ink-900">Nuevo usuario</p>
            <button type="button" onClick={() => setCreating(false)} className="text-ink-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input name="name" required /></Field>
            <Field label="Email"><Input name="email" type="email" required /></Field>
            <Field label="Contraseña inicial"><Input name="password" type="text" required minLength={8} placeholder="mín. 8 caracteres" /></Field>
            <Field label="Rol">
              <Select name="role" defaultValue="staff">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </Field>
            <Field label="Coworking asignado">
              <Select name="coworking_id" defaultValue="">
                <option value="">Todos (super admin)</option>
                {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={busy}><Save className="h-3.5 w-3.5" /> {busy ? "Creando…" : "Crear"}</Button>
          </div>
        </form>
      )}

      {editing && (
        <form onSubmit={handleEdit} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4 space-y-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-medium text-ink-900">Editar {editing.email}</p>
            <button type="button" onClick={() => setEditingId(null)} className="text-ink-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input name="name" defaultValue={editing.name ?? ""} /></Field>
            <Field label="Rol">
              <Select name="role" defaultValue={editing.role}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </Field>
            <Field label="Coworking asignado">
              <Select name="coworking_id" defaultValue={editing.coworking_id ?? ""}>
                <option value="">Todos (super admin)</option>
                {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={busy}><Save className="h-3.5 w-3.5" /> {busy ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      )}

      {!canManage && (
        <p className="text-[12px] text-ink-500 mt-2">Solo los super admins pueden gestionar usuarios.</p>
      )}
    </div>
  );
}
