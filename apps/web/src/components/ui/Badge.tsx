import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "brand" | "ok" | "warn" | "info" | "violet" | "danger";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-3/80 text-ink-muted border-line",
  brand: "bg-brand-soft text-brand border-brand/30",
  ok: "bg-ok-soft text-ok border-ok/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  info: "bg-info-soft text-info border-info/30",
  violet: "bg-violet-soft text-violet border-violet/30",
  danger: "bg-danger-soft text-danger border-danger/30",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Punto de estado a la izquierda (modo StatusPill). */
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold leading-5 tracking-wide", TONE[tone], className)}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Insignia de estado con punto: `<StatusPill tone="ok">Activo</StatusPill>`. */
export function StatusPill(props: Omit<BadgeProps, "dot">) {
  return <Badge {...props} dot />;
}
