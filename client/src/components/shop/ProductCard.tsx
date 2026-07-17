import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { StockBadge } from "@/components/shop/StockBadge";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { useCartStore } from "@/store/cartStore";
import { cn, formatINR } from "@/lib/utils";
import type { CatalogCard } from "@/pages/ShopPage";

const ANGADI = "angadi";

export function ProductCard({
  product,
  pulsing,
}: {
  product: CatalogCard;
  pulsing?: boolean;
}) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const qty = useCartStore((s) => s.getQty(product.id, ANGADI));
  const stock = product.totalStock;
  const out = stock <= 0 || product.stockStatus === "out";
  const price = product.lowestPrice ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    const ok = addItem(
      {
        catalogId: product.id,
        name: product.name,
        price,
        stock,
        imageUrl: product.imageUrl,
        unit: product.unit,
        storeId: ANGADI,
        storeName: product.bestVendor?.storeName ?? "Angadi",
      },
      1
    );
    if (ok) toast.success("Added to cart", { description: product.name });
    else toast.warning(`Only ${stock} available`);
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-[0_2px_12px_rgba(28,27,25,0.06)]",
        out && "opacity-60",
        pulsing && "ring-2 ring-amber-earth/50"
      )}
    >
      <button
        type="button"
        className="relative aspect-[4/5] overflow-hidden bg-charcoal/5 text-left"
        onClick={() => navigate(`/shop/product/${product.id}`)}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-cream/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-earth">
          {product.category}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <button type="button" className="text-left" onClick={() => navigate(`/shop/product/${product.id}`)}>
          <h3 className="font-display text-base leading-snug line-clamp-2">{product.name}</h3>
        </button>
        <p className="font-display text-lg text-amber-earth">{price > 0 ? formatINR(price) : "—"}</p>
        <StockBadge stock={stock} />
        <div className="mt-auto pt-1" onClick={(e) => e.stopPropagation()}>
          {qty > 0 ? (
            <QuantityStepper
              value={qty}
              min={0}
              max={stock}
              onChange={(n) => {
                if (n <= 0) useCartStore.getState().removeItem(product.id, ANGADI);
                else updateQty(product.id, ANGADI, n);
              }}
              className="w-full justify-between"
            />
          ) : (
            <button
              type="button"
              disabled={out}
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-charcoal py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add to cart
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function AddSuccessIcon() {
  return <Check className="h-4 w-4 text-emerald-600" aria-hidden />;
}
