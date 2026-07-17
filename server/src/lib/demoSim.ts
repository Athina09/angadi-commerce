import {
  PaymentMethod,
  PaymentStatus,
  VendorOrderStatus,
} from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  emitLowStockAlert,
  emitMarketPulse,
  emitOrderPipeline,
  emitStockUpdated,
  emitVendorActivity,
} from "./io.js";
import { CRITICAL_STOCK_LT, notifyIfCriticalStock } from "./notify.js";
import { computeFreshness, type DecayCurveType } from "./freshness.js";

export type SimPulseKind = "competitor" | "stock" | "price" | "density";

export type SimPulseEvent = {
  id: string;
  kind: SimPulseKind;
  title: string;
  detail: string;
  at: string;
  severity?: "info" | "warn" | "critical";
};

export type SimActivity = {
  id: string;
  type: "viewing" | "cart" | "order" | "wishlist" | "inventory";
  message: string;
  at: string;
};

export type SimAlert = {
  id: string;
  listingId: string;
  catalogName: string;
  stock: number;
  lowStockThreshold: number;
  at: string;
  severity: "warn" | "critical";
};

type VendorSimState = {
  viewers: Record<string, number>;
  activity: SimActivity[];
  pulse: SimPulseEvent[];
  alerts: SimAlert[];
};

const state = new Map<string, VendorSimState>();
let tickTimer: ReturnType<typeof setInterval> | null = null;
let seq = 0;

function ensureState(vendorId: string): VendorSimState {
  let s = state.get(vendorId);
  if (!s) {
    s = { viewers: {}, activity: [], pulse: [], alerts: [] };
    state.set(vendorId, s);
  }
  return s;
}

export function getVendorSim(vendorId: string): VendorSimState {
  return ensureState(vendorId);
}

export function pushAlert(vendorId: string, alert: Omit<SimAlert, "id" | "at">) {
  const s = ensureState(vendorId);
  const row: SimAlert = {
    ...alert,
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
  };
  s.alerts = [row, ...s.alerts].slice(0, 40);
  return row;
}

/** Create a storefront for demo vendors who skipped onboarding */
export async function ensureDemoVendor(userId: string, nameHint?: string) {
  const existing = await prisma.vendor.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  // Promote to vendor role in demo if needed
  if (user.role !== "vendor") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "vendor" },
    });
  }

  const storeName =
    nameHint ||
    `${user.name.split(" ")[0] || "Demo"}'s Market`;

  return prisma.vendor.create({
    data: {
      userId,
      storeName,
      lat: user.lat ?? 13.06,
      lng: user.lng ?? 80.25,
      verified: false,
    },
  });
}

/** Seed a few demo listings from catalog when a vendor has none */
export async function ensureDemoListings(vendorId: string) {
  const count = await prisma.listing.count({ where: { vendorId } });
  if (count > 0) return { created: 0 };

  const catalog = await prisma.catalog.findMany({
    take: 8,
    orderBy: { name: "asc" },
  });
  if (catalog.length === 0) return { created: 0 };

  let created = 0;
  for (const c of catalog) {
    const base = 40 + Math.round(Math.random() * 120);
    try {
      await prisma.listing.create({
        data: {
          vendorId,
          catalogId: c.id,
          price: base,
          competitorRefPrice: Math.round(base * 1.08 * 100) / 100,
          stock: 8 + Math.floor(Math.random() * 40),
          lowStockThreshold: 5,
        },
      });
      created += 1;
    } catch {
      /* unique conflict — skip */
    }
  }
  return { created };
}

/**
 * Seed ~30 days of completed orders for demo vendors with no sales history.
 * Makes income CSV / dashboard revenue non-empty for any-login demos.
 */
export async function ensureDemoOrders(vendorId: string) {
  const existing = await prisma.orderItem.count({
    where: { listing: { vendorId } },
  });
  if (existing > 0) return { created: 0 };

  const listings = await prisma.listing.findMany({
    where: { vendorId },
    take: 12,
  });
  if (listings.length === 0) return { created: 0 };

  // Prefer a real customer; otherwise create a silent demo buyer
  let customer = await prisma.user.findFirst({
    where: { role: "customer" },
  });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: "Demo Buyer",
        email: `demo-buyer-${vendorId.slice(-6)}@angadi.local`,
        passwordHash: "demo",
        role: "customer",
        lat: 13.06,
        lng: 80.25,
      },
    });
  }

  let created = 0;
  for (let d = 28; d >= 1; d--) {
    if (d % 5 === 0) continue;
    const picks = listings
      .slice((d * 2) % Math.max(1, listings.length - 2))
      .slice(0, 2 + (d % 2));
    if (picks.length === 0) continue;

    const byVendor = new Map<string, typeof picks>();
    for (const l of picks) {
      const cur = byVendor.get(l.vendorId) ?? [];
      cur.push(l);
      byVendor.set(l.vendorId, cur);
    }

    const vendorCreates = [...byVendor.entries()].map(([vendorId, group]) => {
      const items = group.map((l) => ({
        listingId: l.id,
        qty: 1 + (d % 3),
        priceAtPurchase: l.price,
      }));
      const subtotal = items.reduce(
        (s, it) => s + it.qty * it.priceAtPurchase,
        0
      );
      return {
        vendorId,
        subtotal: Math.round(subtotal * 100) / 100,
        status: VendorOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.COD_COLLECTED,
        items: { create: items },
      };
    });

    const totalAmount = vendorCreates.reduce((s, v) => s + v.subtotal, 0);

    await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paymentMethod: PaymentMethod.COD,
        createdAt: new Date(Date.now() - d * 864e5 - (d % 7) * 36e5),
        vendorOrders: { create: vendorCreates },
      },
    });
    created += 1;
  }

  return { created };
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function buildDashboardPayload(
  vendorId: string,
  range: "today" | "7d" | "30d" = "7d"
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return null;

  await ensureDemoListings(vendorId);
  await ensureDemoOrders(vendorId);

  const listings = await prisma.listing.findMany({
    where: { vendorId },
    include: {
      catalog: {
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
          imageUrl: true,
          shelfLifeDays: true,
          decayCurveType: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const sim = ensureState(vendorId);
  const factor = range === "today" ? 0.18 : range === "7d" ? 1 : 3.4;

  // Seed viewers if empty
  for (const l of listings) {
    if (sim.viewers[l.id] == null) {
      sim.viewers[l.id] = 1 + Math.floor(Math.random() * 6);
    }
  }

  const daysBack = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      listing: { vendorId },
      vendorOrder: { order: { createdAt: { gte: since } } },
    },
    include: {
      vendorOrder: {
        include: {
          order: {
            select: { id: true, createdAt: true, totalAmount: true },
          },
        },
      },
      listing: { select: { id: true, catalog: { select: { name: true } } } },
    },
  });

  const orderIds = new Set(orderItems.map((oi) => oi.vendorOrder.order.id));
  const revenueReal = orderItems.reduce(
    (s, oi) => s + oi.qty * oi.priceAtPurchase,
    0
  );
  const soldByListing = new Map<string, { qty: number; rev: number }>();
  for (const oi of orderItems) {
    const cur = soldByListing.get(oi.listingId) ?? { qty: 0, rev: 0 };
    cur.qty += oi.qty;
    cur.rev += oi.qty * oi.priceAtPurchase;
    soldByListing.set(oi.listingId, cur);
  }

  // If seed orders are sparse, blend simulated sales so demo always looks alive
  const products = listings.map((l, i) => {
    const real = soldByListing.get(l.id) ?? { qty: 0, rev: 0 };
    const simSold = Math.max(
      real.qty,
      Math.round((12 + (i % 5) * 4 + (l.stock % 7)) * factor)
    );
    const simRev = Math.max(
      real.rev,
      Math.round(simSold * l.price * (0.85 + (i % 3) * 0.05))
    );
    const viewers = sim.viewers[l.id] ?? 1;
    const conversionPct = Math.min(
      38,
      Math.round((simSold / Math.max(viewers * 8, 1)) * 10 + 10 + (i % 4) * 2)
    );
    const fresh = computeFreshness({
      shelfLifeDays: l.catalog.shelfLifeDays,
      decayCurveType: l.catalog.decayCurveType as DecayCurveType,
      lastCheckedAt: l.lastCheckedAt,
      lastCheckQualityScore: l.lastCheckQualityScore,
    });
    return {
      id: l.id,
      catalogId: l.catalogId,
      name: l.catalog.name,
      category: l.catalog.category,
      imageUrl: l.catalog.imageUrl,
      stock: l.stock,
      price: l.price,
      competitorRefPrice: l.competitorRefPrice,
      lowStockThreshold: l.lowStockThreshold,
      unitsSold: simSold,
      revenue: simRev,
      revenueChangePct: Math.round((4 + (i % 6) * 1.7) * 10) / 10,
      liveViewers: viewers,
      viewsChangePct: Math.round((-3 + (i % 8)) * 10) / 10,
      conversionPct,
      conversionTrend: Array.from({ length: 7 }, (_, d) =>
        Math.max(4, conversionPct + Math.round(Math.sin(d + i) * 4))
      ),
      freshnessPercent: fresh.percent,
      freshnessBand: fresh.band,
      freshnessText: fresh.text,
      daysLeft: fresh.daysLeft,
      daysSurviveText: fresh.daysSurviveText,
    };
  });

  const nearby = await prisma.vendor.findMany({
    where: { id: { not: vendorId } },
    include: {
      listings: {
        include: { catalog: { select: { name: true, category: true, imageUrl: true } } },
        take: 12,
      },
    },
  });

  const competitors = nearby
    .map((v) => {
      const distanceKm =
        Math.round(haversineKm(vendor.lat, vendor.lng, v.lat, v.lng) * 10) / 10;
      if (distanceKm > 8) return null;
      const avgPrice =
        v.listings.length > 0
          ? v.listings.reduce((s, l) => s + l.price, 0) / v.listings.length
          : 100;
      const myAvg =
        listings.length > 0
          ? listings.reduce((s, l) => s + l.price, 0) / listings.length
          : avgPrice;
      const cats = Array.from(new Set(v.listings.map((l) => l.catalog.category)));
      return {
        id: v.id,
        storeName: v.storeName,
        lat: v.lat,
        lng: v.lng,
        categories: cats.length ? cats : ["General"],
        categoryOverlapPct: 55 + Math.round(Math.random() * 30),
        avgPrice: Math.round(avgPrice),
        distanceKm: Math.max(0.3, distanceKm),
        orderVolume: 40 + Math.round(Math.random() * 120),
        priceDeltaPct: Math.round(((myAvg - avgPrice) / avgPrice) * 100),
      };
    })
    .filter(Boolean)
    .slice(0, 8) as Array<{
    id: string;
    storeName: string;
    lat: number;
    lng: number;
    categories: string[];
    categoryOverlapPct: number;
    avgPrice: number;
    distanceKm: number;
    orderVolume: number;
    priceDeltaPct: number;
  }>;

  // Fallback fake competitors near vendor if seed cluster is empty
  if (competitors.length === 0) {
    competitors.push(
      {
        id: "sim-c1",
        storeName: "Corner Fresh Mart",
        lat: vendor.lat + 0.008,
        lng: vendor.lng + 0.006,
        categories: ["Produce", "Dairy"],
        categoryOverlapPct: 72,
        avgPrice: 95,
        distanceKm: 0.9,
        orderVolume: 110,
        priceDeltaPct: 5,
      },
      {
        id: "sim-c2",
        storeName: "Daily Basket",
        lat: vendor.lat - 0.006,
        lng: vendor.lng + 0.004,
        categories: ["Grocery"],
        categoryOverlapPct: 64,
        avgPrice: 110,
        distanceKm: 0.7,
        orderVolume: 88,
        priceDeltaPct: -3,
      }
    );
  }

  const myCatalogIds = new Set(listings.map((l) => l.catalogId));
  const priceByCatalog = new Map(listings.map((l) => [l.catalogId, l.price]));
  const competitorProducts = nearby
    .flatMap((v) =>
      v.listings
        .filter((l) => myCatalogIds.has(l.catalogId) || Math.random() > 0.4)
        .slice(0, 3)
        .map((l) => {
          const yourPrice = priceByCatalog.get(l.catalogId) ?? null;
          const distanceKm =
            Math.round(haversineKm(vendor.lat, vendor.lng, v.lat, v.lng) * 10) /
            10;
          const stockLabel =
            l.stock <= 0
              ? ("Out of stock" as const)
              : l.stock <= l.lowStockThreshold
                ? ("Low stock" as const)
                : ("In stock" as const);
          return {
            id: l.id,
            name: l.catalog.name,
            category: l.catalog.category,
            imageUrl: l.catalog.imageUrl,
            sellerName: v.storeName,
            price: l.price,
            yourPrice,
            stockLabel,
            distanceKm: Math.max(0.2, distanceKm),
            priceDeltaPct: yourPrice
              ? Math.round(((yourPrice - l.price) / l.price) * 100)
              : 0,
          };
        })
    )
    .slice(0, 12);

  const lowStockAlerts = listings.filter(
    (l) => l.stock <= l.lowStockThreshold
  ).length;

  const kpiRevenue =
    revenueReal > 0
      ? Math.round(revenueReal)
      : Math.round(products.reduce((s, p) => s + p.revenue, 0));

  const salesTrend = Array.from(
    { length: range === "today" ? 1 : range === "7d" ? 7 : 14 },
    (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (range === "today" ? 0 : i));
      const label =
        range === "today"
          ? "Today"
          : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
      const dayRev = Math.round(
        (kpiRevenue / (range === "today" ? 1 : range === "7d" ? 7 : 14)) *
          (0.75 + Math.random() * 0.5)
      );
      return {
        date: label,
        revenue: dayRev,
        orders: Math.max(2, Math.round(dayRev / 650)),
      };
    }
  ).reverse();

  const topProducts = [...products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      revenue: p.revenue,
      sparkline: p.conversionTrend.map((c) => Math.round(c * p.price * 0.4)),
    }));

  if (sim.pulse.length === 0) {
    sim.pulse = [
      {
        id: "p0",
        kind: "density",
        title: "Demand warming near you",
        detail: "Shopper density up in your 2 km radius",
        at: "just now",
        severity: "info",
      },
      {
        id: "p1",
        kind: "competitor",
        title: competitors[0]?.storeName ?? "Nearby store",
        detail: "Adjusted overlapping SKU prices",
        at: "2m ago",
        severity: "info",
      },
    ];
  }

  if (sim.activity.length === 0) {
    const sample = products[0];
    if (sample) {
      sim.activity = [
        {
          id: "a0",
          type: "viewing",
          message: `3 shoppers viewing ${sample.name}`,
          at: "just now",
        },
        {
          id: "a1",
          type: "cart",
          message: `${sample.name} added to a cart nearby`,
          at: "1m ago",
        },
      ];
    }
  }

  const avgPriceDelta =
    competitors.length > 0
      ? Math.round(
          competitors.reduce((s, c) => s + c.priceDeltaPct, 0) /
            competitors.length
        )
      : 0;

  return {
    demo: true,
    storeName: vendor.storeName,
    vendorId: vendor.id,
    verified: vendor.verified,
    vendorLat: vendor.lat,
    vendorLng: vendor.lng,
    radiusKm: 3,
    kpis: {
      revenue: kpiRevenue,
      revenueChangePct: 8.4,
      ordersCompleted: Math.max(orderIds.size, Math.round(kpiRevenue / 720)),
      activeProductViews: products.reduce((s, p) => s + p.liveViewers, 0),
      lowStockAlerts,
    },
    competitors,
    insight: {
      competitorCount: competitors.length,
      priceVsMarketPct: avgPriceDelta,
    },
    products,
    competitorProducts,
    activity: sim.activity,
    marketPulse: sim.pulse,
    salesTrend,
    topProducts,
    quickInsights: {
      conversionToday:
        products.length > 0
          ? Math.round(
              products.reduce((s, p) => s + p.conversionPct, 0) / products.length
            )
          : 0,
      avgBasket: Math.round(kpiRevenue / Math.max(orderIds.size, 8)),
      mostPopular: topProducts[0]?.name ?? "—",
      returningPct: 34 + (listings.length % 10),
    },
    aiRecommendations: buildAiRecs(products, competitors),
  };
}

function buildAiRecs(
  products: Array<{ name: string; stock: number; price: number; lowStockThreshold?: number }>,
  competitors: Array<{ storeName: string; priceDeltaPct: number }>
) {
  const low = products.find((p) => p.stock <= (p.lowStockThreshold ?? 5));
  const pricey = competitors.find((c) => c.priceDeltaPct < -4);
  const recs = [];
  if (low) {
    recs.push({
      id: "ai-restock",
      icon: "restock" as const,
      text: `Restock ${low.name} — only ${low.stock} left before threshold.`,
    });
  }
  if (pricey) {
    recs.push({
      id: "ai-price",
      icon: "price" as const,
      text: `${pricey.storeName} is undercutting you — test a 3–5% promo on overlapping SKUs.`,
    });
  }
  if (products[0]) {
    recs.push({
      id: "ai-bundle",
      icon: "bundle" as const,
      text: `Bundle ${products[0].name} with a complementary item to lift basket size.`,
    });
  }
  recs.push({
    id: "ai-timing",
    icon: "timing" as const,
    text: "Evening rush (6–8 pm) shows peak conversion — schedule flash deals then.",
  });
  return recs.slice(0, 4);
}

async function getDemoCustomerId() {
  let customer = await prisma.user.findFirst({ where: { role: "customer" } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: "Demo Buyer",
        email: `pipeline-buyer@angadi.local`,
        passwordHash: "demo",
        role: "customer",
        lat: 13.06,
        lng: 80.25,
      },
    });
  }
  return customer.id;
}

const BUYER_NAMES = [
  "Aisha Rahman",
  "Karthik R.",
  "Priya M.",
  "Omar H.",
  "Lakshmi D.",
  "Meera S.",
];

function pipelineSocketStatus(
  status: VendorOrderStatus
): "pending" | "processing" | "completed" {
  if (status === VendorOrderStatus.PROCESSING) return "processing";
  if (status === VendorOrderStatus.COMPLETED) return "completed";
  return "pending";
}

function toPipelineSocket(p: PipelineOrderPayload) {
  return {
    id: p.vendorOrderId,
    status: pipelineSocketStatus(p.status),
    total: p.total,
    createdAt: p.createdAt,
    customerName: p.customerName,
    customerEmail: p.customerEmail,
    lines: p.lines,
  };
}

type PipelineOrderPayload = {
  id: string;
  vendorOrderId: string;
  orderId: string;
  status: VendorOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  subtotal: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  lines: Array<{
    listingId: string;
    name: string;
    imageUrl: string;
    qty: number;
    priceAtPurchase: number;
  }>;
};

async function serializeVendorOrder(
  vendorOrderId: string,
  vendorId: string
): Promise<PipelineOrderPayload | null> {
  const vo = await prisma.vendorOrder.findFirst({
    where: { id: vendorOrderId, vendorId },
    include: {
      order: {
        select: {
          id: true,
          totalAmount: true,
          paymentMethod: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
        },
      },
      items: {
        include: {
          listing: {
            select: {
              id: true,
              catalog: { select: { name: true, imageUrl: true } },
            },
          },
        },
      },
    },
  });
  if (!vo) return null;
  const lines = vo.items.map((oi) => ({
    listingId: oi.listing.id,
    name: oi.listing.catalog.name,
    imageUrl: oi.listing.catalog.imageUrl,
    qty: oi.qty,
    priceAtPurchase: oi.priceAtPurchase,
  }));
  const subtotal = lines.reduce((s, l) => s + l.qty * l.priceAtPurchase, 0);
  return {
    id: vo.id,
    vendorOrderId: vo.id,
    orderId: vo.order.id,
    status: vo.status,
    paymentStatus: vo.paymentStatus,
    paymentMethod: vo.order.paymentMethod,
    total: Math.round(subtotal * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    createdAt: vo.order.createdAt.toISOString(),
    customerName: vo.order.customer.name,
    customerEmail: vo.order.customer.email,
    lines,
  };
}

/** Stock was decremented at checkout/create — completed is a status change only */
async function fulfillOrderStock(_vendorOrderId: string, _vendorId: string) {
  /* no-op — stock deducted at order placement */
}

/**
 * Live pipeline: add pending orders consecutively AND advance several
 * pending→processing / processing→completed in the same tick.
 */
export async function tickOrderPipeline(vendorId: string) {
  await ensureDemoListings(vendorId);
  const listings = await prisma.listing.findMany({
    where: { vendorId, stock: { gt: 0 } },
    include: { catalog: { select: { name: true, imageUrl: true } } },
    take: 12,
  });
  if (listings.length === 0) return;

  const customerId = await getDemoCustomerId();
  const changed: PipelineOrderPayload[] = [];

  const vendorOrders = await prisma.vendorOrder.findMany({
    where: { vendorId },
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  const pendingIds = vendorOrders
    .filter((x) => x.status === VendorOrderStatus.APPROVED)
    .map((x) => x.id);
  const processingIds = vendorOrders
    .filter((x) => x.status === VendorOrderStatus.PROCESSING)
    .map((x) => x.id);
  const approvalIds = vendorOrders
    .filter((x) => x.status === VendorOrderStatus.PENDING_APPROVAL)
    .map((x) => x.id);
  const totalOrders = vendorOrders.length;

  const createPhase = seq % 2 === 0;

  if (createPhase && approvalIds.length < 4 && totalOrders < 48) {
    const picks = [...listings]
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 2));
    const items = picks.map((l) => ({
      listingId: l.id,
      qty: 1 + Math.floor(Math.random() * 2),
      priceAtPurchase: l.price,
    }));
    const subtotal = items.reduce(
      (s, it) => s + it.qty * it.priceAtPurchase,
      0
    );

    for (const it of items) {
      await prisma.listing.updateMany({
        where: { id: it.listingId, stock: { gte: it.qty } },
        data: { stock: { decrement: it.qty } },
      });
    }

    const created = await prisma.order.create({
      data: {
        customerId,
        totalAmount: Math.round(subtotal * 100) / 100,
        paymentMethod: PaymentMethod.COD,
        vendorOrders: {
          create: [
            {
              vendorId,
              subtotal: Math.round(subtotal * 100) / 100,
              status: VendorOrderStatus.APPROVED,
              paymentStatus: PaymentStatus.COD_PENDING,
              items: { create: items },
            },
          ],
        },
      },
      include: { vendorOrders: true },
    });

    const vo = created.vendorOrders[0];
    if (vo) {
      const payload = await serializeVendorOrder(vo.id, vendorId);
      if (payload) {
        const buyerIdx = seq % BUYER_NAMES.length;
        payload.customerName = BUYER_NAMES[buyerIdx]!;
        changed.push(payload);
      }
    }
  } else {
    const toProcess = pendingIds.slice(0, 2);
    const toComplete = processingIds.slice(0, 2);

    await Promise.all(
      toProcess.map((id) =>
        prisma.vendorOrder.update({
          where: { id },
          data: { status: VendorOrderStatus.PROCESSING },
        })
      )
    );
    for (const id of toProcess) {
      const payload = await serializeVendorOrder(id, vendorId);
      if (payload) changed.push(payload);
    }

    await Promise.all(
      toComplete.map((id) =>
        prisma.vendorOrder.update({
          where: { id },
          data: {
            status: VendorOrderStatus.COMPLETED,
            paymentStatus: PaymentStatus.COD_COLLECTED,
          },
        })
      )
    );
    for (const id of toComplete) {
      await fulfillOrderStock(id, vendorId);
      const payload = await serializeVendorOrder(id, vendorId);
      if (payload) changed.push(payload);
    }
  }

  if (changed.length > 0) {
    emitOrderPipeline(vendorId, {
      action: "batch",
      orders: changed.map(toPipelineSocket),
    });
  }
}

/** Bootstrap so Pending/Processing aren't empty on first load */
export async function ensureActivePipeline(vendorId: string) {
  await ensureDemoListings(vendorId);
  await ensureDemoOrders(vendorId);

  const vendorOrders = await prisma.vendorOrder.findMany({
    where: { vendorId },
    select: { status: true },
  });
  const hasPending = vendorOrders.some(
    (v) => v.status === VendorOrderStatus.APPROVED
  );
  const hasProcessing = vendorOrders.some(
    (v) => v.status === VendorOrderStatus.PROCESSING
  );
  if (hasPending && hasProcessing) return { seeded: 0 };

  const listings = await prisma.listing.findMany({
    where: { vendorId },
    take: 4,
  });
  if (listings.length === 0) return { seeded: 0 };

  const customerId = await getDemoCustomerId();
  let seeded = 0;

  async function make(
    status: VendorOrderStatus,
    offsetMin: number,
    paymentStatus: PaymentStatus
  ) {
    const picks = listings.slice(0, 2);
    const orderItems = picks.map((l, i) => ({
      listingId: l.id,
      qty: 1 + i,
      priceAtPurchase: l.price,
    }));
    const subtotal = orderItems.reduce(
      (s, it) => s + it.qty * it.priceAtPurchase,
      0
    );
    await prisma.order.create({
      data: {
        customerId,
        totalAmount: Math.round(subtotal * 100) / 100,
        paymentMethod: PaymentMethod.COD,
        createdAt: new Date(Date.now() - offsetMin * 60_000),
        vendorOrders: {
          create: [
            {
              vendorId,
              subtotal: Math.round(subtotal * 100) / 100,
              status,
              paymentStatus,
              items: { create: orderItems },
            },
          ],
        },
      },
    });
    seeded += 1;
  }

  if (!hasPending) {
    await make(VendorOrderStatus.APPROVED, 2, PaymentStatus.COD_PENDING);
    await make(VendorOrderStatus.APPROVED, 5, PaymentStatus.COD_PENDING);
  }
  if (!hasProcessing) {
    await make(VendorOrderStatus.PROCESSING, 8, PaymentStatus.COD_PENDING);
  }

  return { seeded };
}

async function tickOnce() {
  seq += 1;
  const vendors = await prisma.vendor.findMany({
    include: {
      listings: {
        include: { catalog: { select: { name: true } } },
        take: 20,
      },
    },
  });

  for (const vendor of vendors) {
    if (vendor.listings.length === 0) continue;

    // Live orders: add pending consecutively + advance columns simultaneously
    if (seq % 1 === 0) {
      void tickOrderPipeline(vendor.id).catch((err) =>
        console.warn("order pipeline tick", err)
      );
    }

    const sim = ensureState(vendor.id);
    const listing =
      vendor.listings[Math.floor(Math.random() * vendor.listings.length)];

    // Nudge live viewers
    for (const l of vendor.listings) {
      const cur = sim.viewers[l.id] ?? 1;
      sim.viewers[l.id] = Math.max(0, cur + (Math.random() > 0.5 ? 1 : -1));
    }

    const kinds: SimPulseKind[] = ["competitor", "stock", "price", "density"];
    const kind = kinds[seq % kinds.length];
    let pulse: SimPulseEvent;

    if (kind === "stock" || (listing.stock <= listing.lowStockThreshold && seq % 3 === 0)) {
      // Occasionally apply a real stock decrement for live feel
      if (Math.random() > 0.55 && listing.stock > 0) {
        const nextStock = Math.max(0, listing.stock - 1);
        const updated = await prisma.listing.update({
          where: { id: listing.id },
          data: { stock: nextStock },
          include: { catalog: { select: { name: true } } },
        });
        emitStockUpdated({
          listingId: updated.id,
          catalogId: updated.catalogId,
          vendorId: updated.vendorId,
          stock: updated.stock,
          price: updated.price,
          lowStockThreshold: updated.lowStockThreshold,
        });
        if (updated.stock <= updated.lowStockThreshold || updated.stock < CRITICAL_STOCK_LT) {
          emitLowStockAlert({
            vendorId: vendor.id,
            listingId: updated.id,
            catalogName: updated.catalog.name,
            stock: updated.stock,
            lowStockThreshold: updated.lowStockThreshold,
          });
          pushAlert(vendor.id, {
            listingId: updated.id,
            catalogName: updated.catalog.name,
            stock: updated.stock,
            lowStockThreshold: updated.lowStockThreshold,
            severity: updated.stock < CRITICAL_STOCK_LT ? "critical" : "warn",
          });
          void notifyIfCriticalStock({
            vendorId: vendor.id,
            listingId: updated.id,
            catalogName: updated.catalog.name,
            stock: updated.stock,
            lowStockThreshold: updated.lowStockThreshold,
          });
        }
        // Occasionally force a critical drop for live demo alerts
        if (seq % 11 === 0 && updated.stock >= CRITICAL_STOCK_LT) {
          const critical = await prisma.listing.update({
            where: { id: updated.id },
            data: { stock: Math.min(3, updated.stock) },
            include: { catalog: { select: { name: true } } },
          });
          emitStockUpdated({
            listingId: critical.id,
            catalogId: critical.catalogId,
            vendorId: critical.vendorId,
            stock: critical.stock,
            price: critical.price,
            lowStockThreshold: critical.lowStockThreshold,
          });
          void notifyIfCriticalStock({
            vendorId: vendor.id,
            listingId: critical.id,
            catalogName: critical.catalog.name,
            stock: critical.stock,
            lowStockThreshold: critical.lowStockThreshold,
          });
        }
        pulse = {
          id: `pulse-${seq}-${vendor.id.slice(0, 4)}`,
          kind: "stock",
          title: `${updated.catalog.name} stock moved`,
          detail: `Now ${updated.stock} units · threshold ${updated.lowStockThreshold}`,
          at: "just now",
          severity:
            updated.stock < CRITICAL_STOCK_LT
              ? "critical"
              : updated.stock <= updated.lowStockThreshold
                ? "warn"
                : "info",
        };
      } else {
        pulse = {
          id: `pulse-${seq}-${vendor.id.slice(0, 4)}`,
          kind: "stock",
          title: `${listing.catalog.name} watched`,
          detail: `${sim.viewers[listing.id] ?? 1} live viewers · stock ${listing.stock}`,
          at: "just now",
          severity: "info",
        };
      }
    } else if (kind === "price") {
      pulse = {
        id: `pulse-${seq}-${vendor.id.slice(0, 4)}`,
        kind: "price",
        title: "Competitor price nudge",
        detail: `Nearby seller adjusted ${listing.catalog.name} by ₹${2 + (seq % 5)}`,
        at: "just now",
        severity: "info",
      };
    } else if (kind === "competitor") {
      pulse = {
        id: `pulse-${seq}-${vendor.id.slice(0, 4)}`,
        kind: "competitor",
        title: "Competitor activity",
        detail: `A store within 2 km restocked overlapping SKUs`,
        at: "just now",
        severity: "info",
      };
    } else {
      pulse = {
        id: `pulse-${seq}-${vendor.id.slice(0, 4)}`,
        kind: "density",
        title: "Heat spike",
        detail: "Shopper density rising in your delivery radius",
        at: "just now",
        severity: "info",
      };
    }

    sim.pulse = [
      pulse,
      ...sim.pulse.map((e, i) =>
        i === 0 && e.at === "just now" ? { ...e, at: "45s ago" } : e
      ),
    ].slice(0, 4);

    const actTypes: SimActivity["type"][] = [
      "viewing",
      "cart",
      "order",
      "wishlist",
      "inventory",
    ];
    const actType = actTypes[seq % actTypes.length];
    const activity: SimActivity = {
      id: `act-${seq}-${listing.id.slice(0, 4)}`,
      type: actType,
      message:
        actType === "viewing"
          ? `${1 + (seq % 4)} shoppers viewing ${listing.catalog.name}`
          : actType === "cart"
            ? `${listing.catalog.name} added to a cart`
            : actType === "order"
              ? `New order includes ${listing.catalog.name}`
              : actType === "wishlist"
                ? `${listing.catalog.name} saved to a wishlist`
                : `Inventory sync for ${listing.catalog.name}`,
      at: "just now",
    };
    sim.activity = [
      activity,
      ...sim.activity.map((e, i) =>
        i === 0 && e.at === "just now" ? { ...e, at: "1m ago" } : e
      ),
    ].slice(0, 20);

    emitMarketPulse(vendor.id, pulse);
    emitVendorActivity(vendor.id, activity);
  }
}

export function startDemoSimulation() {
  if (process.env.AUTH_DEMO_MODE === "false") {
    console.log("Demo simulation off (AUTH_DEMO_MODE=false)");
    return;
  }
  if (tickTimer) return;
  console.log("Demo simulation live — stock/pulse/orders every 6s");
  void tickOnce();
  tickTimer = setInterval(() => {
    void tickOnce().catch((err) => console.warn("demoSim tick", err));
  }, 6000);
}
