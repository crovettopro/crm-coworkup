"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Seg, SegButton } from "@/components/ui/seg";
import { EmptyState } from "@/components/ui/table";
import { ExtraTile } from "@/components/extra-tile";

type Tab = "lockers" | "monitors" | "all";

type Extra = {
  id: string;
  coworking_id: string;
  type: string;
  identifier: string;
  monthly_price: number;
  status: "available" | "rented" | "returned" | "pending";
};

type Assignment = {
  id: string;
  extra_id: string;
  client_id: string;
  client: { id: string; name: string } | null;
  start_date: string | null;
};

export function ExtrasGrid({
  lockers,
  monitors,
  others,
  assignments,
  clients,
  initialTab = "lockers",
}: {
  lockers: Extra[];
  monitors: Extra[];
  others: Extra[];
  assignments: Assignment[];
  clients: { id: string; name: string }[];
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const items = tab === "lockers" ? lockers : tab === "monitors" ? monitors : [...lockers, ...monitors, ...others];
  const totalItems = lockers.length + monitors.length + others.length;
  const assigned = items.filter((e) => e.status === "rented").length;
  const free = items.length - assigned;

  const assignmentByExtraId = new Map<string, any>();
  assignments.forEach((a) => assignmentByExtraId.set(a.extra_id, a));

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Seg>
          <SegButton active={tab === "lockers"} onClick={() => setTab("lockers")}>
            Taquillas ({lockers.length})
          </SegButton>
          <SegButton active={tab === "monitors"} onClick={() => setTab("monitors")}>
            Monitores ({monitors.length})
          </SegButton>
          {others.length > 0 && (
            <SegButton active={tab === "all"} onClick={() => setTab("all")}>
              Todo ({totalItems})
            </SegButton>
          )}
        </Seg>
        <span className="text-[12.5px] text-ink-500 ml-1">
          {assigned} asignados · {free} libres
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Sin items en esta categoría">
          Añade taquillas, monitores u otro equipamiento.
        </EmptyState>
      ) : (
        <Card className="mb-4">
          <CardBody>
            {/* Altura mínima estable: que nunca colapse menos que 2 filas para que la página
                no se mueva al cambiar entre tabs con conteos distintos. */}
            <ul className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 min-h-[200px] content-start">
              {items.map((e) => (
                <li key={e.id}>
                  <ExtraTile
                    extra={e}
                    assignment={assignmentByExtraId.get(e.id) ?? null}
                    clients={clients}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
