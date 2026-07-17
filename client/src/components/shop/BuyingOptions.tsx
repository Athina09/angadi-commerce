import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cn, formatINR, haversineKm } from "@/lib/utils";

export type SellerOffer = {
  id: string;
  storeName: string;
  lat: number;
  lng: number;
  price: number;
  stock: number;
  rating: number;
  reviews: number;
  deliveryMin: number;
  deliveryMax: number;
  verified?: boolean;
};

type UserLocation = {
  lat: number;
  lng: number;
  label: string;
};

const CITY_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: "Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { label: "Bengaluru, Karnataka", lat: 12.9716, lng: 77.5946 },
  { label: "Mumbai, Maharashtra", lat: 19.076, lng: 72.8777 },
  { label: "Delhi NCR", lat: 28.6139, lng: 77.209 },
  { label: "Hyderabad, Telangana", lat: 17.385, lng: 78.4867 },
];

function buildOffers(
  basePrice: number,
  baseStock: number,
  primaryName: string,
  primaryLat?: number,
  primaryLng?: number
): SellerOffer[] {
  const anchors = [
    {
      id: "s1",
      storeName: primaryName || "Ravi's Green Grocer",
      lat: primaryLat ?? 13.05,
      lng: primaryLng ?? 80.25,
      priceMul: 1,
      stockMul: 1,
      rating: 4.8,
      reviews: 284,
      deliveryMin: 25,
      deliveryMax: 35,
      verified: true,
    },
    {
      id: "s2",
      storeName: "Fresh Basket CP",
      lat: (primaryLat ?? 13.05) + 0.018,
      lng: (primaryLng ?? 80.25) - 0.012,
      priceMul: 0.93,
      stockMul: 0.6,
      rating: 4.6,
      reviews: 152,
      deliveryMin: 30,
      deliveryMax: 45,
      verified: true,
    },
    {
      id: "s3",
      storeName: "Neighborhood Pantry",
      lat: (primaryLat ?? 13.05) - 0.022,
      lng: (primaryLng ?? 80.25) + 0.015,
      priceMul: 1.07,
      stockMul: 1.4,
      rating: 4.5,
      reviews: 98,
      deliveryMin: 20,
      deliveryMax: 30,
    },
    {
      id: "s4",
      storeName: "Daily Harvest Hub",
      lat: (primaryLat ?? 13.05) + 0.035,
      lng: (primaryLng ?? 80.25) + 0.028,
      priceMul: 0.98,
      stockMul: 0.25,
      rating: 4.3,
      reviews: 67,
      deliveryMin: 40,
      deliveryMax: 55,
    },
    {
      id: "s5",
      storeName: "Corner Staples Co.",
      lat: (primaryLat ?? 13.05) - 0.01,
      lng: (primaryLng ?? 80.25) - 0.03,
      priceMul: 1.12,
      stockMul: 0.05,
      rating: 4.1,
      reviews: 41,
      deliveryMin: 35,
      deliveryMax: 50,
    },
  ];

  return anchors.map((a) => ({
    id: a.id,
    storeName: a.storeName,
    lat: a.lat,
    lng: a.lng,
    price: Math.round(basePrice * a.priceMul),
    stock: Math.max(0, Math.round(baseStock * a.stockMul)),
    rating: a.rating,
    reviews: a.reviews,
    deliveryMin: a.deliveryMin,
    deliveryMax: a.deliveryMax,
    verified: a.verified,
  }));
}

function stockStatus(stock: number): "in" | "low" | "out" {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "in";
}

type Props = {
  productName: string;
  basePrice: number;
  baseStock: number;
  primaryStoreName: string;
  primaryLat?: number;
  primaryLng?: number;
  selectedSellerId: string | null;
  onSelectSeller: (offer: SellerOffer) => void;
};

export function BuyingOptions({
  productName,
  basePrice,
  baseStock,
  primaryStoreName,
  primaryLat,
  primaryLng,
  selectedSellerId,
  onSelectSeller,
}: Props) {
  const [location, setLocation] = useState<UserLocation>({
    ...CITY_PRESETS[0],
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "denied" | "ok">(
    "idle"
  );
  const [offers, setOffers] = useState<SellerOffer[]>(() =>
    buildOffers(basePrice, baseStock, primaryStoreName, primaryLat, primaryLng)
  );
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const prevStock = useRef<Record<string, number>>({});

  // Geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Your current location",
        });
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // Rebuild when product base changes
  useEffect(() => {
    setOffers(
      buildOffers(basePrice, baseStock, primaryStoreName, primaryLat, primaryLng)
    );
  }, [basePrice, baseStock, primaryStoreName, primaryLat, primaryLng]);

  // Soft live polling — calm price/stock drift
  useEffect(() => {
    const id = window.setInterval(() => {
      setOffers((prev) => {
        const next = prev.map((o) => {
          const roll = Math.random();
          let price = o.price;
          let stock = o.stock;
          let changed = false;

          if (roll > 0.72 && o.stock > 0) {
            stock = Math.max(0, o.stock - (Math.random() > 0.5 ? 1 : 0));
            if (stock !== o.stock) changed = true;
          }
          if (roll > 0.88) {
            const delta = Math.random() > 0.5 ? 1 : -1;
            price = Math.max(1, o.price + delta);
            if (price !== o.price) changed = true;
          }

          if (changed) {
            setFlashIds((f) => new Set(f).add(o.id));
            window.setTimeout(() => {
              setFlashIds((f) => {
                const n = new Set(f);
                n.delete(o.id);
                return n;
              });
            }, 1200);
          }

          // Sold-out note
          const was = prevStock.current[o.id] ?? o.stock;
          if (was > 0 && stock === 0) {
            setNote(
              `${o.storeName} just sold out — showing next nearest seller.`
            );
            window.setTimeout(() => setNote(null), 4500);
          }
          prevStock.current[o.id] = stock;

          return { ...o, price, stock };
        });
        return next;
      });
    }, 18000);
    return () => window.clearInterval(id);
  }, []);

  const ranked = useMemo(() => {
    const withDist = offers.map((o) => ({
      ...o,
      distanceKm: haversineKm(location.lat, location.lng, o.lat, o.lng),
    }));

    const inStock = withDist.filter((o) => o.stock > 0);
    const out = withDist.filter((o) => o.stock <= 0);

    const sortFn = (
      a: (typeof withDist)[0],
      b: (typeof withDist)[0]
    ) => {
      // Prefer nearer, then cheaper
      if (Math.abs(a.distanceKm - b.distanceKm) > 0.15) {
        return a.distanceKm - b.distanceKm;
      }
      return a.price - b.price;
    };

    inStock.sort(sortFn);
    out.sort(sortFn);
    return [...inStock, ...out];
  }, [offers, location]);

  const bestPriceId = useMemo(() => {
    const available = ranked.filter((o) => o.stock > 0);
    if (!available.length) return null;
    return available.reduce((best, o) => (o.price < best.price ? o : best))
      .id;
  }, [ranked]);

  const nearestId = useMemo(() => {
    const available = ranked.filter((o) => o.stock > 0);
    return available[0]?.id ?? null;
  }, [ranked]);

  const selectCity = useCallback((city: (typeof CITY_PRESETS)[0]) => {
    setLocation({ lat: city.lat, lng: city.lng, label: city.label });
    setPickerOpen(false);
    setGeoStatus("ok");
  }, []);

  // Auto-select nearest in-stock once when location/offers ready
  const didAutoSelect = useRef(false);
  useEffect(() => {
    didAutoSelect.current = false;
  }, [location.lat, location.lng]);

  useEffect(() => {
    if (didAutoSelect.current) return;
    if (!nearestId) return;
    const offer = offers.find((o) => o.id === nearestId);
    if (offer && offer.stock > 0) {
      onSelectSeller(offer);
      didAutoSelect.current = true;
    }
  }, [nearestId, offers, onSelectSeller]);

  return (
    <section className="mt-12 pt-10 border-t border-charcoal/8">
      <p className="text-[10px] tracking-[0.28em] uppercase text-amber-earth">
        Available near you
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-charcoal/70">
          <MapPin className="h-3.5 w-3.5 text-charcoal/50" strokeWidth={1.5} />
          Showing sellers near{" "}
          <span className="text-charcoal font-medium">{location.label}</span>
        </span>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="text-[12px] text-charcoal/45 underline underline-offset-4 hover:text-charcoal/70 transition-colors"
        >
          Change location
        </button>
        {geoStatus === "asking" && (
          <span className="text-[11px] text-charcoal/40">Detecting…</span>
        )}
      </div>

      {pickerOpen && (
        <div className="mt-4 rounded-lg border border-charcoal/10 bg-white/60 p-3 space-y-1">
          <p className="text-[10px] tracking-[0.2em] uppercase text-charcoal/40 px-2 pb-2">
            Choose a city
          </p>
          {CITY_PRESETS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => selectCity(c)}
              className={cn(
                "w-full text-left px-3 py-2.5 text-[14px] rounded-md transition-colors",
                location.label === c.label
                  ? "bg-amber-earth/10 text-amber-earth"
                  : "hover:bg-charcoal/5 text-charcoal/80"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {note && (
        <p className="mt-4 text-[13px] text-charcoal/60 italic border-l-2 border-amber-earth/50 pl-3 animate-[fadeSlideIn_0.4s_ease]">
          {note}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {ranked.map((o) => {
          const status = stockStatus(o.stock);
          const isBest = o.id === bestPriceId && status !== "out";
          const isNearest = o.id === nearestId && status !== "out";
          const selected = o.id === selectedSellerId;
          const tag = isBest ? "Best value" : isNearest ? "Nearest" : null;

          return (
            <li
              key={o.id}
              className={cn(
                "relative rounded-lg border border-charcoal/8 bg-white/40 px-4 py-4 sm:px-5 transition-all duration-500",
                status === "out" && "opacity-60",
                (isBest || isNearest) &&
                  "border-l-[3px] border-l-amber-earth border-charcoal/8",
                selected && "ring-1 ring-charcoal/20 bg-white/70",
                flashIds.has(o.id) && "bg-amber-earth/8"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg text-charcoal font-medium">
                      {o.storeName}
                    </h3>
                    {o.verified && (
                      <span className="text-[10px] tracking-[0.14em] uppercase text-charcoal/45 border border-charcoal/15 rounded-full px-2 py-0.5">
                        Verified
                      </span>
                    )}
                    {tag && (
                      <span className="text-[10px] tracking-[0.14em] uppercase text-amber-earth bg-amber-earth/10 rounded-full px-2 py-0.5">
                        {tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-charcoal/45">
                    {o.rating.toFixed(1)} · {o.reviews} reviews
                  </p>
                  <p className="mt-2 text-[13px] text-charcoal/60">
                    {o.distanceKm < 10
                      ? `${o.distanceKm.toFixed(1)} km away`
                      : `${Math.round(o.distanceKm)} km away`}
                    <span className="mx-2 text-charcoal/25">·</span>
                    Delivers in {o.deliveryMin}–{o.deliveryMax} min
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                  <p
                    className={cn(
                      "font-display text-xl text-charcoal tabular-nums transition-colors duration-500",
                      flashIds.has(o.id) && "text-amber-earth"
                    )}
                  >
                    {formatINR(o.price)}
                  </p>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] tracking-[0.14em] uppercase",
                      status === "in" && "border-sage/50 text-sage",
                      status === "low" && "border-amber-600/40 text-amber-800",
                      status === "out" && "border-charcoal/20 text-charcoal/40"
                    )}
                  >
                    {status === "in"
                      ? "In stock"
                      : status === "low"
                        ? `Low stock · ${o.stock}`
                        : "Out of stock"}
                  </span>
                  <button
                    type="button"
                    disabled={status === "out"}
                    onClick={() => onSelectSeller(o)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-[10px] tracking-[0.18em] uppercase transition-colors duration-300",
                      status === "out"
                        ? "border-charcoal/15 text-charcoal/30 cursor-not-allowed"
                        : selected
                          ? "border-charcoal bg-charcoal text-white"
                          : "border-charcoal/40 text-charcoal hover:bg-charcoal hover:text-white"
                    )}
                  >
                    {selected ? "Selected" : "Choose seller"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-[11px] tracking-[0.16em] uppercase text-charcoal/40">
        Prices and availability update in real time based on your location
      </p>
      <p className="sr-only">{productName}</p>
    </section>
  );
}
