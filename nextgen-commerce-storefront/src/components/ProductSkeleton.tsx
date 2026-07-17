export function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-terracotta-100 bg-white shadow-soft animate-pulse">
      <div className="aspect-[4/5] bg-terracotta-50" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-terracotta-50" />
        <div className="h-3 w-1/3 rounded bg-terracotta-50" />
        <div className="h-5 w-1/2 rounded bg-terracotta-50" />
        <div className="h-9 w-full rounded-full bg-terracotta-50" />
      </div>
    </div>
  );
}

export function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
