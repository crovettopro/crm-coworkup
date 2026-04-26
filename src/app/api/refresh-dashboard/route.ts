import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Refresca las materialized views agregadas (monthly_sales, top clientes,
 * resumen por coworking, subs por plan).
 *
 * Llamarse después de operaciones que cambien pagos/subscripciones, o
 * vía cron (Vercel cron / Supabase pg_cron) cada hora.
 */
export async function POST() {
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("refresh_dashboard_mvs");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
