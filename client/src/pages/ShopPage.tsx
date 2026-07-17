import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useShopLocation } from "@/hooks/useShopLocation";
import { getSocket, type FreshnessUpdatedEvent, type StockUpdatedEvent } from "@/lib/socket";
import { ShopToastStack, useShopToasts } from "@/components/shop/ShopToast";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductSkeletonGrid } from "@/components/shop/ProductSkeleton";
import { SortDropdown } from "@/components/shop/SortDropdown";
import { CartDrawer, MiniCartButton } from "@/components/shop/CartDrawer";
import { sortCatalog, type SortOption } from "@/hooks/useShopProducts";
import { useCartStore } from "@/store/cartStore";

export type CatalogCard = {
  id: string;
  name: string;
  category: string;
  unit: string;
  imageUrl: string;
  shelfLifeDays: number;
  decayCurveType?: string;
  listingCount: number;
  shopCount: number;
  totalStock: number;
  lowestPrice: number | null;
  stockStatus: "available" | "low" | "out";
  stockLabel: string;
  nearestDistanceKm: number | null;
  bestVendor: { id: string; storeName: string } | null;
  freshness?: {
    percent: number;
    band: string;
    text: string;
    bestPercent?: number;
    daysLeft?: number;
    daysSurviveText?: string;
  } | null;
};

/** @deprecated alias — keep ProductDetail imports compiling during migration */
export type ShopProduct = CatalogCard & {
  price: number;
  stock: number;
  description?: string;
  freshness?: unknown;
  vendor: { id: string; storeName: string; lat?: number; lng?: number } | null;
};

function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function ShopPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { location, geoError, locating, requestGeo, pickArea, clear, presets } =
    useShopLocation();
  const { toasts, push } = useShopToasts();

  const [catalog, setCatalog] = useState<CatalogCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [nearOpen, setNearOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [cartOpen, setCartOpen] = useState(false);
  const patchStock = useCartStore((s) => s.patchStock);
  const debouncedSearch = useDebounced(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (category !== "all") params.category = category;
      if (debouncedSearch) params.search = debouncedSearch;
      if (location) {
        params.lat = String(location.lat);
        params.lng = String(location.lng);
        params.radiusKm = "12";
      }
      const { data } = await api.get<{
        catalog: CatalogCard[];
        categories: string[];
      }>("/catalog", { params });
      setCatalog(data.catalog ?? []);
      setCategories(data.categories ?? []);
    } catch {
      setError("Couldn't load the market. Is the API running on :4000?");
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch, location]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live stock/price/freshness from vendor hub → patch cards
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onStock = (ev: StockUpdatedEvent) => {
      patchStock(ev.catalogId, ev.stock);
      setFlashIds((s) => new Set(s).add(ev.catalogId));
      window.setTimeout(() => {
        setFlashIds((s) => {
          const n = new Set(s);
          n.delete(ev.catalogId);
          return n;
        });
      }, 1600);
      push("A nearby shop updated stock or price", "info");
      void load();
    };
    const onFresh = (ev: FreshnessUpdatedEvent) => {
      setCatalog((prev) =>
        prev.map((c) =>
          c.id === ev.catalogId
            ? {
                ...c,
                freshness: {
                  percent: ev.freshnessPercent,
                  band: ev.freshnessBand,
                  text: ev.freshnessText,
                  bestPercent: c.freshness?.bestPercent,
                },
              }
            : c
        )
      );
      setFlashIds((s) => new Set(s).add(ev.catalogId));
      window.setTimeout(() => {
        setFlashIds((s) => {
          const n = new Set(s);
          n.delete(ev.catalogId);
          return n;
        });
      }, 1600);
      void load();
    };
    socket.on("stock-updated", onStock);
    socket.on("freshness-updated", onFresh);
    return () => {
      socket.off("stock-updated", onStock);
      socket.off("freshness-updated", onFresh);
    };
  }, [load, push, patchStock]);

  const chips = useMemo(() => ["all", ...categories], [categories]);
  const sortedCatalog = useMemo(
    () => sortCatalog(catalog, sort),
    [catalog, sort]
  );

  return (
    <div className="min-h-screen bg-bone text-charcoal">
      <header className="sticky top-0 z-40 border-b border-charcoal/8 bg-bone/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="font-display text-lg sm:text-xl tracking-[0.12em] uppercase text-charcoal"
          >
            Angadi
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-[11px] sm:text-xs tracking-[0.18em] uppercase text-charcoal/70">
            <Link to="/shop" className="text-charcoal font-medium">
              Shop
            </Link>
            <Link
              to="/shop/request"
              className="hover:text-charcoal transition-colors hidden sm:inline"
            >
              Request
            </Link>
            {user ? (
              <>
                <Link
                  to={
                    user.role === "vendor" ? "/vendor/dashboard" : "/shop/orders"
                  }
                  className="hover:text-charcoal transition-colors"
                >
                  {user.role === "vendor" ? "Hub" : "Orders"}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hover:text-charcoal transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:text-charcoal transition-colors">
                Sign in
              </Link>
            )}
            <MiniCartButton onOpen={() => setCartOpen(true)} />
          </nav>
        </div>
      </header>

      <section className="border-b border-charcoal/8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <p className="text-[10px] tracking-[0.32em] uppercase text-amber-earth mb-3">
              Live neighborhood market
            </p>
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] leading-[0.95] text-charcoal">
              Shop <em className="italic font-light">essentials</em>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-charcoal/65">
              Real vendor stock and prices — updates live when shops change
              listings.
            </p>
          </div>
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the market…"
                className="w-full rounded-full border border-charcoal/12 bg-white/70 pl-11 pr-4 py-3.5 text-[14px] outline-none focus:border-amber-earth/50"
              />
            </div>
            <div className={cn("relative", nearOpen && "z-50")}>
              <button
                type="button"
                onClick={() => setNearOpen((o) => !o)}
                className={cn(
                  "w-full inline-flex items-center justify-between gap-2 rounded-full border px-4 py-2.5 text-[12px] font-medium",
                  location
                    ? "border-emerald-600/30 bg-emerald-50 text-emerald-900"
                    : "border-amber-earth/40 bg-amber-earth/10 text-charcoal"
                )}
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {location
                    ? location.label
                    : "Set your location — T. Nagar, Adyar…"}
                </span>
                <span className="text-[10px] uppercase tracking-wide opacity-70 shrink-0">
                  {locating ? "…" : location ? "Edit" : "Set"}
                </span>
              </button>
              {nearOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-charcoal/10 bg-white p-3 shadow-lg">
                  <p className="text-[11px] text-charcoal/55 mb-2 leading-relaxed">
                    Location should be your area so we sort shops by distance and
                    show nearby stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      requestGeo();
                      setNearOpen(false);
                    }}
                    className="w-full h-10 rounded-xl bg-charcoal text-white text-[12px] font-semibold"
                  >
                    {locating ? "Locating…" : "Use my GPS location"}
                  </button>
                  {geoError && (
                    <p className="mt-2 text-[11px] text-amber-800">{geoError}</p>
                  )}
                  <p className="mt-3 text-[10px] uppercase tracking-wide text-charcoal/45">
                    Or pick a Chennai area
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          pickArea(p);
                          setNearOpen(false);
                        }}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] hover:border-charcoal/35",
                          location?.label === p.label
                            ? "border-emerald-600/40 bg-emerald-50 text-emerald-900"
                            : "border-charcoal/12"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {location && (
                    <button
                      type="button"
                      onClick={() => {
                        clear();
                        setNearOpen(false);
                      }}
                      className="mt-2 text-[11px] text-charcoal/50 underline"
                    >
                      Clear location
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[57px] z-30 bg-bone/95 backdrop-blur border-b border-charcoal/8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[11px] tracking-[0.16em] uppercase transition-colors",
                category === c
                  ? "bg-charcoal text-white"
                  : "border border-charcoal/15 text-charcoal/65 hover:border-charcoal/35"
              )}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
          </div>
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-12">
        {loading && <ProductSkeletonGrid count={8} />}

        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-charcoal/70">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 text-[11px] tracking-[0.2em] uppercase border-b border-charcoal/30 pb-1"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && catalog.length === 0 && (
          <div className="text-center py-24">
            <p className="font-display text-2xl">Nothing matches</p>
            <p className="mt-2 text-charcoal/55 text-sm">
              Try another category — or request a product from nearby shops.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setCategory("all");
                  setSearch("");
                }}
                className="text-[11px] tracking-[0.2em] uppercase border-b border-charcoal/30 pb-1"
              >
                Reset filters
              </button>
              <Link
                to={`/shop/request${search ? `?name=${encodeURIComponent(search)}` : ""}`}
                className="text-[11px] tracking-[0.2em] uppercase border-b border-amber-earth pb-1 text-amber-earth"
              >
                Can't find it? Request it
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && sortedCatalog.length > 0 && (
          <>
            <p className="text-[11px] tracking-[0.18em] uppercase text-charcoal/45 mb-8">
              {sortedCatalog.length} product{sortedCatalog.length === 1 ? "" : "s"}
              {location ? ` · near ${location.label}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-6">
              {sortedCatalog.map((p) => (
                <ProductCard key={p.id} product={p} pulsing={flashIds.has(p.id)} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-charcoal/8 px-6 py-8 text-center text-[11px] tracking-[0.15em] uppercase text-charcoal/40">
        Angadi · Live vendor catalog
      </footer>
      <ShopToastStack toasts={toasts} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
