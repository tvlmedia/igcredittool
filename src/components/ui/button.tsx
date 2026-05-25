import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-iron-300/20 bg-gradient-to-b from-iron-400 to-iron-600 text-[#100904] shadow-glow hover:from-iron-300 hover:to-iron-500 disabled:border-white/10 disabled:bg-none disabled:bg-white/12 disabled:text-white/35",
  secondary:
    "border border-iron-400/18 bg-white/[0.045] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-iron-400/34 hover:bg-iron-400/[0.08] hover:text-white disabled:text-white/35",
  ghost:
    "text-white/64 hover:bg-white/[0.065] hover:text-white disabled:text-white/35",
  danger:
    "border border-red-300/18 bg-red-500/[0.075] text-red-100/88 hover:border-red-300/32 hover:bg-red-500/[0.13] disabled:text-red-100/35"
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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-iron-400/45 disabled:cursor-not-allowed",
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
