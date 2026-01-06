import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-lg p-4", className)}>
      {title && (
        <header className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {title}
        </header>
      )}
      {children}
    </section>
  );
}


