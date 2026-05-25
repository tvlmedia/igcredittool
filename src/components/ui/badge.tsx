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
        "inline-flex items-center gap-1.5 rounded-full border border-iron-400/18 bg-iron-400/[0.055] px-2.5 py-1 text-xs font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
