import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Sparkles,
  Tag,
  Clock,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { hybridFreshness } from "@/lib/freshness";
import { cn, formatINR } from "@/lib/utils";

type ListingLike = {
  id: string;
  price: number;
  competitorRefPrice: number;
  stock: number;
  lowStockThreshold: number;
  listedAt: string;
  lastCheckedAt?: string;
  lastCheckQualityScore?: number;
  catalog: {
    name: string;
    category: string;
    imageUrl: string;
    shelfLifeDays: number;
    unit: string;
    decayCurveType?: "FAST_EARLY" | "LINEAR" | "SLOW";
  };
};

type Insight = {
  id: string;
  kind: "restock" | "price" | "freshness" | "bundle" | "timing";
  title: string;
  detail: string;
  listingId?: string;
  imageUrl?: string;
  actionLabel?: string;
};

const KIND_META: Record<
  Insight["kind"],
  { icon: typeof Sparkles; tone: string; pill: string }
> = {
  restock: {
    icon: Package,
    tone: "bg-amber-50 border-amber-200/80",
    pill: "bg-amber-100 text-amber-900",
  },
  price: {
    icon: Tag,
    tone: "bg-violet-50 border-violet-200/70",
    pill: "bg-violet-100 text-violet-900",
  },
  freshness: {
    icon: Clock,
    tone: "bg-red-50 border-red-200/70",
    pill: "bg-red-100 text-red-800",
  },
  bundle: {
    icon: Boxes,
    tone: "bg-sky-50 border-sky-200/70",
    pill: "bg-sky-100 text-sky-900",
  },
  timing: {
    icon: Sparkles,
    tone: "bg-emerald-50 border-emerald-200/70",
    pill: "bg-emerald-100 text-emerald-900",
  },
};

export function buildInventoryInsights(listings: ListingLike[]): Insight[] {
  const insights: Insight[] = [];

  const low = [...listings]
    .filter((l) => l.stock <= l.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock);

  for (const l of low.slice(0, 3)) {
    insights.push({
      id: `restock-${l.id}`,
      kind: "restock",
      title: `Restock ${l.catalog.name.split("(")[0].trim()}`,
      detail: `Only ${l.stock} left · threshold ${l.lowStockThreshold}. Suggested reorder: ${Math.max(12, l.lowStockThreshold * 3)} ${l.catalog.unit}.`,
      listingId: l.id,
      imageUrl: l.catalog.imageUrl,
      actionLabel: "Update stock",
    });
  }

  const overpriced = [...listings]
    .map((l) => ({
      l,
      delta: l.price - l.competitorRefPrice,
      pct:
        l.competitorRefPrice > 0
          ? ((l.price - l.competitorRefPrice) / l.competitorRefPrice) * 100
          : 0,
    }))
    .filter((x) => x.delta > 2)
    .sort((a, b) => b.pct - a.pct);

  for (const { l, delta, pct } of overpriced.slice(0, 2)) {
    const target = Math.round(l.competitorRefPrice * 0.98 * 2) / 2;
    insights.push({
      id: `price-${l.id}`,
      kind: "price",
      title: `Price edge on ${l.catalog.name.split("(")[0].trim()}`,
      detail: `You're ₹${delta.toFixed(0)} (${pct.toFixed(0)}%) above market ref ${formatINR(l.competitorRefPrice)}. Test ${formatINR(target)} to win the buy box.`,
      listingId: l.id,
      imageUrl: l.catalog.imageUrl,
      actionLabel: "Adjust price",
    });
  }

  const underpriced = [...listings]
    .filter((l) => l.competitorRefPrice - l.price >= 8 && l.stock > 5)
    .slice(0, 1);
  for (const l of underpriced) {
    insights.push({
      id: `margin-${l.id}`,
      kind: "price",
      title: `Margin room — ${l.catalog.name.split("(")[0].trim()}`,
      detail: `You're well below market. Nudge toward ${formatINR(Math.round(l.competitorRefPrice * 0.95))} without losing conversion.`,
      listingId: l.id,
      imageUrl: l.catalog.imageUrl,
      actionLabel: "Tune price",
    });
  }

  for (const l of listings) {
    const fresh = hybridFreshness({
      shelfLifeDays: l.catalog.shelfLifeDays,
      decayCurveType: l.catalog.decayCurveType,
      lastCheckedAt: l.lastCheckedAt ?? l.listedAt,
      listedAt: l.listedAt,
      lastCheckQualityScore: l.lastCheckQualityScore ?? 1,
    });
    if (fresh.band === "discard_soon" || fresh.band === "expired") {
      insights.push({
        id: `fresh-${l.id}`,
        kind: "freshness",
        title: `Move ${l.catalog.name.split("(")[0].trim()} fast`,
        detail: `${fresh.text}. Flash −10% or bundle before write-off.`,
        listingId: l.id,
        imageUrl: l.catalog.imageUrl,
        actionLabel: "Promo price",
      });
    } else if (
      fresh.band === "fading" &&
      insights.filter((i) => i.kind === "freshness").length < 2
    ) {
      insights.push({
        id: `soon-${l.id}`,
        kind: "freshness",
        title: `Sell soon — ${l.catalog.name.split("(")[0].trim()}`,
        detail: `${fresh.text}. Feature on storefront shelf this evening.`,
        listingId: l.id,
        imageUrl: l.catalog.imageUrl,
      });
    }
  }

  const byCat = new Map<string, ListingLike[]>();
  for (const l of listings) {
    const arr = byCat.get(l.catalog.category) ?? [];
    arr.push(l);
    byCat.set(l.catalog.category, arr);
  }
  for (const [cat, items] of byCat) {
    if (items.length >= 2 && insights.length < 8) {
      insights.push({
        id: `bundle-${cat}`,
        kind: "bundle",
        title: `Bundle ${cat.toLowerCase()}`,
        detail: `Pair ${items[0].catalog.name.split("(")[0].trim()} + ${items[1].catalog.name.split("(")[0].trim()} for a neighborhood combo deal.`,
        imageUrl: items[0].catalog.imageUrl,
      });
      break;
    }
  }

  insights.push({
    id: "timing-evening",
    kind: "timing",
    title: "Evening demand window",
    detail:
      "Simulated peak 6–8 pm for grocery & produce. Raise visibility / slight promo then.",
  });

  // Deduplicate by id, cap
  const seen = new Set<string>();
  return insights
    .filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    })
    .slice(0, 6);
}

type Props = {
  listings: ListingLike[];
  onFocusListing?: (id: string) => void;
};

export function InventoryAiInsights({ listings, onFocusListing }: Props) {
  const insights = useMemo(
    () => buildInventoryInsights(listings),
    [listings]
  );

  if (listings.length === 0) return null;

  return (
    <section className="mb-6 rounded-[22px] border border-ink/6 bg-white p-5 sm:p-6 shadow-[0_8px_28px_rgba(28,27,25,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta/12 text-terracotta">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
              AI insights
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted max-w-xl">
            Live recommendations from your stock, freshness, and market prices.
          </p>
        </div>
        <Link
          to="/vendor/insights"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta hover:underline underline-offset-4"
        >
          Full forecast
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {insights.map((ins) => {
          const meta = KIND_META[ins.kind];
          const Icon = meta.icon;
          return (
            <article
              key={ins.id}
              className={cn(
                "rounded-2xl border p-3.5 flex gap-3",
                meta.tone
              )}
            >
              {ins.imageUrl ? (
                <img
                  src={ins.imageUrl}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover bg-white/60 shrink-0 ring-1 ring-ink/8"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/70">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink leading-snug">
                    {ins.title}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      meta.pill
                    )}
                  >
                    {ins.kind}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink/75 leading-snug">
                  {ins.detail}
                </p>
                {ins.listingId && onFocusListing && (
                  <button
                    type="button"
                    onClick={() => onFocusListing(ins.listingId!)}
                    className="mt-2 text-[11px] font-semibold text-ink underline underline-offset-2"
                  >
                    {ins.actionLabel ?? "Open listing"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Compact one-liner tip for a table row */
export function rowAiTip(listing: ListingLike): string | null {
  if (listing.stock <= listing.lowStockThreshold) {
    return `AI: restock soon (${listing.stock} left)`;
  }
  const delta = listing.price - listing.competitorRefPrice;
  if (delta > 2) {
    return `AI: ${formatINR(delta)} above market — consider a nudge down`;
  }
  if (listing.competitorRefPrice - listing.price >= 8) {
    return `AI: room to raise price toward market`;
  }
  const fresh = hybridFreshness({
    shelfLifeDays: listing.catalog.shelfLifeDays,
    decayCurveType: listing.catalog.decayCurveType,
    lastCheckedAt: listing.lastCheckedAt ?? listing.listedAt,
    listedAt: listing.listedAt,
    lastCheckQualityScore: listing.lastCheckQualityScore ?? 1,
  });
  if (fresh.band === "discard_soon" || fresh.band === "fading") {
    return `AI: ${fresh.text.toLowerCase()} — promote today`;
  }
  return null;
}
