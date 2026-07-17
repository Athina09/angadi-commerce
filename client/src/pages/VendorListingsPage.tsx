import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Pencil, Plus, RefreshCw, Trash2, X, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";
import {
  InventoryAiInsights,
  rowAiTip,
} from "@/components/vendor/InventoryAiInsights";
import { FreshnessRecheckModal } from "@/components/vendor/FreshnessRecheckModal";
import {
  freshnessBadgeClass,
  freshnessConfidenceClass,
  hybridFreshness,
} from "@/lib/freshness";
import {
  getSocket,
  joinVendorRoom,
  type FreshnessUpdatedEvent,
  type LowStockAlertEvent,
  type StockUpdatedEvent,
} from "@/lib/socket";
import { cn, formatINR } from "@/lib/utils";

type CatalogOption = {
  id: string;
  name: string;
  category: string;
  unit: string;
  imageUrl: string;
  shelfLifeDays: number;
  decayCurveType?: "FAST_EARLY" | "LINEAR" | "SLOW";
};

type ListingRow = {
  id: string;
  vendorId: string;
  catalogId: string;
  price: number;
  competitorRefPrice: number;
  stock: number;
  lowStockThreshold: number;
  listedAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastCheckQualityScore?: number;
  intakeQualityScore?: number;
  catalog: CatalogOption;
  freshness?: {
    percent: number;
    band: string;
    text: string;
    confidence: "verified" | "estimated";
    confidenceText: string;
    daysLeft?: number;
    daysSurviveText?: string;
  };
};

type Toast = { id: string; message: string };

const UNITS = ["kg", "dozen", "piece", "litre"] as const;

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80";

export function VendorListingsPage() {
  const { token, user } = useAuthStore();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<ListingRow | null>(null);
  const [recheckTarget, setRecheckTarget] = useState<ListingRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    const id = String(Date.now());
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t));
    }, 4200);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [{ data: listData }, { data: catData }] = await Promise.all([
        api.get<{
          listings: ListingRow[];
          vendorId: string;
          verified: boolean;
        }>("/vendor/listings"),
        api.get<{ catalog: CatalogOption[] }>("/catalog"),
      ]);
      setListings(listData.listings);
      setVendorId(listData.vendorId);
      setVerified(listData.verified);
      setCatalog(catData.catalog);
      joinVendorRoom(listData.vendorId);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        setError("onboard");
      } else {
        setError("Failed to load listings");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && user?.role === "vendor") void load();
  }, [token, user?.role, load]);

  // Socket.IO — live stock + low-stock alerts
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onStock = (ev: StockUpdatedEvent) => {
      if (vendorId && ev.vendorId !== vendorId) return;
      setListings((prev) =>
        prev.map((l) =>
          l.id === ev.listingId
            ? {
                ...l,
                stock: ev.stock,
                price: ev.price,
                lowStockThreshold: ev.lowStockThreshold,
              }
            : l
        )
      );
    };

    const onLow = (ev: LowStockAlertEvent) => {
      if (vendorId && ev.vendorId !== vendorId) return;
      showToast(
        `Low stock: ${ev.catalogName} — ${ev.stock} left (threshold ${ev.lowStockThreshold})`
      );
    };

    const onFresh = (ev: FreshnessUpdatedEvent) => {
      if (vendorId && ev.vendorId !== vendorId) return;
      setListings((prev) =>
        prev.map((l) =>
          l.id === ev.listingId
            ? {
                ...l,
                lastCheckQualityScore: ev.lastCheckQualityScore,
                lastCheckedAt: new Date().toISOString(),
                freshness: {
                  percent: ev.freshnessPercent,
                  band: ev.freshnessBand,
                  text: ev.freshnessText,
                  confidence: "verified",
                  confidenceText: "verified today",
                },
              }
            : l
        )
      );
    };

    s.on("stock-updated", onStock);
    s.on("low-stock-alert", onLow);
    s.on("freshness-updated", onFresh);
    return () => {
      s.off("stock-updated", onStock);
      s.off("low-stock-alert", onLow);
      s.off("freshness-updated", onFresh);
    };
  }, [vendorId, showToast]);

  const lowStock = useMemo(
    () => listings.filter((l) => l.stock <= l.lowStockThreshold),
    [listings]
  );

  async function patchListing(
    id: string,
    patch: Partial<Pick<ListingRow, "stock" | "price" | "lowStockThreshold">>
  ) {
    const prev = listings;
    setListings((rows) =>
      rows.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
    try {
      const { data } = await api.put<{ listing: ListingRow }>(
        `/vendor/listings/${id}`,
        patch
      );
      setListings((rows) =>
        rows.map((l) => (l.id === data.listing.id ? data.listing : l))
      );
    } catch {
      setListings(prev);
      showToast("Couldn’t save — reverted");
    }
  }

  async function removeListing(id: string) {
    setSaving(true);
    try {
      await api.delete(`/vendor/listings/${id}`);
      setListings((rows) => rows.filter((l) => l.id !== id));
      setDeleteId(null);
      showToast("Listing removed");
    } catch {
      showToast("Delete failed (orders may reference this listing)");
    } finally {
      setSaving(false);
    }
  }

  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role !== "vendor") return <Navigate to="/shop" replace />;

  if (error === "onboard") {
    return <Navigate to="/vendor/onboarding" replace />;
  }

  return (
    <VendorHubShell title="Live inventory" verified={verified}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-[16px] bg-ink text-white px-5 py-4 shadow-lg text-sm font-medium">
          {toast.message}
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="mb-6 rounded-[16px] bg-amber-50 text-amber-950 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-base">Low stock alert</p>
            <p className="text-sm mt-0.5 opacity-90">
              {lowStock.length} listing
              {lowStock.length === 1 ? "" : "s"} at or below threshold
              {lowStock
                .slice(0, 3)
                .map((l) => ` · ${l.catalog.name} (${l.stock})`)
                .join("")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-base text-muted">
            Live inventory with product photos — stock & price save on blur.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModal("add");
          }}
          className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-[16px] bg-terracotta text-white text-base font-semibold"
        >
          <Plus className="h-5 w-5" />
          Add listing
        </button>
      </div>

      {!loading && !error && listings.length > 0 && (
        <InventoryAiInsights
          listings={listings}
          onFocusListing={(id) => {
            setFocusId(id);
            const row = document.getElementById(`listing-row-${id}`);
            row?.scrollIntoView({ behavior: "smooth", block: "center" });
            const match = listings.find((l) => l.id === id);
            if (match) {
              setEditing(match);
              setModal("edit");
            }
          }}
        />
      )}

      {!loading && !error && listings.length > 0 && (
        <section className="mb-6 rounded-[22px] border border-ink/6 bg-white p-4 sm:p-5 shadow-[0_8px_28px_rgba(28,27,25,0.05)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold tracking-tight">
                Live shelf
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {listings.length} products
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {listings.map((l) => {
              const low = l.stock <= l.lowStockThreshold;
              return (
                <button
                  key={`shelf-${l.id}`}
                  type="button"
                  onClick={() => {
                    setEditing(l);
                    setModal("edit");
                  }}
                  className="group text-left rounded-2xl overflow-hidden ring-1 ring-ink/8 bg-cream hover:ring-terracotta/40 transition"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={l.catalog.imageUrl || PLACEHOLDER_IMG}
                      alt={l.catalog.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
                      }}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span
                      className={cn(
                        "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        l.stock < 4
                          ? "bg-red-600 text-white"
                          : low
                            ? "bg-amber-100 text-amber-900"
                            : "bg-white/90 text-ink"
                      )}
                    >
                      {l.stock} left
                    </span>
                  </div>
                  <div className="p-2.5 bg-white">
                    <p className="text-[12px] font-semibold text-ink line-clamp-2 leading-snug">
                      {l.catalog.name}
                    </p>
                    <p className="mt-1 text-[12px] font-bold text-terracotta tabular-nums">
                      {formatINR(l.price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-[20px] bg-white p-10 text-muted text-base">
          Loading listings…
        </div>
      ) : error ? (
        <div className="rounded-[20px] bg-white p-10 text-red-700">{error}</div>
      ) : listings.length === 0 ? (
        <div className="rounded-[20px] bg-white p-12 text-center shadow-sm">
          <p className="font-display text-2xl font-bold">No listings yet</p>
          <p className="mt-2 text-muted text-base">
            Add your first Catalog listing to go live on the storefront.
          </p>
          <button
            type="button"
            onClick={() => setModal("add")}
            className="mt-6 h-14 px-8 rounded-[16px] bg-terracotta text-white font-semibold"
          >
            Add listing
          </button>
        </div>
      ) : (
        <div className="rounded-[20px] bg-white shadow-[0_1px_3px_rgba(28,27,25,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-base">
              <thead>
                <tr className="text-left text-muted text-sm uppercase tracking-wide">
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-4 py-4 font-semibold">Freshness</th>
                  <th className="px-4 py-4 font-semibold">Stock</th>
                  <th className="px-4 py-4 font-semibold">Price</th>
                  <th className="px-4 py-4 font-semibold">vs market</th>
                  <th className="px-4 py-4 font-semibold">Low @</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const fresh =
                    l.freshness ??
                    hybridFreshness({
                      shelfLifeDays: l.catalog.shelfLifeDays,
                      decayCurveType: l.catalog.decayCurveType,
                      lastCheckedAt: l.lastCheckedAt ?? l.listedAt,
                      listedAt: l.listedAt,
                      lastCheckQualityScore: l.lastCheckQualityScore ?? 1,
                    });
                  const delta = l.competitorRefPrice - l.price;
                  const tip = rowAiTip(l);
                  return (
                    <tr
                      key={l.id}
                      id={`listing-row-${l.id}`}
                      className={cn(
                        "border-t border-ink/6",
                        l.stock <= l.lowStockThreshold && "bg-amber-50/40",
                        focusId === l.id && "ring-2 ring-inset ring-terracotta/40 bg-terracotta/5"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={l.catalog.imageUrl || PLACEHOLDER_IMG}
                            alt={l.catalog.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                PLACEHOLDER_IMG;
                            }}
                            className="h-16 w-16 rounded-2xl object-cover bg-cream ring-1 ring-ink/8 shadow-sm"
                          />
                          <div>
                            <p className="font-semibold">{l.catalog.name}</p>
                            <p className="text-sm text-muted mt-0.5">
                              {l.catalog.category} · {l.catalog.unit}
                              {l.catalog.decayCurveType && (
                                <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                                  · {l.catalog.decayCurveType.replace("_", " ")}
                                </span>
                              )}
                            </p>
                            {tip && (
                              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-terracotta">
                                <Sparkles className="h-3 w-3" />
                                {tip}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
                              freshnessBadgeClass(
                                ("band" in fresh ? fresh.band : fresh.label) as
                                  | "fresh"
                                  | "fading"
                                  | "discard_soon"
                                  | "expired"
                                  | "sell_soon"
                                  | "near_expiry"
                              )
                            )}
                            title="Hybrid decay × quality (OpenCV heuristics, not a trained spoilage model)"
                          >
                            {fresh.text}
                          </span>
                          <span
                            className={cn(
                              "text-[10px]",
                              freshnessConfidenceClass(fresh.confidence)
                            )}
                          >
                            {fresh.confidenceText}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-semibold tabular-nums",
                              fresh.daysLeft <= 1
                                ? "text-red-700"
                                : "text-ink/80"
                            )}
                          >
                            {fresh.daysSurviveText}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRecheckTarget(l)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-vh-blue hover:underline w-fit"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Recheck
                          </button>
                          <Link
                            to={`/vendor/freshness?listing=${l.id}`}
                            className="mt-0.5 inline-flex text-[10px] text-muted hover:text-vh-blue"
                          >
                            Score this item →
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <InlineNumber
                          value={l.stock}
                          onCommit={(stock) => patchListing(l.id, { stock })}
                          className={
                            l.stock <= l.lowStockThreshold
                              ? "text-amber-800 font-bold"
                              : ""
                          }
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-muted text-sm">₹</span>
                          <InlineNumber
                            value={l.price}
                            step={0.5}
                            onCommit={(price) => patchListing(l.id, { price })}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={cn(
                            "font-semibold",
                            delta >= 0 ? "text-emerald-700" : "text-red-600"
                          )}
                        >
                          {delta >= 0 ? "₹" : "-₹"}
                          {Math.abs(delta).toFixed(0)}{" "}
                          {delta >= 0 ? "below" : "above"}
                        </span>
                        <span className="text-muted block text-xs mt-0.5">
                          ref {formatINR(l.competitorRefPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <InlineNumber
                          value={l.lowStockThreshold}
                          onCommit={(lowStockThreshold) =>
                            patchListing(l.id, { lowStockThreshold })
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex p-2 rounded-lg text-muted hover:text-ink hover:bg-cream"
                          onClick={() => {
                            setEditing(l);
                            setModal("edit");
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex p-2 rounded-lg text-muted hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(l.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recheckTarget && (
        <FreshnessRecheckModal
          listingId={recheckTarget.id}
          productName={recheckTarget.catalog.name}
          category={recheckTarget.catalog.category}
          imageUrl={recheckTarget.catalog.imageUrl}
          initialPercent={
            recheckTarget.freshness?.percent ??
            Math.round((recheckTarget.lastCheckQualityScore ?? 1) * 100)
          }
          onClose={() => setRecheckTarget(null)}
          onSaved={(listing) => {
            const row = listing as ListingRow;
            setListings((prev) =>
              prev.map((l) => (l.id === row.id ? { ...l, ...row } : l))
            );
            showToast("Freshness rechecked");
          }}
        />
      )}

      {(modal === "add" || modal === "edit") && (
        <ListingModal
          mode={modal}
          catalog={catalog}
          initial={editing}
          onClose={() => {
            setModal(null);
            setEditing(null);
          }}
          onSaved={(listing) => {
            setListings((rows) => {
              const i = rows.findIndex((r) => r.id === listing.id);
              if (i >= 0) {
                const next = [...rows];
                next[i] = listing;
                return next;
              }
              return [listing, ...rows];
            });
            setModal(null);
            setEditing(null);
            showToast(modal === "add" ? "Listing created" : "Listing updated");
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl">
            <h3 className="font-display text-xl font-bold">Delete listing?</h3>
            <p className="mt-2 text-muted text-sm">
              This removes your price/stock for this catalog item. Past orders
              keep history.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                className="h-12 px-5 rounded-[12px] bg-cream font-semibold"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="h-12 px-5 rounded-[12px] bg-red-600 text-white font-semibold disabled:opacity-50"
                onClick={() => void removeListing(deleteId)}
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Freshness is a{" "}
        <strong className="font-semibold text-ink/70">hybrid decay curve</strong>{" "}
        × quality score (currently 1.0) — not a trained spoilage classifier.{" "}
        <Link to="/vendor/dashboard" className="text-terracotta font-semibold">
          Back to dashboard
        </Link>
      </p>
    </VendorHubShell>
  );
}

function InlineNumber({
  value,
  onCommit,
  step = 1,
  className,
}: {
  value: number;
  onCommit: (n: number) => void;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  function commit() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(value));
      return;
    }
    if (n !== value) onCommit(n);
  }

  return (
    <input
      type="number"
      step={step}
      min={0}
      value={focused ? draft : value}
      onFocus={() => {
        setFocused(true);
        setDraft(String(value));
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "w-24 h-11 rounded-xl bg-cream/80 px-3 text-base tabular-nums outline-none focus:ring-2 focus:ring-terracotta/30",
        className
      )}
    />
  );
}

function ListingModal({
  mode,
  catalog,
  initial,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  catalog: CatalogOption[];
  initial: ListingRow | null;
  onClose: () => void;
  onSaved: (l: ListingRow) => void;
}) {
  const [modePick, setModePick] = useState<"existing" | "new">("existing");
  const [catalogId, setCatalogId] = useState(initial?.catalogId ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Vegetables");
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("kg");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1546470427-227c7369a0e0?w=600&q=80"
  );
  const [shelfLifeDays, setShelfLifeDays] = useState(7);
  const [price, setPrice] = useState(initial?.price ?? 40);
  const [stock, setStock] = useState(initial?.stock ?? 20);
  const [threshold, setThreshold] = useState(initial?.lowStockThreshold ?? 5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const freshPreview =
    mode === "edit" && initial
      ? hybridFreshness({
          shelfLifeDays: initial.catalog.shelfLifeDays,
          decayCurveType: initial.catalog.decayCurveType,
          lastCheckedAt: initial.lastCheckedAt ?? initial.listedAt,
          listedAt: initial.listedAt,
          lastCheckQualityScore: initial.lastCheckQualityScore ?? 1,
        })
      : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "edit" && initial) {
        const { data } = await api.put<{ listing: ListingRow }>(
          `/vendor/listings/${initial.id}`,
          {
            price,
            stock,
            lowStockThreshold: threshold,
          }
        );
        onSaved(data.listing);
      } else {
        const body =
          modePick === "existing"
            ? {
                catalogId,
                price,
                stock,
                lowStockThreshold: threshold,
              }
            : {
                newCatalog: {
                  name: name.trim(),
                  category,
                  unit,
                  imageUrl,
                  shelfLifeDays,
                },
                price,
                stock,
                lowStockThreshold: threshold,
              };
        const { data } = await api.post<{ listing: ListingRow }>(
          "/vendor/listings",
          body
        );
        onSaved(data.listing);
      }
    } catch (error: unknown) {
      setErr(
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Save failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg max-h-[92svh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px] bg-white shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-ink/5">
          <h3 className="font-display text-xl font-bold">
            {mode === "add" ? "Add listing" : "Edit listing"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          {err && (
            <div className="rounded-xl bg-red-50 text-red-800 text-sm px-4 py-3">
              {err}
            </div>
          )}

          {mode === "add" && (
            <>
              <div className="inline-flex rounded-xl bg-cream p-1">
                <button
                  type="button"
                  onClick={() => setModePick("existing")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold",
                    modePick === "existing" && "bg-white shadow-sm"
                  )}
                >
                  Existing catalog
                </button>
                <button
                  type="button"
                  onClick={() => setModePick("new")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold",
                    modePick === "new" && "bg-white shadow-sm"
                  )}
                >
                  New catalog item
                </button>
              </div>

              {modePick === "existing" ? (
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-muted font-semibold">
                    Catalog item
                  </span>
                  <select
                    required
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value)}
                    className="mt-1.5 w-full h-14 rounded-[14px] bg-cream/80 px-4 text-base"
                  >
                    <option value="">Select…</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="space-y-3">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product name"
                    className="w-full h-14 rounded-[14px] bg-cream/80 px-4"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Category"
                      className="h-14 rounded-[14px] bg-cream/80 px-4"
                    />
                    <select
                      value={unit}
                      onChange={(e) =>
                        setUnit(e.target.value as (typeof UNITS)[number])
                      }
                      className="h-14 rounded-[14px] bg-cream/80 px-4"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Image URL"
                    className="w-full h-14 rounded-[14px] bg-cream/80 px-4"
                  />
                  <label className="block text-sm">
                    Shelf life (days)
                    <input
                      type="number"
                      min={1}
                      value={shelfLifeDays}
                      onChange={(e) => setShelfLifeDays(Number(e.target.value))}
                      className="mt-1 w-full h-14 rounded-[14px] bg-cream/80 px-4"
                    />
                  </label>
                </div>
              )}
            </>
          )}

          {mode === "edit" && initial && (
            <div className="rounded-[14px] bg-cream/70 px-4 py-3">
              <p className="font-semibold">{initial.catalog.name}</p>
              {freshPreview && (
                <span
                  className={cn(
                    "inline-flex mt-2 rounded-full px-2.5 py-1 text-xs font-semibold",
                    freshnessBadgeClass(freshPreview.label)
                  )}
                >
                  {freshPreview.text}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm col-span-1">
              Price (₹)
              <input
                type="number"
                min={0.5}
                step={0.5}
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-1 w-full h-14 rounded-[14px] bg-cream/80 px-3"
              />
            </label>
            <label className="block text-sm">
              Stock
              <input
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="mt-1 w-full h-14 rounded-[14px] bg-cream/80 px-3"
              />
            </label>
            <label className="block text-sm">
              Low @
              <input
                type="number"
                min={0}
                required
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-1 w-full h-14 rounded-[14px] bg-cream/80 px-3"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy || (mode === "add" && modePick === "existing" && !catalogId)}
            className="w-full h-14 rounded-[16px] bg-terracotta text-white font-semibold disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "add" ? "Create listing" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
