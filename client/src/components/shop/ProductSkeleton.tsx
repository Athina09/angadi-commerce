export function ProductSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-charcoal/8 bg-white">
          <div className="aspect-[4/5] bg-charcoal/8" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-charcoal/8" />
            <div className="h-4 w-2/3 rounded bg-charcoal/8" />
            <div className="h-5 w-1/2 rounded bg-charcoal/8" />
          </div>
        </div>
      ))}
    </div>
  );
}
