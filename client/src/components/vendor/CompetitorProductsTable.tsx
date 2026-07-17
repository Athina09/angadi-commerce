import { useMemo, useState } from "react";
import type { CompetitorProduct } from "@/data/vendorDashboardMock";
import { Card } from "@/components/ui/Card";
import { cn, formatINR, formatPct } from "@/lib/utils";

type Props = {
  products: CompetitorProduct[];
};

export function CompetitorProductsTable({ products }: Props) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sellerName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <Card
      title="Competitor products nearby"
      subtitle="Same category SKUs from stalls within your radius — price & stock intel"
    >
      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search competitor products or sellers…"
          className="w-full sm:max-w-md h-14 rounded-[16px] bg-cream/70 px-5 text-base outline-none focus:ring-2 focus:ring-terracotta/30"
        />
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[860px] text-base">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-4 pr-4 font-semibold text-sm uppercase tracking-wide">
                Product
              </th>
              <th className="pb-4 pr-4 font-semibold text-sm uppercase tracking-wide">
                Seller
              </th>
              <th className="pb-4 pr-4 font-semibold text-sm uppercase tracking-wide">
                Distance
              </th>
              <th className="pb-4 pr-4 font-semibold text-sm uppercase tracking-wide">
                Their price
              </th>
              <th className="pb-4 pr-4 font-semibold text-sm uppercase tracking-wide">
                Yours
              </th>
              <th className="pb-4 pr-4 font-semibold text-sm uppercase tracking-wide">
                Delta
              </th>
              <th className="pb-4 font-semibold text-sm uppercase tracking-wide">
                Stock
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className={cn(
                  "border-t border-ink/6 hover:bg-cream/50",
                  p.stockLabel === "Out of stock" && "opacity-55"
                )}
              >
                <td className="py-4 pr-4 h-[72px]">
                  <div className="flex items-center gap-4">
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover bg-cream shadow-sm"
                    />
                    <div>
                      <p className="font-semibold text-ink">{p.name}</p>
                      <p className="text-xs tracking-[0.14em] uppercase text-muted mt-0.5">
                        {p.category}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4 font-display text-lg">{p.sellerName}</td>
                <td className="py-4 pr-4 text-muted tabular-nums">
                  {p.distanceKm.toFixed(1)} km
                </td>
                <td className="py-4 pr-4 font-display font-semibold tabular-nums text-lg">
                  {formatINR(p.price)}
                </td>
                <td className="py-4 pr-4 tabular-nums text-muted">
                  {p.yourPrice != null ? formatINR(p.yourPrice) : "—"}
                </td>
                <td className="py-4 pr-4">
                  {p.yourPrice == null ? (
                    <span className="text-muted text-sm">No match</span>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        p.priceDeltaPct >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      )}
                    >
                      {p.priceDeltaPct >= 0 ? "You cheaper " : "You pricier "}
                      {formatPct(Math.abs(p.priceDeltaPct))}
                    </span>
                  )}
                </td>
                <td className="py-4">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs tracking-[0.12em] uppercase font-semibold",
                      p.stockLabel === "In stock" &&
                        "bg-sage/15 text-sage",
                      p.stockLabel === "Low stock" &&
                        "bg-amber-100 text-amber-800",
                      p.stockLabel === "Out of stock" &&
                        "bg-ink/8 text-muted"
                    )}
                  >
                    {p.stockLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-center text-muted py-12 text-base">
            No competitor matches.
          </p>
        )}
      </div>
    </Card>
  );
}
