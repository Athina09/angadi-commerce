import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/ProductImage";
import { StockBadge } from "@/components/StockBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { RelatedProducts } from "@/components/RelatedProducts";
import { PriceComparison } from "@/components/PriceComparison";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { fetchProduct } from "@/services/api";
import { currentStock } from "@/services/socket";
import { useProductRoom, useSocket } from "@/hooks/useSocket";
import { useCart } from "@/hooks/useCart";
import { getRelatedProducts } from "@/mock/products";
import { ANGADI_STORE_ID } from "@/mock/stores";
import { formatINR, discountPercent } from "@/utils/currency";
import type { Product } from "@/types/product";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const { getQtyFor, addProduct, changeQty } = useCart();
  const { pulsingIds } = useSocket();
  useProductRoom(id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProduct(id);
        if (!cancelled) {
          setProduct({ ...data, stock: currentStock(data.id, data.stock) });
          setQty(1);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const t = window.setInterval(() => {
      setProduct((p) => (p ? { ...p, stock: currentStock(p.id, p.stock) } : p));
    }, 800);
    return () => clearInterval(t);
  }, [product?.id]);

  if (loading) return <LoadingSpinner label="Loading product…" />;
  if (error || !product) {
    return (
      <EmptyState
        title="Product not found"
        description={error ?? "This item is no longer on the shelf."}
        actionLabel="Back to shop"
        onAction={() => {
          window.location.href = "/shop";
        }}
      />
    );
  }

  const inCart = getQtyFor(product.id, ANGADI_STORE_ID);
  const out = product.stock <= 0;
  const disc = discountPercent(product.price, product.mrp);
  const related = getRelatedProducts(product);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-16">
      <Link to="/shop" className="text-sm font-semibold text-terracotta-600 hover:underline">
        ← Back to shop
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <motion.div
          layout
          className={`overflow-hidden rounded-2xl border border-terracotta-100 bg-white shadow-soft ${
            pulsingIds.has(product.id) ? "animate-stock-pulse" : ""
          }`}
        >
          <div className="aspect-square">
            <ProductImage product={product} />
          </div>
        </motion.div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mustard-500">
            {product.category}
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-ink">{product.name}</h1>
          <p className="mt-1 text-sm text-ink/50">{product.unit}</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl text-terracotta-500">
              {formatINR(product.price)}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-lg text-ink/40 line-through">{formatINR(product.mrp)}</span>
            )}
            {disc != null && (
              <span className="rounded-full bg-mustard-400/20 px-2 py-0.5 text-xs font-bold text-mustard-500">
                {disc}% off
              </span>
            )}
          </div>
          <div className="mt-3">
            <StockBadge stock={product.stock} pulsing={pulsingIds.has(product.id)} />
          </div>
          <p className="mt-5 text-[15px] leading-relaxed text-ink/70">{product.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {inCart > 0 ? (
              <>
                <p className="text-sm font-semibold text-sage">In cart</p>
                <QuantityStepper
                  value={inCart}
                  min={0}
                  max={product.stock}
                  onChange={(n) => void changeQty(product.id, ANGADI_STORE_ID, n)}
                />
              </>
            ) : (
              <>
                <QuantityStepper
                  value={qty}
                  min={1}
                  max={Math.max(product.stock, 1)}
                  onChange={setQty}
                />
                <button
                  type="button"
                  disabled={out || adding}
                  onClick={async () => {
                    setAdding(true);
                    await addProduct(product, qty);
                    setAdding(false);
                  }}
                  className="rounded-full bg-ink px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-40 hover:opacity-90"
                >
                  {adding ? "Adding…" : "Add to cart"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <PriceComparison product={product} />
      <RelatedProducts products={related} />
    </main>
  );
}
