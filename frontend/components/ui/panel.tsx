import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, children, className }: PanelProps) {
  return (
    <section className={cn("card", className)}>
      {title && (
        <header className="mb-2 text-sm font-medium text-slate-700">
          {title}
        </header>
      )}
      {children}
    </section>
  );
}


