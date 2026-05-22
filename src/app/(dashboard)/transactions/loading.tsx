import { SkeletonBlock } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="grid gap-5">
      <SkeletonBlock className="h-16 max-w-md" />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]">
        <SkeletonBlock className="h-[560px]" />
        <SkeletonBlock className="h-[360px]" />
      </div>
      <SkeletonBlock className="h-[520px]" />
    </div>
  );
}
