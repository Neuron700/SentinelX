import { SkeletonCards, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-6 w-64 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
      <SkeletonCards count={4} />
      <SkeletonTable rows={7} cols={6} />
    </div>
  );
}
