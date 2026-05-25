import { clsx } from "clsx";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
  helper?: string;
};

export function Field({ label, children, helper }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm text-white/72">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
        {label}
      </span>
      {children}
      {helper ? <span className="text-xs text-white/42">{helper}</span> : null}
    </label>
  );
}

const inputClass =
  "min-h-10 w-full rounded-md border border-white/10 bg-black/22 px-3 py-2 text-sm text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition placeholder:text-white/25 focus:border-iron-400/55 focus:bg-black/32 focus:ring-2 focus:ring-iron-400/14";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(inputClass, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(inputClass, "min-h-28 resize-y", className)}
      {...props}
    />
  );
}
