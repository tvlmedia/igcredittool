import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-iron-500 text-carbon-950 shadow-glow hover:bg-iron-400 disabled:bg-white/20 disabled:text-white/45",
  secondary:
    "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1] disabled:text-white/35",
  ghost:
    "text-white/70 hover:bg-white/[0.08] hover:text-white disabled:text-white/35",
  danger:
    "border border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/18 disabled:text-red-100/35"
};

export function Button({
  className,
  variant = "primary",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-iron-400/45 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
