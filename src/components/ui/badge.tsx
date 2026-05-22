import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Badge({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-white/72",
        className
      )}
    >
      {children}
    </span>
  );
}
