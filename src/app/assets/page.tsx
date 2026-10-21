import { Suspense } from "react";
import type { Metadata } from "next";
import { SkeletonTable } from "@/components/ui/skeleton";
import { AssetExplorer } from "@/features/assets/asset-explorer";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} cols={6} />}>
      <AssetExplorer />
    </Suspense>
  );
}
