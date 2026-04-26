"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Coworking } from "@/lib/types";

const TARGET_FIELDS = [
  "cliente_nombre", "tipo_cliente", "empresa_nombre", "email", "telefono",
  "coworking", "estado", "fecha_alta", "fecha_baja",
  "plan", "precio_base", "descuento_tipo", "descuento_valor", "precio_final",
  "fecha_inicio_suscripcion", "fecha_fin_suscripcion", "metodo_pago",
  "estado_pago", "mes_pago", "importe_esperado", "importe_pagado",
  "factura_estado", "fianza_entregada", "fianza_importe",
  "contrato_inicio", "contrato_fin", "pantalla_alquilada", "taquilla_alquilada", "notas",
] as const;

type Row = Record<string, string>;

export function CsvImporter({
  coworkings, defaultCoworkingId,
}: {
  coworkings: Coworking[];
  defaultCoworkingId?: string | null;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultCw, setDefaultCw] = useState<string>(defaultCoworkingId ?? "");
  const [createSubs, setCreateSubs] = useState(true);
  const [createPayments, setCreatePayments] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setRows(res.data);
        // Auto-map by exact / lowercase match
        const auto: Record<string, string> = {};
        for (const tf of TARGET_FIELDS) {
          const found = hs.find((h) => h.toLowerCase().trim() === tf);
          if (found) auto[tf] = found;
        }
        setMapping(auto);
        setResult(null);
      },
    });
  }

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  function val(row: Row, target: string): string {
    const col = mapping[target];
    if (!col) return "";
    return (row[col] ?? "").toString().trim();
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rows,
        mapping,
        defaultCoworkingId: defaultCw || null,
        options: { createSubs, createPayments, updateExisting },
      }),
    });
    const data = await res.json();
    setImporting(false);
    setResult(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1 · Subir CSV</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-3">
          <Input type="file" accept=".csv,text/csv" onChange={handleFile} />
          {rows.length > 0 && <Badge tone="success">{rows.length} filas detectadas</Badge>}
        </div>

        {rows.length > 0 && (
          <>
            <div>
              <h3 className="text-base font-semibold text-ink-900 mb-2">2 · Mapear columnas</h3>
              <p className="text-xs text-ink-500 mb-3">
                Asocia cada campo de la base de datos con la columna correspondiente del CSV. Puedes dejar campos sin asignar.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TARGET_FIELDS.map((tf) => (
                  <Field key={tf} label={tf}>
                    <Select
                      value={mapping[tf] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [tf]: e.target.value })}
                    >
                      <option value="">— sin asignar —</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </Select>
                  </Field>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-ink-900 mb-2">3 · Opciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Coworking por defecto (si la fila no lo trae)">
                  <Select value={defaultCw} onChange={(e) => setDefaultCw(e.target.value)}>
                    {coworkings.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </Select>
                </Field>
                <div className="flex flex-col gap-2 mt-1 md:mt-6">
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={createSubs} onChange={(e) => setCreateSubs(e.target.checked)} />
                    Crear suscripción si hay plan + precio
                  </label>
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={createPayments} onChange={(e) => setCreatePayments(e.target.checked)} />
                    Crear pago si hay mes_pago + importe
                  </label>
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
                    Actualizar cliente existente (match por email)
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-ink-900 mb-2">4 · Vista previa</h3>
              <div className="overflow-x-auto rounded-lg border border-ink-200">
                <table className="w-full text-xs">
                  <thead className="bg-ink-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Coworking</th>
                      <th className="px-3 py-2 text-left">Plan</th>
                      <th className="px-3 py-2 text-left">Precio final</th>
                      <th className="px-3 py-2 text-left">Mes pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-ink-100">
                        <td className="px-3 py-2">{val(r, "cliente_nombre") || "—"}</td>
                        <td className="px-3 py-2">{val(r, "email") || "—"}</td>
                        <td className="px-3 py-2">{val(r, "coworking") || "(default)"}</td>
                        <td className="px-3 py-2">{val(r, "plan") || "—"}</td>
                        <td className="px-3 py-2">{val(r, "precio_final") || val(r, "precio_base") || "—"}</td>
                        <td className="px-3 py-2">{val(r, "mes_pago") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando…" : `Importar ${rows.length} filas`}
              </Button>
            </div>

            {result && (
              <div className="rounded-lg border border-ink-200 bg-white p-4">
                <p className="font-medium text-ink-900">
                  Importación finalizada — <span className="text-emerald-600">{result.ok} OK</span> ·{" "}
                  <span className="text-red-600">{result.failed} fallidas</span>
                </p>
                {result.errors?.length > 0 && (
                  <ul className="mt-2 text-xs text-red-700 list-disc pl-5 space-y-0.5 max-h-48 overflow-y-auto">
                    {result.errors.slice(0, 30).map((er, i) => <li key={i}>{er}</li>)}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
