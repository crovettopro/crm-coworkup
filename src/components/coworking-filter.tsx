"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/input";
import type { Coworking } from "@/lib/types";

export function CoworkingFilter({
  coworkings,
  canSelectAll = false,
}: {
  coworkings: Coworking[];
  canSelectAll?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const value = params.get("cw") ?? (canSelectAll ? "all" : coworkings[0]?.id ?? "");

  return (
    <Select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("cw", e.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="w-56"
    >
      {canSelectAll && <option value="all">Todos los coworkings</option>}
      {coworkings.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </Select>
  );
}
