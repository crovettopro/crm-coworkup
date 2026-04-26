import { PageSkeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return <PageSkeleton showKpi={false} rows={10} />;
}
