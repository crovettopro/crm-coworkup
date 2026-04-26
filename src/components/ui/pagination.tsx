import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  hrefFor: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize;
  const to = Math.min(from + pageSize, total);

  const cellBase =
    "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12.5px] font-medium transition-colors";
  const cellActive = cn(cellBase, "bg-white border border-ink-200 text-ink-800 hover:border-ink-300 hover:bg-ink-50");
  const cellDisabled = cn(cellBase, "border border-ink-100 bg-ink-50 text-ink-400");

  return (
    <div className="mt-3.5 flex items-center justify-between text-[12.5px] text-ink-500">
      <span>
        Mostrando {from + 1}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={cellActive}>
            <ChevronLeft className="h-3 w-3" /> Anterior
          </Link>
        ) : (
          <span className={cellDisabled}>
            <ChevronLeft className="h-3 w-3" /> Anterior
          </span>
        )}
        <span className="px-2.5 text-ink-700">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={cellActive}>
            Siguiente <ChevronRight className="h-3 w-3" />
          </Link>
        ) : (
          <span className={cellDisabled}>
            Siguiente <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
