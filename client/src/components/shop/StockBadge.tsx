import { cn } from "@/lib/utils";

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
    stock <= 0 ? "Out of Stock" : stock <= 10 ? `Only ${stock} left` : "In Stock";
  const tone =
    stock <= 0
      ? "border-red-300/60 text-red-700 bg-red-50/80"
      : stock <= 10
        ? "border-amber-400/50 text-amber-900 bg-amber-50/80"
        : "border-emerald-400/50 text-emerald-800 bg-emerald-50/80";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tone,
        pulsing && "animate-pulse ring-2 ring-amber-earth/40",
        className
      )}
    >
      {label}
    </span>
  );
}
