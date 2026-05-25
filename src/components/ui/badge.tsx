import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

export function Badge({
  children,
  className,
  style
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-white/72",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
