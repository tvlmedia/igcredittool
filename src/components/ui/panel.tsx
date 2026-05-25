import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Panel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("glass-panel rounded-lg p-5 shadow-panel", className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative z-[1] mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-iron-300/72">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}
