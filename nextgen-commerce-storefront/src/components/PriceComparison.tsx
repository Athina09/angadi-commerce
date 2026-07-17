import { useNavigate } from "react-router-dom";
import { StockBadge } from "@/components/StockBadge";
import { getListingsFor, getStoreById } from "@/mock/stores";
import { formatINR } from "@/utils/currency";
import type { Product } from "@/types/product";

export function PriceComparison({ product }: { product: Product }) {
  const navigate = useNavigate();
  const listings = getListingsFor(product);
  const avg =
    listings.reduce((s, l) => s + l.price, 0) / Math.max(listings.length, 1);
  const ourDelta = ((product.price - avg) / avg) * 100;

  return (
    <section className="mt-10 rounded-2xl border border-terracotta-100 bg-white p-5 sm:p-6 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mustard-500">
        Nearby price comparison
      </p>
      <h2 className="mt-1 font-display text-xl text-ink">Partner stores</h2>
      <p className="mt-1 text-sm text-ink/55">
        Local market average {formatINR(Math.round(avg))} · Angadi is{" "}
        <span className={ourDelta <= 0 ? "text-sage" : "text-crit"}>
          {Math.abs(ourDelta).toFixed(1)}% {ourDelta <= 0 ? "below" : "above"} average
        </span>
      </p>

      <ul className="mt-5 divide-y divide-terracotta-50">
        {listings.map((listing) => {
          const store = getStoreById(listing.storeId);
          if (!store) return null;
          return (
            <li
              key={listing.storeId}
              className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex-1 min-w-[10rem]">
                <p className="font-display text-base text-ink">{store.name}</p>
                <p className="text-xs text-ink/45">
                  {store.distanceKm.toFixed(1)} km · ~{store.etaMinutes} min
                </p>
              </div>
              <StockBadge stock={listing.stock} />
              <p className="font-display text-lg text-terracotta-500 w-20 text-right">
                {formatINR(listing.price)}
              </p>
              <button
                type="button"
                disabled={listing.stock <= 0}
                onClick={() => navigate(listing.productUrl)}
                className="rounded-full border border-ink/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink hover:bg-ink hover:text-white disabled:opacity-40 transition-colors"
              >
                Buy from {store.name.split(" ")[0]}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink/45 leading-relaxed">
        Partner purchases are fulfilled on the partner storefront. Angadi does not
        process competitor payments — you pay them directly via UPI or COD on their page.
      </p>
    </section>
  );
}
