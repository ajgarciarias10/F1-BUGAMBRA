import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Botón o enlace opcional (usa <Button> o buttonClass). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center", className)}>
      {Icon && <Icon aria-hidden="true" className="mb-3 h-8 w-8 text-ink-muted" />}
      <p className="text-base font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
