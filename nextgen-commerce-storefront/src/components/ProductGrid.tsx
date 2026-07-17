import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";

export function ProductGrid({
  products,
  pulsingIds,
}: {
  products: Product[];
  pulsingIds: Set<string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} pulsing={pulsingIds.has(p.id)} />
      ))}
    </div>
  );
}
