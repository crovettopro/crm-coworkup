import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, string>;

const truthy = (v: string) => /^(true|1|yes|sí|si|x)$/i.test(v.trim());

function val(row: Row, mapping: Record<string, string>, target: string): string {
  const col = mapping[target];
  if (!col) return "";
  return (row[col] ?? "").toString().trim();
}

function num(s: string): number | null {
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const body = await req.json();
  const rows: Row[] = body.rows ?? [];
  const mapping: Record<string, string> = body.mapping ?? {};
  const defaultCoworkingId: string | null = body.defaultCoworkingId ?? null;
  const opts = body.options ?? {};

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: 0, failed: 0, errors: ["No autenticado"] }, { status: 401 });

  const { data: coworkings } = await supabase.from("coworkings").select("id, name");
  const cwByName = new Map<string, string>(
    (coworkings ?? []).map((c: any) => [c.name.trim().toLowerCase(), c.id])
  );

  let ok = 0, failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const name = val(r, mapping, "cliente_nombre");
      if (!name) { failed++; errors.push(`Fila ${i + 2}: falta cliente_nombre`); continue; }

      const cwName = val(r, mapping, "coworking");
      const coworking_id = (cwName && cwByName.get(cwName.trim().toLowerCase())) || defaultCoworkingId;
      if (!coworking_id) { failed++; errors.push(`Fila ${i + 2}: coworking "${cwName}" no encontrado`); continue; }

      const email = val(r, mapping, "email") || null;

      const clientPayload: any = {
        coworking_id,
        client_type: val(r, mapping, "tipo_cliente").toLowerCase() === "company" ? "company" : "individual",
        name,
        company_name: val(r, mapping, "empresa_nombre") || null,
        email,
        phone: val(r, mapping, "telefono") || null,
        status: (val(r, mapping, "estado") || "active") as any,
        start_date: dateOrNull(val(r, mapping, "fecha_alta")),
        end_date: dateOrNull(val(r, mapping, "fecha_baja")),
        notes: val(r, mapping, "notas") || null,
      };

      // Find existing client by email (within coworking)
      let clientId: string | null = null;
      if (email) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("coworking_id", coworking_id)
          .ilike("email", email)
          .maybeSingle();
        if (existing?.id) clientId = existing.id;
      }

      if (clientId && opts.updateExisting) {
        await supabase.from("clients").update(clientPayload).eq("id", clientId);
      } else if (!clientId) {
        const { data: ins, error: insErr } = await supabase
          .from("clients")
          .insert(clientPayload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        clientId = ins!.id;
      }

      // Subscription
      if (opts.createSubs) {
        const planName = val(r, mapping, "plan");
        const basePrice = num(val(r, mapping, "precio_base"));
        const finalPrice = num(val(r, mapping, "precio_final")) ?? basePrice;
        const discType = val(r, mapping, "descuento_tipo").toLowerCase();
        if (planName && (basePrice ?? finalPrice) != null) {
          await supabase.from("subscriptions").insert({
            client_id: clientId,
            coworking_id,
            plan_name: planName,
            base_price: basePrice ?? finalPrice ?? 0,
            discount_type: discType === "percent" || discType === "fixed" ? discType : null,
            discount_value: num(val(r, mapping, "descuento_valor")),
            final_price: finalPrice ?? basePrice ?? 0,
            start_date: dateOrNull(val(r, mapping, "fecha_inicio_suscripcion")) ?? new Date().toISOString().slice(0, 10),
            end_date: dateOrNull(val(r, mapping, "fecha_fin_suscripcion")),
            status: "active",
            payment_method: val(r, mapping, "metodo_pago") || null,
          });
        }
      }

      // Payment
      if (opts.createPayments) {
        const month = dateOrNull(val(r, mapping, "mes_pago"));
        const expected = num(val(r, mapping, "importe_esperado"));
        if (month && expected != null) {
          await supabase.from("payments").insert({
            client_id: clientId,
            coworking_id,
            month,
            expected_amount: expected,
            paid_amount: num(val(r, mapping, "importe_pagado")) ?? 0,
            status: (val(r, mapping, "estado_pago") || "pending") as any,
            payment_method: val(r, mapping, "metodo_pago") || null,
          });
        }
      }

      // Deposit
      const depositAmount = num(val(r, mapping, "fianza_importe"));
      if (depositAmount != null && depositAmount > 0) {
        await supabase.from("deposits").insert({
          client_id: clientId,
          coworking_id,
          amount: depositAmount,
          received: truthy(val(r, mapping, "fianza_entregada")),
          received_date: truthy(val(r, mapping, "fianza_entregada")) ? new Date().toISOString().slice(0, 10) : null,
        });
      }

      ok++;
    } catch (e: any) {
      failed++;
      errors.push(`Fila ${i + 2}: ${e.message ?? "error desconocido"}`);
    }
  }

  await supabase.from("csv_imports").insert({
    imported_by: user.id,
    import_type: "clients_full",
    file_name: null,
    status: failed > 0 ? "completed_with_errors" : "completed",
    total_rows: rows.length,
    successful_rows: ok,
    failed_rows: failed,
    error_log: errors.slice(0, 200),
  });

  return NextResponse.json({ ok, failed, errors });
}
