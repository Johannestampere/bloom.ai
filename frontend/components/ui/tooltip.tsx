import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={cn("relative inline-flex group", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-50 shadow-lg group-hover:block">
        {label}
      </span>
    </span>
  );
}


