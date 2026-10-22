import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "./cn";

export function SegmentedControl({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("seg", className)} />;
}

export interface SegmentProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Segment({ selected = false, className, type = "button", ...props }: SegmentProps) {
  return <button {...props} type={type} aria-pressed={selected} className={cn("seg-btn", className)} />;
}
