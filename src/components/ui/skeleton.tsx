export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.06] shadow-inner shadow-white/[0.02] ${className}`}
    />
  );
}
