import { Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  className?: string;
  size?: "sm" | "md";
};

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  className,
  size = "md",
}: Props) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-terracotta-100 bg-white shadow-soft",
        className
      )}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          dim,
          "flex items-center justify-center text-ink/70 disabled:opacity-30 hover:text-ink transition-colors"
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.75rem] text-center font-display text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          dim,
          "flex items-center justify-center text-ink/70 disabled:opacity-30 hover:text-ink transition-colors"
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
