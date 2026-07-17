import { cn } from "@/utils/cn";

export function StockBadge({
  stock,
  pulsing,
  className,
}: {
  stock: number;
  pulsing?: boolean;
  className?: string;
}) {
  const label =
    stock <= 0 ? "Out of Stock" : stock <= 5 ? `Only ${stock} Left` : "In Stock";
  const tone =
    stock <= 0
      ? "border-crit/50 text-crit"
      : stock <= 5
        ? "border-amber-stock/55 text-amber-stock"
        : "border-sage/50 text-sage";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone,
        pulsing && "animate-stock-pulse",
        className
      )}
    >
      {label}
    </span>
  );
}
