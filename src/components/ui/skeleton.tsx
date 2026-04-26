import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-ink-200/60",
        className,
      )}
    />
  );
}

export function PageSkeleton({
  showKpi = true,
  rows = 6,
  hasChart = false,
}: {
  showKpi?: boolean;
  rows?: number;
  hasChart?: boolean;
}) {
  return (
    <div>
      {/* Page header */}
      <div className="mb-[22px] flex items-end justify-between gap-4 pb-4 border-b border-ink-200">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {/* KPIs */}
      {showKpi && (
        <div className="mb-4 rounded-md border border-ink-200 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="px-[18px] py-4 border-r border-b border-ink-200 last:border-r-0 lg:[&:nth-child(4n)]:border-r-0 space-y-2"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Optional chart */}
      {hasChart && (
        <div className="mb-4 rounded-md border border-ink-200 bg-white p-[18px]">
          <Skeleton className="h-4 w-44 mb-4" />
          <Skeleton className="h-44 w-full" />
        </div>
      )}

      {/* Table-like rows */}
      <div className="rounded-md border border-ink-200 bg-white overflow-hidden">
        <div className="bg-ink-100 px-3.5 py-2.5 flex gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-3.5 py-2.5 flex items-center gap-3 border-t border-ink-200"
          >
            <Skeleton className="h-[22px] w-[22px] rounded-full" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-20 ml-2" />
            <Skeleton className="h-3.5 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
