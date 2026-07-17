import { Link } from "react-router-dom";
import { ProductImage } from "@/components/ProductImage";
import { StockBadge } from "@/components/StockBadge";
import { formatINR } from "@/utils/currency";
import type { Product } from "@/types/product";

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl text-ink mb-4">Related products</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/shop/product/${p.id}`}
            className="w-44 shrink-0 overflow-hidden rounded-2xl border border-terracotta-100 bg-white shadow-soft hover:shadow-lift transition-shadow"
          >
            <div className="aspect-square bg-terracotta-50">
              <ProductImage product={p} />
            </div>
            <div className="p-3 space-y-1">
              <p className="font-display text-sm line-clamp-2">{p.name}</p>
              <p className="text-sm text-terracotta-500">{formatINR(p.price)}</p>
              <StockBadge stock={p.stock} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
