import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { StockBadge } from "@/components/shop/StockBadge";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { useCartStore } from "@/store/cartStore";
import { getPartner, partnerPrice, PARTNERS } from "@/mock/partnerStores";

type Catalog = {
  id: string;
  name: string;
  category: string;
  unit: string;
  imageUrl: string;
  lowestPrice: number | null;
  totalStock: number;
};

export function PartnerStorePage() {
  const { storeId, productId } = useParams();
  const navigate = useNavigate();
  const partner = storeId ? getPartner(storeId) : undefined;
  const addItem = useCartStore((s) => s.addItem);
  const getQty = useCartStore((s) => s.getQty);
  const updateQty = useCartStore((s) => s.updateQty);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [qty, setQty] = useState(1);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (!productId) return;
    void api
      .get<{ catalog: Catalog; listings: unknown[] }>(`/catalog/${productId}/listings`, {
        params: { sort: "price" },
      })
      .then(({ data }) => setCatalog(data.catalog))
      .catch(() => {
        void api.get(`/products/${productId}`).then(({ data }) => {
          const p = (data as { product: Catalog & { price: number; stock: number } }).product;
          setCatalog({
            id: p.id,
            name: p.name,
            category: p.category,
            unit: p.unit,
            imageUrl: p.imageUrl,
            lowestPrice: p.price,
            totalStock: p.stock,
          });
        });
      });
  }, [productId]);

  if (!partner || !catalog) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <p className="text-charcoal/60">Loading partner storefront…</p>
      </div>
    );
  }

  const base = catalog.lowestPrice ?? 0;
  const price = partnerPrice(base, partner);
  const stock = Math.max(0, catalog.totalStock - 1);
  const inCart = getQty(catalog.id, partner.id);

  return (
    <div className="min-h-screen bg-bone text-charcoal">
      <header className="border-b border-charcoal/10 px-5 py-4">
        <Link to={`/shop/product/${catalog.id}`} className="text-sm text-amber-earth hover:underline">
          ← Back to Angadi listing
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 grid gap-8 md:grid-cols-2">
        <div
          className="rounded-2xl p-5 text-white"
          style={{ backgroundColor: partner.accent }}
        >
          <p className="text-[10px] uppercase tracking-widest opacity-80">Partner store</p>
          <h1 className="font-display text-3xl mt-1">{partner.name}</h1>
          <p className="text-sm opacity-90 mt-1">{partner.tagline}</p>
        </div>
        <div className="md:col-span-2 grid gap-8 md:grid-cols-2">
          <img
            src={catalog.imageUrl}
            alt={catalog.name}
            className="w-full aspect-square object-cover rounded-2xl border border-charcoal/10"
          />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-earth">{catalog.category}</p>
            <h2 className="font-display text-3xl mt-1">{catalog.name}</h2>
            <p className="font-display text-2xl text-amber-earth mt-3">{formatINR(price)}</p>
            <StockBadge stock={stock} className="mt-2" />
            {inCart > 0 ? (
              <div className="mt-6 flex items-center gap-3">
                <span className="text-sm font-medium text-emerald-700">In cart</span>
                <QuantityStepper
                  value={inCart}
                  min={0}
                  max={stock}
                  onChange={(n) =>
                    n <= 0
                      ? useCartStore.getState().removeItem(catalog.id, partner.id)
                      : updateQty(catalog.id, partner.id, n)
                  }
                />
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3 items-center">
                <QuantityStepper value={qty} min={1} max={Math.max(stock, 1)} onChange={setQty} />
                <button
                  type="button"
                  disabled={stock <= 0}
                  onClick={() => {
                    const ok = addItem(
                      {
                        catalogId: catalog.id,
                        name: catalog.name,
                        price,
                        stock,
                        imageUrl: catalog.imageUrl,
                        unit: catalog.unit,
                        storeId: partner.id,
                        storeName: partner.name,
                      },
                      qty
                    );
                    if (ok) toast.success("Added to cart");
                    else toast.warning(`Only ${stock} available`);
                  }}
                  className="rounded-full border border-charcoal/20 px-6 py-2.5 text-[11px] uppercase tracking-wider hover:bg-charcoal hover:text-white"
                >
                  Add to cart
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={stock <= 0}
              onClick={() => setPayOpen(true)}
              className="mt-4 rounded-full bg-charcoal px-8 py-3 text-[11px] uppercase tracking-wider text-white disabled:opacity-40"
            >
              Buy now · UPI
            </button>
          </div>
        </div>
      </main>

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-cream p-6 shadow-xl">
            <h3 className="font-display text-xl">Mock UPI payment</h3>
            <p className="text-sm text-charcoal/55 mt-1">Pay {formatINR(price * (inCart || qty))} to {partner.upiId}</p>
            <div className="my-4 h-32 rounded-xl border-2 border-dashed border-charcoal/20 flex items-center justify-center text-xs text-charcoal/40">
              QR placeholder
            </div>
            <button
              type="button"
              onClick={() => {
                setPayOpen(false);
                toast.success("Payment successful (demo)");
                navigate("/shop/checkout/success", {
                  state: { ref: `UPI${Date.now()}`, total: price * (inCart || qty) },
                });
              }}
              className="w-full rounded-full bg-charcoal py-3 text-[11px] uppercase tracking-wider text-white"
            >
              Confirm payment
            </button>
            <button type="button" onClick={() => setPayOpen(false)} className="mt-2 w-full text-sm text-charcoal/50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Price comparison rows on product detail */
export function PartnerPriceRows({
  catalogId,
  basePrice,
  stock,
}: {
  catalogId: string;
  basePrice: number;
  stock: number;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-charcoal/10 bg-white p-5">
      <p className="text-[10px] uppercase tracking-widest text-amber-earth">Nearby price comparison</p>
      <ul className="mt-4 divide-y divide-charcoal/8">
        {PARTNERS.map((p) => {
          const price = partnerPrice(basePrice, p);
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex-1 min-w-[8rem]">
                <p className="font-display">{p.name}</p>
                <p className="text-xs text-charcoal/45">{p.tagline}</p>
              </div>
              <StockBadge stock={Math.max(0, stock - 1)} />
              <p className="font-display text-lg">{formatINR(price)}</p>
              <Link
                to={`/shop/partner/${p.id}/product/${catalogId}`}
                className="rounded-full border border-charcoal/20 px-4 py-2 text-[10px] uppercase tracking-wider hover:bg-charcoal hover:text-white"
              >
                Buy from {p.name.split(" ")[0]}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
