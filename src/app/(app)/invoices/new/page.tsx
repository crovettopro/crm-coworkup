import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getVisibleCoworkings } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "../invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ from_payment?: string }>;
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const coworkings = await getVisibleCoworkings(profile);
  const cwIds = profile.role === "super_admin" ? coworkings.map((c) => c.id) : [profile.coworking_id!];

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients").select("id, name, company_name, coworking_id")
    .in("coworking_id", cwIds).order("name");

  let prefill: any = null;
  if (params.from_payment) {
    const { data } = await supabase
      .from("payments").select("*").eq("id", params.from_payment).single();
    if (data) prefill = data;
  }

  return (
    <div>
      <PageHeader
        title="Registrar factura"
        subtitle="Registra una factura ya emitida en Holded para llevar el control aquí."
        actions={<Link href="/invoices"><Button variant="outline">Cancelar</Button></Link>}
      />
      <div className="mx-auto max-w-[680px]">
        <InvoiceForm clients={clients ?? []} prefillFromPayment={prefill} />
      </div>
    </div>
  );
}
