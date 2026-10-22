import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export interface PillFilterProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function PillFilter({ selected = false, className, type = "button", ...props }: PillFilterProps) {
  return <button {...props} type={type} aria-pressed={selected} className={cn("pill-filter", className)} />;
}
