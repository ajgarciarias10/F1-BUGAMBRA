import type { ReactNode } from "react";
import { cn } from "./cn";

export interface PageHeaderProps {
  title: ReactNode;
  /** Texto pequeño en mayúsculas sobre el título. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Botones/insignias alineados a la derecha (debajo en móvil). */
  actions?: ReactNode;
  /** Nivel del encabezado. Por defecto h1; usa 2 dentro de una pantalla que ya tiene h1. */
  level?: 1 | 2;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, level = 1, className }: PageHeaderProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{eyebrow}</p>}
        <Heading className={cn("font-bold tracking-tight text-ink", level === 1 ? "text-3xl md:text-4xl" : "text-xl md:text-2xl")}>{title}</Heading>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
