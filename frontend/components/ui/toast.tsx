import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  action?: ReactNode;
  className?: string;
};

export function Toast({ message, action, className }: ToastProps) {
  return (
    <div
      className={cn(
        "toast flex items-center justify-between gap-3 bg-slate-900/95",
        className,
      )}
    >
      <span>{message}</span>
      {action}
    </div>
  );
}


