import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
};

/** Premium SaaS surface — soft shadow, 20px radius, spacing over borders */
export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[20px] bg-white shadow-[0_1px_3px_rgba(28,27,25,0.06),0_8px_24px_rgba(28,27,25,0.04)]",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-7 sm:px-8 pt-7 sm:pt-8 pb-2">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-[28px] sm:text-[30px] font-semibold text-ink leading-tight tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base text-muted mt-1.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(title ? "px-7 sm:px-8 pb-7 sm:pb-8" : "p-7 sm:p-8")}>
        {children}
      </div>
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-[20px] bg-ink/8", className)} />
  );
}
