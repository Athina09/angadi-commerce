/** Format INR with Indian grouping. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Percent off when mrp > price; otherwise undefined. */
export function discountPercent(price: number, mrp?: number): number | undefined {
  if (!mrp || mrp <= price) return undefined;
  return Math.round(((mrp - price) / mrp) * 100);
}
