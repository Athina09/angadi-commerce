import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatINR, formatPct } from "@/lib/utils";
import {
  freshnessBadgeClass,
  freshnessConfidenceClass,
} from "@/lib/freshness";
import { useShopLocation } from "@/hooks/useShopLocation";
import { getSocket, joinProductRoom, leaveProductRoom, type FreshnessUpdatedEvent, type StockUpdatedEvent } from "@/lib/socket";
import { ShopToastStack, useShopToasts } from "@/components/shop/ShopToast";
import { PartnerPriceRows } from "@/pages/PartnerStorePage";

type Freshness = {
  percent: number;
  band: string;
  text: string;
  confidence: "verified" | "estimated";
  confidenceText: string;
  daysLeft?: number;
  daysSurviveText?: string;
};

type VendorListing = {
  id: string;
  catalogId: string;
  vendorId: string;
  price: number;
  competitorRefPrice: number;
  stock: number;
  lowStockThreshold: number;
  distanceKm: number | null;
  priceDeltaPct: number;
  freshness: Freshness;
  vendor: {
    id: string;
    storeName: string;
    lat: number;
    lng: number;
    verified: boolean;
  };
};

type CatalogMeta = {
  id: string;
  name: string;
  category: string;
  unit: string;
  imageUrl: string;
  shelfLifeDays: number;
  decayCurveType: string;
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { location, requestGeo, pickArea, presets } = useShopLocation();
  const { toasts, push } = useShopToasts();

  const [catalog, setCatalog] = useState<CatalogMeta | null>(null);
  const [listings, setListings] = useState<VendorListing[]>([]);
  const [marketAvg, setMarketAvg] = useState(0);
  const [sort, setSort] = useState<"distance" | "price">("distance");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qtyByListing, setQtyByListing] = useState<Record<string, number>>({});
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { sort };
      if (location) {
        params.lat = String(location.lat);
        params.lng = String(location.lng);
        params.radiusKm = "25";
      }
      const { data } = await api.get<{
        catalog: CatalogMeta;
        listings: VendorListing[];
        marketAvg: number;
      }>(`/catalog/${id}/listings`, { params });
      setCatalog(data.catalog);
      setListings(data.listings ?? []);
      setMarketAvg(data.marketAvg ?? 0);
    } catch {
      setError("Product not found or API unreachable.");
    } finally {
      setLoading(false);
    }
  }, [id, location, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    joinProductRoom(id);
    return () => leaveProductRoom(id);
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;
    const onStock = (ev: StockUpdatedEvent) => {
      if (ev.catalogId !== id) return;
      setListings((prev) =>
        prev.map((l) =>
          l.id === ev.listingId
            ? { ...l, stock: ev.stock, price: ev.price }
            : l
        )
      );
      setFlashIds((s) => new Set(s).add(ev.listingId));
      window.setTimeout(() => {
        setFlashIds((s) => {
          const n = new Set(s);
          n.delete(ev.listingId);
          return n;
        });
      }, 1600);
      push("Live update — a shop changed stock or price", "warn");
    };
    const onFresh = (ev: FreshnessUpdatedEvent) => {
      if (ev.catalogId !== id) return;
      setListings((prev) =>
        prev.map((l) =>
          l.id === ev.listingId
            ? {
                ...l,
                lastCheckQualityScore: ev.lastCheckQualityScore,
                freshness: {
                  ...l.freshness,
                  percent: ev.freshnessPercent,
                  band: ev.freshnessBand as typeof l.freshness.band,
                  text: ev.freshnessText,
                  confidence: "verified",
                  confidenceText: "verified today",
                },
              }
            : l
        )
      );
      setFlashIds((s) => new Set(s).add(ev.listingId));
      push("Live update — freshness score changed", "warn");
    };
    socket.on("stock-updated", onStock);
    socket.on("freshness-updated", onFresh);
    return () => {
      socket.off("stock-updated", onStock);
      socket.off("freshness-updated", onFresh);
    };
  }, [id, push]);

  const inStockCount = useMemo(
    () => listings.filter((l) => l.stock > 0).length,
    [listings]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bone px-5 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-[4/5] animate-pulse bg-charcoal/8" />
          <div className="space-y-4 pt-8">
            <div className="h-4 w-24 animate-pulse bg-charcoal/8 rounded" />
            <div className="h-10 w-3/4 animate-pulse bg-charcoal/8 rounded" />
            <div className="h-24 w-full animate-pulse bg-charcoal/8 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-5">
        <div className="text-center">
          <p className="font-display text-2xl">{error ?? "Not found"}</p>
          <Link
            to="/shop"
            className="mt-6 inline-block text-[11px] tracking-[0.2em] uppercase border-b border-charcoal/30 pb-1"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone text-charcoal">
      <header className="border-b border-charcoal/8 px-5 sm:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link
          to="/shop"
          className="text-[11px] tracking-[0.2em] uppercase text-charcoal/60 hover:text-charcoal"
        >
          ← Back to shop
        </Link>
        <Link to="/" className="font-display tracking-[0.14em] uppercase text-sm">
          Angadi
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="aspect-[4/5] overflow-hidden bg-charcoal/5 sticky top-8">
              <img
                src={catalog.imageUrl}
                alt={catalog.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-[10px] tracking-[0.28em] uppercase text-amber-earth">
              {catalog.category} · {catalog.unit}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.25rem)] leading-tight">
              {catalog.name}
            </h1>
            <p className="mt-2 text-sm text-charcoal/50">
              {inStockCount} shop{inStockCount === 1 ? "" : "s"} with stock
              {marketAvg > 0 ? ` · market ~${formatINR(marketAvg)}` : ""}
            </p>

            {listings.length > 0 && (
              <PartnerPriceRows
                catalogId={catalog.id}
                basePrice={listings[0]?.price ?? marketAvg}
                stock={listings.reduce((s, l) => s + l.stock, 0)}
              />
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSort("distance")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] tracking-wide uppercase font-semibold",
                  sort === "distance"
                    ? "bg-charcoal text-white"
                    : "border border-charcoal/15 text-charcoal/60"
                )}
              >
                Sort · distance
              </button>
              <button
                type="button"
                onClick={() => setSort("price")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] tracking-wide uppercase font-semibold",
                  sort === "price"
                    ? "bg-charcoal text-white"
                    : "border border-charcoal/15 text-charcoal/60"
                )}
              >
                Sort · price
              </button>
              <button
                type="button"
                onClick={() => setShowMap((m) => !m)}
                className="rounded-full border border-charcoal/15 px-3 py-1.5 text-[11px] tracking-wide uppercase font-semibold text-charcoal/60"
              >
                {showMap ? "Hide map" : "Map"}
              </button>
              {!location && (
                <button
                  type="button"
                  onClick={requestGeo}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-900"
                >
                  <MapPin className="h-3 w-3" />
                  Set location
                </button>
              )}
            </div>

            {!location && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {presets.slice(0, 3).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => pickArea(p)}
                    className="rounded-full border border-charcoal/12 px-2.5 py-1 text-[11px] text-charcoal/60 hover:border-charcoal/35"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {showMap && listings.length > 0 && (
              <div className="mt-5 rounded-2xl border border-charcoal/10 overflow-hidden bg-white">
                <div className="h-56 relative bg-[#e8eef5]">
                  {/* Lightweight OSM embed — no API key */}
                  <iframe
                    title="Vendor map"
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      (location?.lng ?? listings[0].vendor.lng) - 0.06
                    }%2C${
                      (location?.lat ?? listings[0].vendor.lat) - 0.04
                    }%2C${
                      (location?.lng ?? listings[0].vendor.lng) + 0.06
                    }%2C${
                      (location?.lat ?? listings[0].vendor.lat) + 0.04
                    }&layer=mapnik&marker=${listings[0].vendor.lat}%2C${listings[0].vendor.lng}`}
                  />
                </div>
                <p className="px-3 py-2 text-[11px] text-charcoal/50">
                  Map · OpenStreetMap · pins list below
                </p>
              </div>
            )}

            {listings.length === 0 || inStockCount === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-charcoal/20 bg-white/60 p-8 text-center">
                <p className="font-display text-2xl">No shops nearby yet</p>
                <p className="mt-2 text-sm text-charcoal/55 max-w-sm mx-auto">
                  Nobody in range is stocking this right now. Request it and
                  we'll notify nearby vendors.
                </p>
                <Link
                  to={`/shop/request?name=${encodeURIComponent(catalog.name)}&category=${encodeURIComponent(catalog.category)}`}
                  className="mt-6 inline-flex rounded-full bg-charcoal text-white text-[11px] tracking-[0.2em] uppercase px-6 py-3"
                >
                  Request this product
                </Link>
                <div className="mt-4">
                  <Link
                    to="/shop"
                    className="text-[11px] tracking-[0.16em] uppercase text-charcoal/50 border-b border-charcoal/20 pb-0.5"
                  >
                    Browse other items
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="mt-8 space-y-3">
                {listings.map((l) => {
                  const qty = qtyByListing[l.id] ?? 1;
                  const flashed = flashIds.has(l.id);
                  const out = l.stock <= 0;
                  return (
                    <li
                      key={l.id}
                      className={cn(
                        "rounded-2xl border border-charcoal/10 bg-white p-4 transition",
                        flashed && "ring-2 ring-amber-earth/50"
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[15px]">
                            {l.vendor.storeName}
                            {l.vendor.verified && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-700">
                                Verified
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-[12px] text-charcoal/55">
                            {l.distanceKm != null
                              ? `${l.distanceKm.toFixed(1)} km away`
                              : "Distance — set location"}
                            {" · "}
                            {out ? "Out of stock" : `${l.stock} in stock`}
                            {" · "}
                            <span
                              className={
                                l.priceDeltaPct <= 0
                                  ? "text-emerald-700"
                                  : "text-amber-800"
                              }
                            >
                              {formatPct(l.priceDeltaPct)} vs market
                            </span>
                          </p>
                          <div className="mt-2 flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                freshnessBadgeClass(
                                  l.freshness.band as
                                    | "fresh"
                                    | "fading"
                                    | "discard_soon"
                                    | "expired"
                                )
                              )}
                            >
                              {l.freshness.text}
                            </span>
                            <span
                              className={cn(
                                "text-[10px]",
                                freshnessConfidenceClass(l.freshness.confidence)
                              )}
                            >
                              {l.freshness.confidenceText}
                            </span>
                            {l.freshness.daysSurviveText && (
                              <span
                                className={cn(
                                  "text-[11px] font-semibold",
                                  (l.freshness.daysLeft ?? 99) <= 1
                                    ? "text-red-700"
                                    : "text-charcoal/70"
                                )}
                              >
                                {l.freshness.daysSurviveText}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="font-display text-2xl tabular-nums">
                          {formatINR(l.price)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center border border-charcoal/15 rounded-full">
                          <button
                            type="button"
                            className="px-3 py-1.5 text-lg disabled:opacity-40"
                            disabled={out}
                            onClick={() =>
                              setQtyByListing((q) => ({
                                ...q,
                                [l.id]: Math.max(1, (q[l.id] ?? 1) - 1),
                              }))
                            }
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-lg disabled:opacity-40"
                            disabled={out}
                            onClick={() =>
                              setQtyByListing((q) => ({
                                ...q,
                                [l.id]: Math.min(l.stock, (q[l.id] ?? 1) + 1),
                              }))
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={out}
                          onClick={() =>
                            push(
                              `Cart wires up next — would add ${qty}× from ${l.vendor.storeName}`,
                              "info"
                            )
                          }
                          className="rounded-full bg-charcoal text-white text-[11px] tracking-[0.16em] uppercase px-5 py-2.5 disabled:opacity-40 hover:bg-amber-earth transition-colors"
                        >
                          Add to cart
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
      <ShopToastStack toasts={toasts} />
    </div>
  );
}
