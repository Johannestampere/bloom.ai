import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({ variant = "primary", children, className, ...props }: ButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";

  return (
    <button className={cn(base, className)} {...props}>
      {children}
    </button>
  );
}


