import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  className,
  size = "md",
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-charcoal/12 bg-white",
        className
      )}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={(e) => {
          e.stopPropagation();
          onChange(Math.max(min, value - 1));
        }}
        className={cn(dim, "flex items-center justify-center disabled:opacity-30")}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.75rem] text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        disabled={value >= max}
        onClick={(e) => {
          e.stopPropagation();
          onChange(Math.min(max, value + 1));
        }}
        className={cn(dim, "flex items-center justify-center disabled:opacity-30")}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
