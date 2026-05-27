import { LinkListSkeleton } from "@/components/links/link-list-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      <LinkListSkeleton />
    </div>
  );
}
