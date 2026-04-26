"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Undo2 } from "lucide-react";

export function InvoiceRowActions({ invoice }: { invoice: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isIssued = invoice.status !== "to_issue";

  async function setIssued() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("invoices").update({
      status: "issued",
      issue_date: new Date().toISOString().slice(0, 10),
    }).eq("id", invoice.id);
    setBusy(false);
    router.refresh();
  }

  async function setNotIssued() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("invoices").update({
      status: "to_issue",
      issue_date: null,
    }).eq("id", invoice.id);
    setBusy(false);
    router.refresh();
  }

  if (!isIssued) {
    return (
      <Button size="sm" variant="primary" disabled={busy} onClick={setIssued}>
        <Check className="h-3.5 w-3.5" /> Marcar emitida
      </Button>
    );
  }

  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={setNotIssued}>
      <Undo2 className="h-3.5 w-3.5" /> Marcar no emitida
    </Button>
  );
}
