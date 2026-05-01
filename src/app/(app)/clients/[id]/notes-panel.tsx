"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Pencil, Save, X, StickyNote } from "lucide-react";

const PLACEHOLDER =
  "Datos importantes del cliente:\n• Email facturación: ...\n• Razón social SL: ...\n• Persona contacto / preferencia de pago / acuerdos especiales…";

export function ClientNotesPanel({
  clientId,
  initialNotes,
}: {
  clientId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  async function save() {
    setError(null);
    setSaving(true);
    const value = notes.trim() || null;
    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .update({ notes: value })
      .eq("id", clientId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    setNotes(initialNotes ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="inline-flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Notas
        </CardTitle>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-600 hover:text-ink-900"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-500 hover:text-ink-900"
            >
              <X className="h-3 w-3" /> Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:text-emerald-900"
            >
              <Save className="h-3 w-3" /> {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}
      </CardHeader>
      <CardBody>
        {editing ? (
          <>
            <Textarea
              ref={taRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={PLACEHOLDER}
              className="min-h-[140px]"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  save();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
            />
            <p className="mt-1.5 text-[11px] text-ink-500">
              ⌘/Ctrl + Enter para guardar · Esc para cancelar
            </p>
            {error && (
              <p className="mt-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
                {error}
              </p>
            )}
          </>
        ) : notes ? (
          <p className="text-[13px] text-ink-800 whitespace-pre-wrap leading-relaxed">
            {notes}
          </p>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left rounded-md border border-dashed border-ink-200 px-3 py-3 text-[12.5px] text-ink-500 hover:border-ink-300 hover:bg-ink-50/40 transition-colors whitespace-pre-line"
          >
            {PLACEHOLDER}
          </button>
        )}
      </CardBody>
    </Card>
  );
}
