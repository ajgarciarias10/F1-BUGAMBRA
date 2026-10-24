import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./cn";

export type NoticeTone = "info" | "ok" | "warn" | "danger";

const TONE = {
  info: { box: "border-info/30 bg-info-soft bg-[image:var(--grad-info)]", text: "text-info", Icon: Info },
  ok: { box: "border-ok/40 bg-ok-soft", text: "text-ok", Icon: CheckCircle2 },
  warn: { box: "border-warn/40 bg-warn-soft", text: "text-warn", Icon: AlertTriangle },
  danger: { box: "border-danger/40 bg-danger-soft", text: "text-danger", Icon: XCircle },
} as const;

export interface NoticeProps {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Acción opcional (p. ej. <Button size="sm">Reintentar</Button>). */
  action?: ReactNode;
  className?: string;
}

/** Mensaje de éxito/error/aviso. `danger` usa role="alert"; el resto role="status". */
export function Notice({ tone = "info", title, children, action, className }: NoticeProps) {
  const { box, text, Icon } = TONE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-card border-l-2 p-4 text-sm text-ink", box, className)}>
      <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", text)} />
      <div className="min-w-0 flex-1">
        {title && <p className={cn("font-bold", text)}>{title}</p>}
        {children && <div className={cn("text-ink-2", title && "mt-1")}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
