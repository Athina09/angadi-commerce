import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductImage } from "@/components/ProductImage";
import { StockBadge } from "@/components/StockBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { UpiPaymentModal } from "@/components/UpiPaymentModal";
import { EmptyState } from "@/components/EmptyState";
import { useCart } from "@/hooks/useCart";
import { getProductById } from "@/mock/products";
import { getStoreById, partnerPrice, partnerStock } from "@/mock/stores";
import { formatINR } from "@/utils/currency";

export default function PartnerStore() {
  const { storeId, productId } = useParams();
  const navigate = useNavigate();
  const product = productId ? getProductById(productId) : undefined;
  const store = storeId ? getStoreById(storeId) : undefined;
  const { addProduct, getQtyFor, changeQty } = useCart();
  const [qty, setQty] = useState(1);
  const [payOpen, setPayOpen] = useState(false);
  const [codBusy, setCodBusy] = useState(false);

  const price = useMemo(
    () => (product && store ? partnerPrice(product, store) : 0),
    [product, store]
  );
  const stock = useMemo(
    () => (product && store ? partnerStock(product, store) : 0),
    [product, store]
  );

  if (!product || !store) {
    return (
      <EmptyState
        title="Partner listing missing"
        description="This partner product link is invalid."
        actionLabel="Back to shop"
        onAction={() => navigate("/shop")}
      />
    );
  }

  const inCart = getQtyFor(product.id, store.id);
  const out = stock <= 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <Link to={`/shop/product/${product.id}`} className="text-sm font-semibold text-terracotta-600 hover:underline">
        ← Back to Angadi listing
      </Link>

      <div
        className="mt-5 rounded-2xl px-5 py-4 text-white shadow-soft"
        style={{ backgroundColor: store.accent }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Partner storefront</p>
        <h1 className="font-display text-2xl sm:text-3xl mt-1">{store.name}</h1>
        <p className="text-sm opacity-90 mt-1">{store.tagline}</p>
        <p className="text-xs mt-2 opacity-80">
          {store.distanceKm} km · ETA ~{store.etaMinutes} min · ★ {store.rating}
        </p>
      </div>

      <p className="mt-4 text-sm text-ink/55 rounded-xl border border-terracotta-100 bg-white px-4 py-3">
        You are browsing a partner storefront — this order is fulfilled and charged by {store.name}.
        Angadi only helps you compare and redirect.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-terracotta-100 bg-white shadow-soft aspect-square">
          <ProductImage product={product} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-mustard-500">{product.category}</p>
          <h2 className="font-display text-3xl text-ink mt-1">{product.name}</h2>
          <p className="text-sm text-ink/50 mt-1">{product.unit}</p>
          <p className="font-display text-3xl text-terracotta-500 mt-4">{formatINR(price)}</p>
          <p className="text-xs text-ink/45 mt-1">
            Angadi price {formatINR(product.price)} · partner price shown above
          </p>
          <div className="mt-3">
            <StockBadge stock={stock} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.description}</p>

          <div className="mt-8 space-y-3">
            {inCart > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-sage">In cart</span>
                <QuantityStepper
                  value={inCart}
                  min={0}
                  max={stock}
                  onChange={(n) => void changeQty(product.id, store.id, n)}
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <QuantityStepper value={qty} min={1} max={Math.max(stock, 1)} onChange={setQty} />
                <button
                  type="button"
                  disabled={out}
                  onClick={() =>
                    void addProduct(product, qty, {
                      id: store.id,
                      name: store.name,
                      price,
                      stock,
                    })
                  }
                  className="rounded-full border border-ink/25 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-ink hover:text-white disabled:opacity-40"
                >
                  Add to cart
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={out}
              onClick={() => setPayOpen(true)}
              className="w-full sm:w-auto rounded-full bg-ink px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-40"
            >
              Buy now · UPI
            </button>
            <button
              type="button"
              disabled={out || codBusy}
              onClick={() => {
                setCodBusy(true);
                window.setTimeout(() => {
                  const ref = `COD${Date.now().toString().slice(-8)}`;
                  navigate("/order-success", {
                    state: {
                      reference: ref,
                      storeName: store.name,
                      amount: price * (inCart || qty),
                      method: "COD",
                    },
                  });
                }, 1800);
              }}
              className="w-full sm:w-auto rounded-full border border-ink/20 px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] disabled:opacity-40"
            >
              {codBusy ? "Placing COD…" : "Cash on delivery"}
            </button>
          </div>
        </div>
      </div>

      <UpiPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        amount={price * (inCart || qty)}
        upiId={store.upiId}
        storeName={store.name}
        onSuccess={(ref) => {
          setPayOpen(false);
          navigate("/order-success", {
            state: {
              reference: ref,
              storeName: store.name,
              amount: price * (inCart || qty),
              method: "UPI",
            },
          });
        }}
      />
    </main>
  );
}
