import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  height?: number;
}

export function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div className="flex items-end gap-2 px-2" style={{ height }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${Math.max(15, Math.random() * 90)}%` }}
        />
      ))}
    </div>
  );
}
