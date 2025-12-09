import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Modal({ open, title, children, onClose, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={cn(
          "card w-full max-w-md bg-slate-950 border-slate-800 text-slate-50",
          className,
        )}
      >
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h2 className="text-sm font-medium text-slate-100">{title}</h2>
          )}
          <Button variant="secondary" onClick={onClose} className="h-7 px-2 text-xs">
            Close
          </Button>
        </div>
        <div className="text-sm text-slate-200">{children}</div>
      </div>
    </div>
  );
}


