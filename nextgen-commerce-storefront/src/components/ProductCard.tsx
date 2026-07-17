import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/ProductImage";
import { StockBadge } from "@/components/StockBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/hooks/useCart";
import { ANGADI_STORE_ID } from "@/mock/stores";
import { formatINR, discountPercent } from "@/utils/currency";
import { cn } from "@/utils/cn";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
  pulsing?: boolean;
};

export function ProductCard({ product, pulsing }: Props) {
  const navigate = useNavigate();
  const { getQtyFor, addProduct, changeQty } = useCart();
  const qty = getQtyFor(product.id, ANGADI_STORE_ID);
  const out = product.stock <= 0;
  const disc = discountPercent(product.price, product.mrp);

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-terracotta-100/80 bg-white shadow-soft",
        out && "opacity-60 grayscale-[0.35]"
      )}
    >
      <button
        type="button"
        className="relative aspect-[4/5] overflow-hidden bg-terracotta-50 text-left"
        onClick={() => navigate(`/shop/product/${product.id}`)}
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          product={product}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          {product.category}
        </span>
        {disc != null && (
          <span className="absolute right-3 top-3 rounded-full bg-mustard-400 px-2 py-0.5 text-[10px] font-bold text-ink">
            {disc}% off
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <button
          type="button"
          onClick={() => navigate(`/shop/product/${product.id}`)}
          className="text-left"
        >
          <h3 className="font-display text-base leading-snug text-ink line-clamp-2">
            {product.name}
          </h3>
        </button>
        <p className="text-xs text-ink/45">{product.unit}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg text-terracotta-500">
            {formatINR(product.price)}
          </span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-sm text-ink/40 line-through">{formatINR(product.mrp)}</span>
          )}
        </div>
        <StockBadge stock={product.stock} pulsing={pulsing} />

        <div className="mt-auto pt-2">
          {qty > 0 ? (
            <QuantityStepper
              value={qty}
              min={0}
              max={product.stock}
              onChange={(n) => void changeQty(product.id, ANGADI_STORE_ID, n)}
              className="w-full justify-between"
            />
          ) : (
            <button
              type="button"
              disabled={out}
              onClick={() => void addProduct(product, 1)}
              className="w-full rounded-full bg-ink py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
