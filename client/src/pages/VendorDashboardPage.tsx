import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import type {
  ActivityEvent,
  AiRecommendation,
  Competitor,
  CompetitorProduct,
  DateRange,
  HeatWeight,
  LiveProduct,
  SalesDay,
  TopProduct,
} from "@/data/vendorDashboardMock";
import { DashboardHeader } from "@/components/vendor/DashboardHeader";
import { KpiRow } from "@/components/vendor/KpiRow";
import { CompetitorHeatmap } from "@/components/vendor/CompetitorHeatmap";
import {
  MarketPulseFeed,
  type MarketPulseEvent,
} from "@/components/vendor/MarketPulseFeed";
import { LiveProductTable } from "@/components/vendor/LiveProductTable";
import { CompetitorProductsTable } from "@/components/vendor/CompetitorProductsTable";
import { LiveViewersPanel } from "@/components/vendor/LiveViewersPanel";
import { SalesTrendSection } from "@/components/vendor/SalesTrendSection";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";
import { Skeleton } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import {
  getSocket,
  joinVendorRoom,
  type FreshnessUpdatedEvent,
  type StockUpdatedEvent,
} from "@/lib/socket";

type DashboardPayload = {
  storeName: string;
  vendorId: string;
  verified: boolean;
  vendorLat: number;
  vendorLng: number;
  radiusKm: number;
  kpis: {
    revenue: number;
    revenueChangePct: number;
    ordersCompleted: number;
    activeProductViews: number;
    lowStockAlerts: number;
  };
  competitors: Competitor[];
  insight: { competitorCount: number; priceVsMarketPct: number };
  products: LiveProduct[];
  competitorProducts: CompetitorProduct[];
  activity: ActivityEvent[];
  marketPulse: MarketPulseEvent[];
  salesTrend: SalesDay[];
  topProducts: TopProduct[];
  quickInsights: {
    conversionToday: number;
    avgBasket: number;
    mostPopular: string;
    returningPct: number;
  };
  aiRecommendations: AiRecommendation[];
};

/** Mission-control dashboard — live API + Socket.IO demo simulation */
export function VendorDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [range, setRange] = useState<DateRange>("7d");
  const [heatWeight, setHeatWeight] = useState<HeatWeight>("density");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [marketPulse, setMarketPulse] = useState<MarketPulseEvent[]>([]);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const [kpiPulse, setKpiPulse] = useState<Set<string>>(new Set());

  const load = useCallback(async (r: DateRange) => {
    setError(null);
    setNeedsAuth(false);
    try {
      const { data: res } = await api.get<{ dashboard: DashboardPayload }>(
        "/vendor/dashboard",
        { params: { range: r } }
      );
      const d = res.dashboard;
      if (!d) {
        setError("Complete onboarding first");
        setData(null);
        return;
      }
      setData(d);
      setProducts(d.products);
      setActivity(d.activity);
      setMarketPulse(d.marketPulse);
      if (d.vendorId) joinVendorRoom(d.vendorId);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not load dashboard";

      if (status === 404 && /onboarding/i.test(msg)) {
        try {
          await api.post("/vendor/onboard", {
            storeName: "My Market",
            category: "Grocery",
            lat: 13.06,
            lng: 80.25,
          });
          const { data: res } = await api.get<{ dashboard: DashboardPayload }>(
            "/vendor/dashboard",
            { params: { range: r } }
          );
          if (res.dashboard) {
            setData(res.dashboard);
            setProducts(res.dashboard.products);
            setActivity(res.dashboard.activity);
            setMarketPulse(res.dashboard.marketPulse);
            if (res.dashboard.vendorId) joinVendorRoom(res.dashboard.vendorId);
            return;
          }
        } catch {
          setError("Complete onboarding first");
          setData(null);
          return;
        }
      }

      if (status === 401 || /authorization|unauthorized|session expired/i.test(msg)) {
        setNeedsAuth(true);
        setError("Session expired — sign in again");
        localStorage.removeItem("ngc_token");
      } else if (/onboarding/i.test(msg)) {
        setError(msg);
      } else {
        setError(msg);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token && !localStorage.getItem("ngc_token")) {
      setLoading(false);
      setNeedsAuth(true);
      setError("Sign in to open the vendor hub");
      return;
    }
    setLoading(true);
    void load(range);
  }, [range, load, token]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onStock = (payload: StockUpdatedEvent) => {
      if (!data?.vendorId || payload.vendorId !== data.vendorId) return;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === payload.listingId
            ? { ...p, stock: payload.stock, price: payload.price }
            : p
        )
      );
      setPulsingIds(new Set([payload.listingId]));
      window.setTimeout(() => setPulsingIds(new Set()), 900);
      setMarketPulse((prev) =>
        [
          {
            id: `stock-${payload.listingId}-${Date.now()}`,
            kind: "stock" as const,
            title: "Stock updated (live)",
            detail: `Now ${payload.stock} units · ₹${payload.price}`,
            at: "just now",
            severity: (payload.stock < 4 ? "critical" : "info") as
              | "info"
              | "warn"
              | "critical",
          },
          ...prev,
        ].slice(0, 6)
      );
      setKpiPulse(new Set(["views"]));
      window.setTimeout(() => setKpiPulse(new Set()), 800);
    };

    const onFresh = (ev: FreshnessUpdatedEvent) => {
      if (!data?.vendorId || ev.vendorId !== data.vendorId) return;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === ev.listingId
            ? {
                ...p,
                freshnessPercent: ev.freshnessPercent,
                freshnessBand: ev.freshnessBand,
                freshnessText: ev.freshnessText,
                daysLeft: ev.daysLeft,
                daysSurviveText: ev.daysSurviveText,
              }
            : p
        )
      );
      setPulsingIds(new Set([ev.listingId]));
      window.setTimeout(() => setPulsingIds(new Set()), 900);
      setMarketPulse((prev) =>
        [
          {
            id: `fresh-${ev.listingId}-${Date.now()}`,
            kind: "stock" as const,
            title: "Freshness updated",
            detail: `${ev.freshnessText}${
              ev.daysSurviveText ? ` · ${ev.daysSurviveText}` : ""
            }`,
            at: "just now",
            severity: (ev.freshnessPercent < 35
              ? "critical"
              : ev.freshnessPercent < 70
                ? "warn"
                : "info") as "info" | "warn" | "critical",
          },
          ...prev,
        ].slice(0, 6)
      );
      setActivity((prev) =>
        [
          {
            id: `act-fresh-${Date.now()}`,
            type: "inventory" as const,
            message: `Freshness scored · ${ev.freshnessText}`,
            at: "just now",
          },
          ...prev,
        ].slice(0, 20)
      );
    };

    const onNewOrder = (payload: {
      vendorOrderId: string;
      customerName: string;
      subtotal: number;
      status: string;
      lines?: Array<{ name: string; qty: number }>;
    }) => {
      const itemHint = payload.lines?.[0]
        ? `${payload.lines[0].qty}× ${payload.lines[0].name.split("(")[0].trim()}`
        : "new items";
      setMarketPulse((prev) =>
        [
          {
            id: `ord-${payload.vendorOrderId}`,
            kind: "density" as const,
            title: "New shop order",
            detail: `${payload.customerName} · ₹${payload.subtotal} · ${itemHint}`,
            at: "just now",
            severity: "warn" as const,
          },
          ...prev,
        ].slice(0, 6)
      );
      setActivity((prev) =>
        [
          {
            id: `act-ord-${payload.vendorOrderId}`,
            type: "order" as const,
            message: `Order from ${payload.customerName} · ₹${payload.subtotal}`,
            at: "just now",
          },
          ...prev,
        ].slice(0, 20)
      );
    };

    const onPulse = (evt: MarketPulseEvent) => {
      setMarketPulse((prev) => {
        const aged = prev.map((e, i) =>
          i === 0 && e.at === "just now" ? { ...e, at: "45s ago" } : e
        );
        return [evt, ...aged].slice(0, 6);
      });
    };

    const onActivity = (evt: ActivityEvent) => {
      setActivity((prev) => {
        const aged = prev.map((e, i) =>
          i === 0 && e.at === "just now" ? { ...e, at: "1m ago" } : e
        );
        return [evt, ...aged].slice(0, 20);
      });
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          liveViewers: Math.max(
            0,
            p.liveViewers + (Math.random() > 0.5 ? 1 : 0)
          ),
        }))
      );
    };

    socket.on("stock-updated", onStock);
    socket.on("freshness-updated", onFresh);
    socket.on("new-order", onNewOrder);
    socket.on("market-pulse", onPulse);
    socket.on("vendor-activity", onActivity);
    return () => {
      socket.off("stock-updated", onStock);
      socket.off("freshness-updated", onFresh);
      socket.off("new-order", onNewOrder);
      socket.off("market-pulse", onPulse);
      socket.off("vendor-activity", onActivity);
    };
  }, [data?.vendorId]);

  const onStockChange = useCallback(async (id: string, stock: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock } : p)));
    setPulsingIds(new Set([id]));
    window.setTimeout(() => setPulsingIds(new Set()), 900);
    try {
      await api.put(`/vendor/listings/${id}`, { stock });
    } catch {
      /* keep optimistic UI in demo */
    }
  }, []);

  const onPriceChange = useCallback(async (id: string, price: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
    try {
      await api.put(`/vendor/listings/${id}`, { price });
    } catch {
      /* keep optimistic UI in demo */
    }
  }, []);

  const onQuickAdd = useCallback(() => {
    window.location.href = "/vendor/listings";
  }, []);

  if (loading) {
    return (
      <VendorHubShell title="Dashboard">
        <div className="space-y-8">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-12 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="col-span-12 sm:col-span-6 xl:col-span-3 h-[150px]"
              />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </VendorHubShell>
    );
  }

  if (error || !data) {
    const needsOnboard = /onboarding/i.test(error ?? "");
    const sessionDead =
      needsAuth ||
      /session expired|sign in|authorization|unauthorized/i.test(error ?? "");
    return (
      <VendorHubShell title="Dashboard">
        <div className="text-center max-w-lg mx-auto rounded-[20px] bg-white p-12 shadow-[0_8px_24px_rgba(28,27,25,0.06)]">
          <h2 className="font-display text-[28px] font-bold">
            {needsOnboard
              ? "Complete onboarding first"
              : sessionDead
                ? "Sign in to continue"
                : (error ?? "Dashboard unavailable")}
          </h2>
          <p className="mt-3 text-base text-muted leading-relaxed">
            {needsOnboard
              ? "Finish store setup, then refresh. Demo mode auto-seeds inventory."
              : sessionDead
                ? "Your session may be from before a database reset. Sign in again as a vendor — demo mode accepts any email/password."
                : "Couldn’t load the hub. Check that the API is running on :4000, then retry."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {needsOnboard && (
              <Link
                to="/vendor/onboarding"
                className="inline-flex h-14 items-center rounded-[16px] bg-vh-blue text-white text-base font-semibold px-8"
              >
                Set up store
              </Link>
            )}
            {(sessionDead || !needsOnboard) && (
              <Link
                to="/login?as=vendor"
                onClick={() => {
                  localStorage.removeItem("ngc_token");
                }}
                className="inline-flex h-14 items-center rounded-[16px] bg-vh-blue text-white text-base font-semibold px-8"
              >
                Sign in as vendor
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void load(range);
              }}
              className="h-14 rounded-[16px] border border-ink/12 text-base font-semibold px-8"
            >
              Retry
            </button>
          </div>
        </div>
      </VendorHubShell>
    );
  }

  if (products.length === 0) {
    return (
      <VendorHubShell title="Dashboard">
        <div className="text-center max-w-lg mx-auto rounded-[20px] bg-white p-12 shadow-[0_8px_24px_rgba(28,27,25,0.06)]">
          <PackagePlus className="mx-auto h-14 w-14 text-terracotta mb-5" />
          <h2 className="font-display text-[28px] font-bold">No products yet</h2>
          <p className="mt-3 text-base text-muted leading-relaxed">
            Add your first listing to unlock the mission-control dashboard.
          </p>
          <button
            type="button"
            onClick={onQuickAdd}
            className="mt-8 h-14 rounded-[16px] bg-terracotta text-white text-base font-semibold px-8"
          >
            Add a product
          </button>
        </div>
      </VendorHubShell>
    );
  }

  const kpis = {
    ...data.kpis,
    activeProductViews: products.reduce((s, p) => s + p.liveViewers, 0),
    lowStockAlerts: products.filter((p) => p.stock < 3).length,
  };

  return (
    <VendorHubShell
      title="Dashboard"
      verified={user?.vendor?.verified ?? data.verified ?? null}
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-10">
        <div className="col-span-12 flex items-center justify-between gap-3 flex-wrap">
          <DashboardHeader
            storeName={data.storeName}
            range={range}
            onRangeChange={setRange}
            onQuickAdd={onQuickAdd}
          />
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live demo feed
          </span>
        </div>

        <div className="col-span-12 rounded-2xl border border-vh-border bg-vh-blue-soft/40 px-4 py-3 text-[13px] text-vh-text">
          Shop ↔ hub is live: stock, freshness scores, and new customer orders
          stream into Market Pulse and this product table without refresh.
        </div>

        <div className="col-span-12">
          <KpiRow kpis={kpis} pulseKeys={kpiPulse} />
        </div>

        <div className="col-span-12 xl:col-span-8 min-w-0">
          <CompetitorHeatmap
            vendorLat={data.vendorLat}
            vendorLng={data.vendorLng}
            radiusKm={data.radiusKm}
            competitors={data.competitors}
            insight={data.insight}
            weight={heatWeight}
            onWeightChange={setHeatWeight}
          />
        </div>
        <div className="col-span-12 xl:col-span-4 min-w-0">
          <MarketPulseFeed events={marketPulse} />
        </div>

        <div className="col-span-12 xl:col-span-8 min-w-0">
          <div className="w-full min-h-[720px]">
            <LiveProductTable
              products={products}
              pulsingIds={pulsingIds}
              onStockChange={onStockChange}
              onPriceChange={onPriceChange}
              onAddProduct={onQuickAdd}
            />
          </div>
        </div>
        <div className="col-span-12 xl:col-span-4 min-w-0 flex xl:justify-end">
          <div className="w-full min-h-[720px] flex">
            <LiveViewersPanel
              totalViewers={kpis.activeProductViews}
              products={products}
              activity={activity}
              quickInsights={data.quickInsights}
              aiRecommendations={data.aiRecommendations}
            />
          </div>
        </div>

        <div className="col-span-12">
          <CompetitorProductsTable products={data.competitorProducts} />
        </div>

        <div className="col-span-12">
          <SalesTrendSection
            salesTrend={data.salesTrend}
            topProducts={data.topProducts}
          />
        </div>
      </div>
    </VendorHubShell>
  );
}
