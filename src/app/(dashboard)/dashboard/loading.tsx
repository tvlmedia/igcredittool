import { SkeletonBlock } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-5">
      <SkeletonBlock className="h-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-36" />
        ))}
      </div>
      <SkeletonBlock className="h-96" />
    </div>
  );
}
