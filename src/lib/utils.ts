import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency = "EUR") {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function monthRange(month?: string) {
  // month: "YYYY-MM" → returns { start: ISO, end: ISO } for that month, defaults to current month
  const base = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: start.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
  };
}

export function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

import type { TaxTreatment } from "./types";

/**
 * Aplica IVA al precio neto según el tax_treatment del cliente/suscripción.
 * Para Inv. sujeto pasivo / intracomunitario / exento → devuelve el neto sin tocar.
 */
export function grossPrice(
  net: number | null | undefined,
  treatment: TaxTreatment | null | undefined = "standard",
  vatRate: number = 21
): number {
  const n = Number(net ?? 0);
  if (treatment === "reverse_charge" || treatment === "intracom" || treatment === "exempt") return n;
  return Math.round(n * (1 + vatRate / 100) * 100) / 100;
}

export function formatCurrencyGross(
  net: number | null | undefined,
  treatment: TaxTreatment | null | undefined = "standard",
  vatRate: number = 21
): string {
  return formatCurrency(grossPrice(net, treatment, vatRate));
}
