import { SkeletonBlock } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="grid gap-5">
      <SkeletonBlock className="h-16 max-w-md" />
      <SkeletonBlock className="h-72" />
      <SkeletonBlock className="h-96" />
    </div>
  );
}
