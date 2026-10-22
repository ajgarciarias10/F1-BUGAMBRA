import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

/** Clases de botón reutilizables para <Link>/<a> con el mismo aspecto que <Button>. */
export function buttonClass({ variant = "secondary", size = "md", block = false }: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border font-bold whitespace-nowrap fluent-press focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress",
    // El botón normal tiene 44px y el compacto 40px, como en el prototipo.
    size === "md" ? "min-h-11 px-5 text-sm" : "min-h-10 px-4 text-sm",
    variant === "primary" && "btn-primary-fluent border-transparent bg-brand text-brand-ink",
    variant === "secondary" && "border-line bg-transparent text-ink hover:border-ink-muted",
    variant === "ghost" && "border-transparent bg-transparent text-ink hover:bg-surface-2",
    variant === "danger" && "border-danger/60 bg-danger-soft text-danger hover:bg-danger hover:text-brand-ink",
    block && "w-full",
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Mientras es true el botón queda deshabilitado (evita envíos duplicados) y anuncia aria-busy. */
  loading?: boolean;
}

export function Button({ variant, size, block, loading = false, disabled, className, type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass({ variant, size, block }), className)}
    >
      {loading && <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />}
      {children}
    </button>
  );
}
