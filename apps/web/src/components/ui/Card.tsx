import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Etiqueta HTML. Por defecto `div`. */
  as?: "div" | "section" | "article" | "aside" | "li";
  /** Relleno interior. `none` si el contenido ya trae el suyo (tablas, listas). */
  pad?: "none" | "sm" | "md" | "lg";
  /** Franja superior de color: cualquier color CSS (p. ej. el de un equipo). */
  accent?: string;
  /** `muted` = fondo secundario, sin sombra. `solid` = superficie opaca con sombra, sin desenfoque (listas repetidas). */
  tone?: "default" | "muted" | "solid";
}

const PAD = { none: "", sm: "p-3 md:p-4", md: "p-4 md:p-6", lg: "p-5 md:p-8" } as const;

export function Card({ as: Tag = "div", pad = "md", accent, tone = "default", className, style, ...props }: CardProps) {
  return (
    <Tag
      {...props}
      style={accent ? { ...style, borderTopColor: accent, borderTopWidth: 3 } : style}
      className={cn(
        "rounded-card text-ink",
        tone === "muted" ? "border border-line bg-surface-2/70" : tone === "solid" ? "border border-line bg-surface shadow-fluent-2" : "acrylic",
        PAD[pad],
        className,
      )}
    />
  );
}
