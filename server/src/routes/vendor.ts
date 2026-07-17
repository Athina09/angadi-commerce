import { Router } from "express";
import { z } from "zod";
import { DecayCurve, Unit, VendorOrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { emitLowStockAlert, emitOrderPipeline, emitStockUpdated, emitFreshnessUpdated } from "../lib/io.js";
import {
  CRITICAL_STOCK_LT,
  getVendorAlertPhone,
  notifyIfCriticalStock,
  setVendorAlertPhone,
} from "../lib/notify.js";
import {
  buildDashboardPayload,
  ensureActivePipeline,
  ensureDemoListings,
  ensureDemoVendor,
  getVendorSim,
  pushAlert,
} from "../lib/demoSim.js";
import { computeFreshness, suggestDecayCurve, type DecayCurveType } from "../lib/freshness.js";
import { answerVendorChat } from "../lib/vendorChat.js";
import { runQualityCheck } from "../lib/qualityCheck.js";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const listingInclude = {
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
} as const;

function withFreshness<
  T extends {
    lastCheckedAt: Date;
    lastCheckQualityScore: number;
    catalog: { shelfLifeDays: number; decayCurveType: DecayCurveType };
  },
>(listing: T) {
  return {
    ...listing,
    freshness: computeFreshness({
      shelfLifeDays: listing.catalog.shelfLifeDays,
      decayCurveType: listing.catalog.decayCurveType,
      lastCheckedAt: listing.lastCheckedAt,
      lastCheckQualityScore: listing.lastCheckQualityScore,
    }),
  };
}

function emitListingFreshness(
  listing: {
    id: string;
    catalogId: string;
    vendorId: string;
    lastCheckQualityScore: number;
    lastCheckedAt: Date;
    catalog: { shelfLifeDays: number; decayCurveType: DecayCurveType };
  }
) {
  const freshness = computeFreshness({
    shelfLifeDays: listing.catalog.shelfLifeDays,
    decayCurveType: listing.catalog.decayCurveType,
    lastCheckedAt: listing.lastCheckedAt,
    lastCheckQualityScore: listing.lastCheckQualityScore,
  });
  emitFreshnessUpdated({
    listingId: listing.id,
    catalogId: listing.catalogId,
    vendorId: listing.vendorId,
    lastCheckQualityScore: listing.lastCheckQualityScore,
    freshnessPercent: freshness.percent,
    freshnessBand: freshness.band,
    freshnessText: freshness.text,
    daysLeft: freshness.daysLeft,
    daysSurviveText: freshness.daysSurviveText,
  });
}

async function requireVendor(userId: string) {
  const existing = await prisma.vendor.findUnique({ where: { userId } });
  if (existing) return existing;
  // Demo: auto-create store so hub works with any login
  if (process.env.AUTH_DEMO_MODE === "false") return null;
  return ensureDemoVendor(userId);
}

/** 401 when JWT user was wiped by re-seed; 404 when onboarding truly needed */
async function vendorOrFail(
  req: AuthedRequest,
  res: { status: (c: number) => { json: (b: unknown) => void } }
) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(401).json({
      error: "Session expired — sign in again",
      code: "SESSION_EXPIRED",
    });
    return null;
  }
  const vendor = await requireVendor(userId);
  if (!vendor) {
    res.status(404).json({ error: "Complete onboarding first" });
    return null;
  }
  return vendor;
}

function paramId(req: AuthedRequest): string {
  const raw = req.params.id as string | string[] | undefined;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function maybeEmitLowStock(
  args: {
    vendorId: string;
    listingId: string;
    catalogName: string;
    stock: number;
    lowStockThreshold: number;
  },
  opts?: { forceSms?: boolean }
) {
  if (args.stock <= args.lowStockThreshold || args.stock < CRITICAL_STOCK_LT) {
    emitLowStockAlert(args);
  }
  // Live email + SMS when stock < 4 (force on manual stock edits)
  void notifyIfCriticalStock(args, { force: opts?.forceSms });
}

const onboardSchema = z.object({
  storeName: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

router.post(
  "/onboard",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const parsed = onboardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    const userId = req.user!.userId;
    const { storeName, category, lat, lng, photoUrl } = parsed.data;
    const existing = await prisma.vendor.findUnique({ where: { userId } });

    // photoUrl / categoryFocus stored lightly via storeName note until schema expands —
    // category returned to client; lat/lng are authoritative
    void photoUrl;
    void category;

    const vendor = existing
      ? await prisma.vendor.update({
          where: { userId },
          data: { storeName, lat, lng },
          select: {
            id: true,
            storeName: true,
            lat: true,
            lng: true,
            verified: true,
          },
        })
      : await prisma.vendor.create({
          data: { userId, storeName, lat, lng, verified: false },
          select: {
            id: true,
            storeName: true,
            lat: true,
            lng: true,
            verified: true,
          },
        });

    res.status(existing ? 200 : 201).json({
      vendor,
      category,
      message: existing ? "Store updated" : "Store created — pending verification",
    });
  }
);

router.get(
  "/alert-prefs",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const vendor = await requireVendor(req.user!.userId);
    if (!vendor) {
      res.status(404).json({ error: "Complete onboarding first" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true },
    });
    res.json({
      email: user?.email ?? null,
      phone: getVendorAlertPhone(vendor.id) || "6379479639",
      criticalBelow: CRITICAL_STOCK_LT,
      channels: {
        email: true,
        sms: true,
        liveSmtp: Boolean(process.env.RESEND_API_KEY),
        liveTwilio: Boolean(process.env.TWILIO_ACCOUNT_SID),
        liveFast2Sms: Boolean(process.env.FAST2SMS_API_KEY),
        liveMacMessages: process.platform === "darwin",
      },
    });
  }
);

router.put(
  "/alert-prefs",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const vendor = await requireVendor(req.user!.userId);
    if (!vendor) {
      res.status(404).json({ error: "Complete onboarding first" });
      return;
    }
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    setVendorAlertPhone(vendor.id, phone);
    res.json({
      ok: true,
      phone: getVendorAlertPhone(vendor.id),
      criticalBelow: CRITICAL_STOCK_LT,
    });
  }
);

/** Force a critical notify for demo (sets stock to 3 if needed) */
router.post(
  "/alerts/test-notify",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }
      await ensureDemoListings(vendor.id);
      let listing = await prisma.listing.findFirst({
        where: { vendorId: vendor.id },
        include: { catalog: { select: { name: true } } },
        orderBy: { stock: "asc" },
      });
      if (!listing) {
        res.status(404).json({ error: "No listings" });
        return;
      }
      if (listing.stock >= CRITICAL_STOCK_LT) {
        listing = await prisma.listing.update({
          where: { id: listing.id },
          data: { stock: 3 },
          include: { catalog: { select: { name: true } } },
        });
        emitStockUpdated({
          listingId: listing.id,
          catalogId: listing.catalogId,
          vendorId: listing.vendorId,
          stock: listing.stock,
          price: listing.price,
          lowStockThreshold: listing.lowStockThreshold,
        });
      }
      const args = {
        vendorId: vendor.id,
        listingId: listing.id,
        catalogName: listing.catalog.name,
        stock: listing.stock,
        lowStockThreshold: listing.lowStockThreshold,
      };
      emitLowStockAlert(args);
      const event = await notifyIfCriticalStock(args, { force: true });
      res.json({ ok: true, event, stock: listing.stock });
    } catch (err) {
      console.error("POST /vendor/alerts/test-notify", err);
      res.status(500).json({ error: "Test notify failed" });
    }
  }
);

router.get(
  "/me",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const vendor = await requireVendor(req.user!.userId);
    res.json({
      vendor: vendor
        ? {
            id: vendor.id,
            storeName: vendor.storeName,
            lat: vendor.lat,
            lng: vendor.lng,
            verified: vendor.verified,
          }
        : null,
    });
  }
);

const chatSchema = z.object({
  message: z.string().min(1).max(800),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(12)
    .optional(),
});

/** Professional vendor AI advisor — live OpenAI if keyed, else context advisor */
router.post(
  "/chat",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid message" });
      return;
    }
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }
      const result = await answerVendorChat({
        vendorId: vendor.id,
        message: parsed.data.message,
        history: parsed.data.history,
      });
      res.json(result);
    } catch (err) {
      console.error("POST /vendor/chat", err);
      res.status(500).json({ error: "Assistant unavailable" });
    }
  }
);

/** Demo + live-simulated mission control payload */
router.get(
  "/dashboard",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await vendorOrFail(req, res);
      if (!vendor) return;
      const rangeRaw = String(req.query.range ?? "7d");
      const range =
        rangeRaw === "today" || rangeRaw === "30d" ? rangeRaw : "7d";
      const dashboard = await buildDashboardPayload(vendor.id, range);
      if (!dashboard) {
        res.status(500).json({ error: "Failed to build dashboard" });
        return;
      }
      res.json({ dashboard });
    } catch (err) {
      console.error("GET /vendor/dashboard", err);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  }
);

/** Map VendorOrderStatus → legacy kanban column key (until UI adds approval column) */
function legacyKanbanStatus(
  status: VendorOrderStatus
): "pendingApproval" | "pending" | "processing" | "completed" | "rejected" {
  switch (status) {
    case "PENDING_APPROVAL":
      return "pendingApproval";
    case "APPROVED":
      return "pending";
    case "PROCESSING":
      return "processing";
    case "COMPLETED":
      return "completed";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    default:
      return "pending";
  }
}

/** Orders that include this vendor's sub-orders */
router.get(
  "/orders",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }

      await ensureDemoListings(vendor.id);
      await ensureActivePipeline(vendor.id);

      const vendorOrders = await prisma.vendorOrder.findMany({
        where: { vendorId: vendor.id },
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
        orderBy: { createdAt: "desc" },
        take: 80,
      });

      let orders = vendorOrders.map((vo) => {
        const lines = vo.items.map((oi) => ({
          listingId: oi.listing.id,
          name: oi.listing.catalog.name,
          imageUrl: oi.listing.catalog.imageUrl,
          qty: oi.qty,
          priceAtPurchase: oi.priceAtPurchase,
        }));
        const kanban = legacyKanbanStatus(vo.status);
        return {
          id: vo.id,
          vendorOrderId: vo.id,
          orderId: vo.orderId,
          status: kanban,
          vendorOrderStatus: vo.status,
          paymentStatus: vo.paymentStatus,
          paymentMethod: vo.order.paymentMethod,
          total: vo.subtotal,
          subtotal: vo.subtotal,
          createdAt: vo.order.createdAt,
          customerName: vo.order.customer.name,
          customerEmail: vo.order.customer.email,
          lines,
        };
      });

      if (orders.length === 0) {
        await ensureDemoListings(vendor.id);
        const listings = await prisma.listing.findMany({
          where: { vendorId: vendor.id },
          include: { catalog: true },
          take: 4,
        });
        orders = listings.slice(0, 3).map((l, i) => ({
          id: `demo-ord-${vendor.id.slice(0, 6)}-${i}`,
          vendorOrderId: `demo-ord-${vendor.id.slice(0, 6)}-${i}`,
          orderId: `demo-parent-${i}`,
          status: (["pendingApproval", "pending", "processing"] as const)[
            i % 3
          ],
          vendorOrderStatus: "PENDING_APPROVAL" as VendorOrderStatus,
          paymentStatus: "COD_PENDING",
          paymentMethod: "COD" as const,
          total: Math.round(l.price * (1 + i)),
          subtotal: Math.round(l.price * (1 + i)),
          createdAt: new Date(Date.now() - i * 3600_000),
          customerName: ["Karthik R.", "Priya M.", "Omar H."][i % 3],
          customerEmail: "demo@example.com",
          lines: [
            {
              listingId: l.id,
              name: l.catalog.name,
              imageUrl: l.catalog.imageUrl,
              qty: 1 + i,
              priceAtPurchase: l.price,
            },
          ],
        }));
      }

      res.json({
        orders: orders.map((o) => ({
          ...o,
          createdAt:
            o.createdAt instanceof Date
              ? o.createdAt.toISOString()
              : o.createdAt,
        })),
        vendorId: vendor.id,
        demo: true,
      });
    } catch (err) {
      console.error("GET /vendor/orders", err);
      res.status(500).json({ error: "Failed to load orders" });
    }
  }
);

router.patch(
  "/orders/:id/status",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const legacyStatus = req.body?.status as
      | "pending"
      | "processing"
      | "completed"
      | "pendingApproval"
      | undefined;
    if (
      !legacyStatus ||
      !["pending", "processing", "completed", "pendingApproval"].includes(
        legacyStatus
      )
    ) {
      res.status(400).json({
        error:
          "status must be pendingApproval|pending|processing|completed (legacy kanban keys)",
      });
      return;
    }

    const vendor = await requireVendor(req.user!.userId);
    if (!vendor) {
      res.status(404).json({ error: "Complete onboarding first" });
      return;
    }

    const vendorOrderId = paramId(req);

    if (vendorOrderId.startsWith("demo-ord-")) {
      res.json({
        order: { id: vendorOrderId, status: legacyStatus },
        demo: true,
      });
      return;
    }

    const existing = await prisma.vendorOrder.findFirst({
      where: { id: vendorOrderId, vendorId: vendor.id },
      include: { order: { select: { paymentMethod: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    let nextStatus: VendorOrderStatus = existing.status;
    if (legacyStatus === "pendingApproval") {
      nextStatus = VendorOrderStatus.PENDING_APPROVAL;
    } else if (legacyStatus === "pending") {
      nextStatus = VendorOrderStatus.APPROVED;
    } else if (legacyStatus === "processing") {
      nextStatus = VendorOrderStatus.PROCESSING;
    } else if (legacyStatus === "completed") {
      nextStatus = VendorOrderStatus.COMPLETED;
    }

    const paymentUpdate =
      nextStatus === VendorOrderStatus.COMPLETED &&
      existing.order.paymentMethod === "COD"
        ? { paymentStatus: "COD_COLLECTED" as const }
        : {};

    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: { status: nextStatus, ...paymentUpdate },
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

    const orderLines = updated.items.map((oi) => ({
      listingId: oi.listing.id,
      name: oi.listing.catalog.name,
      imageUrl: oi.listing.catalog.imageUrl,
      qty: oi.qty,
      priceAtPurchase: oi.priceAtPurchase,
    }));

    emitOrderPipeline(vendor.id, {
      action: "advanced",
      orders: [
        {
          id: updated.id,
          status: legacyKanbanStatus(updated.status) as
            | "pending"
            | "processing"
            | "completed",
          total: Math.round(updated.subtotal * 100) / 100,
          createdAt: updated.order.createdAt.toISOString(),
          customerName: updated.order.customer.name,
          customerEmail: updated.order.customer.email,
          lines: orderLines,
        },
      ],
    });

    res.json({
      order: {
        id: updated.id,
        vendorOrderId: updated.id,
        orderId: updated.orderId,
        status: legacyKanbanStatus(updated.status),
        vendorOrderStatus: updated.status,
        paymentStatus: updated.paymentStatus,
        total: updated.subtotal,
        createdAt: updated.order.createdAt.toISOString(),
        customerName: updated.order.customer.name,
        customerEmail: updated.order.customer.email,
        lines: orderLines,
      },
    });
  }
);

router.get(
  "/alerts",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }

      await ensureDemoListings(vendor.id);

      const listings = await prisma.listing.findMany({
        where: { vendorId: vendor.id },
        include: {
          catalog: {
            select: { name: true, imageUrl: true, category: true },
          },
        },
        orderBy: { stock: "asc" },
      });

      const sim = getVendorSim(vendor.id);

      const live = listings
        .filter((l) => l.stock <= l.lowStockThreshold)
        .map((l) => ({
          id: `live-${l.id}`,
          listingId: l.id,
          catalogName: l.catalog.name,
          category: l.catalog.category,
          imageUrl: l.catalog.imageUrl,
          stock: l.stock,
          lowStockThreshold: l.lowStockThreshold,
          price: l.price,
          at: new Date().toISOString(),
          severity: (l.stock <= 2 ? "critical" : "warn") as "critical" | "warn",
          source: "live" as const,
        }));

      // Demo fill: always surface lowest-stock SKUs so the page isn't empty
      const demoFill = listings.slice(0, 8).map((l, i) => {
        const critical = l.stock <= 2 || i === 0;
        const warn = l.stock <= l.lowStockThreshold || i < 4;
        return {
          id: `demo-watch-${l.id}`,
          listingId: l.id,
          catalogName: l.catalog.name,
          category: l.catalog.category,
          imageUrl: l.catalog.imageUrl,
          stock: Math.min(l.stock, critical ? Math.min(l.stock, 2) : l.stock),
          lowStockThreshold: l.lowStockThreshold,
          price: l.price,
          at: new Date(Date.now() - (i + 1) * 7 * 60_000).toISOString(),
          severity: (critical ? "critical" : warn ? "warn" : "warn") as
            | "critical"
            | "warn",
          source: "demo" as const,
        };
      });

      // Prefer real low-stock; pad with demo watches (dedupe by listingId)
      const seen = new Set<string>();
      let alerts = [...live, ...demoFill, ...sim.alerts.map((a) => {
        const listing = listings.find((l) => l.id === a.listingId);
        return {
          id: a.id,
          listingId: a.listingId,
          catalogName: a.catalogName,
          category: listing?.catalog.category ?? "Grocery",
          imageUrl: listing?.catalog.imageUrl ?? "",
          stock: a.stock,
          lowStockThreshold: a.lowStockThreshold,
          price: listing?.price ?? 0,
          at: a.at,
          severity: a.severity,
          source: "sim" as const,
        };
      })]
        .filter((a) => {
          if (seen.has(a.listingId)) return false;
          seen.add(a.listingId);
          return true;
        })
        .slice(0, 12);

      // Demo polish: lowest stock always reads critical so the board isn't flat
      if (alerts.length > 0 && !alerts.some((a) => a.severity === "critical")) {
        alerts = alerts.map((a, i) =>
          i === 0 ? { ...a, severity: "critical" as const, stock: Math.min(a.stock, 2) } : a
        );
      }

      // Seed sim history from first alerts
      if (sim.alerts.length === 0) {
        for (const a of alerts.slice(0, 3)) {
          pushAlert(vendor.id, {
            listingId: a.listingId,
            catalogName: a.catalogName,
            stock: a.stock,
            lowStockThreshold: a.lowStockThreshold,
            severity: a.severity,
          });
        }
      }

      res.json({
        alerts,
        vendorId: vendor.id,
        demo: true,
        summary: {
          critical: alerts.filter((a) => a.severity === "critical").length,
          warn: alerts.filter((a) => a.severity === "warn").length,
          watching: alerts.length,
        },
      });
    } catch (err) {
      console.error("GET /vendor/alerts", err);
      res.status(500).json({ error: "Failed to load alerts" });
    }
  }
);

router.get(
  "/insights",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }
      const dashboard = await buildDashboardPayload(vendor.id, "7d");
      if (!dashboard) {
        res.status(404).json({ error: "Vendor not found" });
        return;
      }

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const products = dashboard.products.slice(0, 8);

      const forecast = products.map((p, i) => {
        const confidence = Math.round(72 + ((i * 7) % 20));
        const next7dDemand = Math.round(p.unitsSold * 1.15);
        const suggestedStock = Math.max(
          p.stock,
          Math.round(p.unitsSold * 0.4) + 5
        );
        const dailyDemand = Array.from({ length: 7 }, (_, d) => {
          const weekendBoost = d >= 4 ? 1.18 : 1;
          const wave = 0.85 + 0.2 * Math.sin((d + i) * 0.9);
          return Math.max(
            1,
            Math.round((next7dDemand / 7) * weekendBoost * wave)
          );
        });
        return {
          listingId: p.id,
          name: p.name,
          category: p.category,
          stock: p.stock,
          price: p.price,
          confidence,
          next7dDemand,
          suggestedStock,
          stockGap: suggestedStock - p.stock,
          trend: p.conversionTrend,
          dailyDemand,
        };
      });

      // Past 7d actual + next 7d predicted (units + revenue)
      const salesTrend = dashboard.salesTrend;
      const lastRev =
        salesTrend.length > 0
          ? salesTrend[salesTrend.length - 1]!.revenue
          : 5000;
      const lastOrd =
        salesTrend.length > 0
          ? salesTrend[salesTrend.length - 1]!.orders
          : 8;
      const demandCurve = [
        ...salesTrend.map((d, i) => ({
          label: d.date,
          dayIndex: i - salesTrend.length,
          actualDemand: Math.round(
            d.orders * 3.2 + (i % 3) * 2
          ),
          predictedDemand: null as number | null,
          low: null as number | null,
          high: null as number | null,
          actualRevenue: d.revenue,
          predictedRevenue: null as number | null,
          actualOrders: d.orders,
          predictedOrders: null as number | null,
          phase: "actual" as const,
        })),
        ...Array.from({ length: 7 }, (_, i) => {
          const dt = new Date();
          dt.setDate(dt.getDate() + i + 1);
          const weekend = dt.getDay() === 0 || dt.getDay() === 6 ? 1.22 : 1;
          const growth = 1 + (i + 1) * 0.035;
          const predOrd = Math.max(
            4,
            Math.round(lastOrd * growth * weekend * (0.92 + (i % 3) * 0.04))
          );
          const predRev = Math.round(
            lastRev * growth * weekend * (0.94 + (i % 4) * 0.03)
          );
          const predDemand = Math.round(predOrd * 3.2);
          const band = Math.round(predDemand * (0.12 + (i % 3) * 0.02));
          return {
            label: dayNames[dt.getDay()]!,
            dayIndex: i + 1,
            actualDemand: null as number | null,
            predictedDemand: predDemand,
            low: predDemand - band,
            high: predDemand + band,
            actualRevenue: null as number | null,
            predictedRevenue: predRev,
            actualOrders: null as number | null,
            predictedOrders: predOrd,
            phase: "forecast" as const,
          };
        }),
      ];

      // Bridge: last actual point also carries predicted for smooth chart join
      if (demandCurve.length >= 8) {
        const bridge = demandCurve[salesTrend.length - 1];
        if (bridge && bridge.phase === "actual") {
          bridge.predictedDemand = bridge.actualDemand;
          bridge.predictedRevenue = bridge.actualRevenue;
          bridge.predictedOrders = bridge.actualOrders;
          bridge.low = bridge.actualDemand;
          bridge.high = bridge.actualDemand;
        }
      }

      const skuCompare = forecast.map((f) => ({
        name:
          f.name.length > 14 ? `${f.name.slice(0, 12)}…` : f.name,
        fullName: f.name,
        demand: f.next7dDemand,
        stock: f.stock,
        suggested: f.suggestedStock,
        confidence: f.confidence,
        gap: f.stockGap,
      }));

      const categoryDemand = Object.entries(
        forecast.reduce<Record<string, number>>((acc, f) => {
          const cat = f.category || "Other";
          acc[cat] = (acc[cat] ?? 0) + f.next7dDemand;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }));

      const peakHours = [
        { hour: "6a", demand: 8 },
        { hour: "8a", demand: 22 },
        { hour: "10a", demand: 31 },
        { hour: "12p", demand: 48 },
        { hour: "2p", demand: 36 },
        { hour: "4p", demand: 41 },
        { hour: "6p", demand: 58 },
        { hour: "8p", demand: 44 },
        { hour: "10p", demand: 18 },
      ].map((h, i) => ({
        ...h,
        demand: Math.round(
          h.demand *
            (0.9 +
              (products.reduce((s, p) => s + p.unitsSold, 0) % 17) * 0.01 +
              (i % 2) * 0.05)
        ),
      }));

      const confidenceVsDemand = forecast.map((f) => ({
        name: f.name.split(" ")[0] ?? f.name,
        confidence: f.confidence,
        demand: f.next7dDemand,
        stockRisk: Math.max(0, f.stockGap),
      }));

      const predictiveSummary = {
        next7dRevenue: demandCurve
          .filter((d) => d.phase === "forecast")
          .reduce((s, d) => s + (d.predictedRevenue ?? 0), 0),
        next7dOrders: demandCurve
          .filter((d) => d.phase === "forecast")
          .reduce((s, d) => s + (d.predictedOrders ?? 0), 0),
        next7dUnits: forecast.reduce((s, f) => s + f.next7dDemand, 0),
        avgConfidence: Math.round(
          forecast.reduce((s, f) => s + f.confidence, 0) /
            Math.max(forecast.length, 1)
        ),
        skusAtRisk: forecast.filter((f) => f.stockGap > 0).length,
      };

      res.json({
        demo: true,
        quickInsights: dashboard.quickInsights,
        aiRecommendations: dashboard.aiRecommendations,
        salesTrend: dashboard.salesTrend,
        topProducts: dashboard.topProducts,
        forecast,
        demandCurve,
        skuCompare,
        categoryDemand,
        peakHours,
        confidenceVsDemand,
        predictiveSummary,
      });
    } catch (err) {
      console.error("GET /vendor/insights", err);
      res.status(500).json({ error: "Failed to load insights" });
    }
  }
);

/** List this vendor's listings */
router.get(
  "/listings",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }

      await ensureDemoListings(vendor.id);

      const listings = await prisma.listing.findMany({
        where: { vendorId: vendor.id },
        include: listingInclude,
        orderBy: { updatedAt: "desc" },
      });

      res.json({
        listings: listings.map(withFreshness),
        vendorId: vendor.id,
        verified: vendor.verified,
        demo: true,
      });
    } catch (err) {
      console.error("GET /vendor/listings", err);
      res.status(500).json({ error: "Failed to load listings" });
    }
  }
);

const createListingSchema = z.object({
  catalogId: z.string().min(1).optional(),
  // create catalog on the fly
  newCatalog: z
    .object({
      name: z.string().min(2).max(120),
      category: z.string().min(2).max(60),
      unit: z.nativeEnum(Unit),
      imageUrl: z.string().url().or(z.string().startsWith("/")),
      shelfLifeDays: z.number().int().min(1).max(730),
    })
    .optional(),
  price: z.number().positive(),
  competitorRefPrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

router.post(
  "/listings",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    const vendor = await requireVendor(req.user!.userId);
    if (!vendor) {
      res.status(404).json({ error: "Complete onboarding first" });
      return;
    }

    const data = parsed.data;
    if (!data.catalogId && !data.newCatalog) {
      res.status(400).json({ error: "Provide catalogId or newCatalog" });
      return;
    }

    try {
      let catalogId = data.catalogId;
      if (data.newCatalog) {
        const created = await prisma.catalog.create({
          data: {
            name: data.newCatalog.name,
            category: data.newCatalog.category,
            unit: data.newCatalog.unit,
            imageUrl: data.newCatalog.imageUrl,
            shelfLifeDays: data.newCatalog.shelfLifeDays,
            decayCurveType: suggestDecayCurve(
              data.newCatalog.name,
              data.newCatalog.category
            ) as DecayCurve,
          },
        });
        catalogId = created.id;
      }

      const competitorRefPrice =
        data.competitorRefPrice ?? Math.round(data.price * 1.05 * 100) / 100;

      const now = new Date();
      let listing = await prisma.listing.create({
        data: {
          vendorId: vendor.id,
          catalogId: catalogId!,
          price: data.price,
          competitorRefPrice,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
          intakeQualityScore: 1.0,
          lastCheckQualityScore: 1.0,
          lastCheckedAt: now,
        },
        include: listingInclude,
      });

      // Intake photo quality (OpenCV via ml-service, or node fallback)
      try {
        const quality = await runQualityCheck({
          category: listing.catalog.category,
          imageUrl: listing.catalog.imageUrl,
        });
        listing = await prisma.listing.update({
          where: { id: listing.id },
          data: {
            intakeQualityScore: quality.qualityScore,
            lastCheckQualityScore: quality.qualityScore,
            lastCheckedAt: new Date(),
          },
          include: listingInclude,
        });
      } catch (err) {
        console.warn("intake quality check skipped", err);
      }

      emitStockUpdated({
        listingId: listing.id,
        catalogId: listing.catalogId,
        vendorId: listing.vendorId,
        stock: listing.stock,
        price: listing.price,
        lowStockThreshold: listing.lowStockThreshold,
      });
      maybeEmitLowStock({
        vendorId: vendor.id,
        listingId: listing.id,
        catalogName: listing.catalog.name,
        stock: listing.stock,
        lowStockThreshold: listing.lowStockThreshold,
      });

      res.status(201).json({ listing: withFreshness(listing) });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        res.status(409).json({ error: "You already list this catalog item" });
        return;
      }
      console.error("POST /vendor/listings", err);
      res.status(500).json({ error: "Failed to create listing" });
    }
  }
);

const updateListingSchema = z.object({
  price: z.number().positive().optional(),
  competitorRefPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

router.put(
  "/listings/:id",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const parsed = updateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    const vendor = await requireVendor(req.user!.userId);
    if (!vendor) {
      res.status(404).json({ error: "Complete onboarding first" });
      return;
    }

    const listingId = paramId(req);
    const existing = await prisma.listing.findFirst({
      where: { id: listingId, vendorId: vendor.id },
      include: listingInclude,
    });
    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    try {
      const prevStock = existing.stock;
      const listing = await prisma.listing.update({
        where: { id: existing.id },
        data: parsed.data,
        include: listingInclude,
      });

      emitStockUpdated({
        listingId: listing.id,
        catalogId: listing.catalogId,
        vendorId: listing.vendorId,
        stock: listing.stock,
        price: listing.price,
        lowStockThreshold: listing.lowStockThreshold,
      });

      const stockDropped =
        parsed.data.stock != null &&
        listing.stock < prevStock &&
        listing.stock < CRITICAL_STOCK_LT;

      maybeEmitLowStock(
        {
          vendorId: vendor.id,
          listingId: listing.id,
          catalogName: listing.catalog.name,
          stock: listing.stock,
          lowStockThreshold: listing.lowStockThreshold,
        },
        { forceSms: stockDropped }
      );

      res.json({ listing: withFreshness(listing) });
    } catch (err) {
      console.error("PUT /vendor/listings/:id", err);
      res.status(500).json({ error: "Failed to update listing" });
    }
  }
);

/** Hybrid freshness for one listing (decay curve × quality; quality defaults 1.0) */
router.get(
  "/listings/:id/freshness",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }
      const listing = await prisma.listing.findFirst({
        where: { id: paramId(req), vendorId: vendor.id },
        include: listingInclude,
      });
      if (!listing) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
      res.json({
        listingId: listing.id,
        freshness: computeFreshness({
          shelfLifeDays: listing.catalog.shelfLifeDays,
          decayCurveType: listing.catalog.decayCurveType,
          lastCheckedAt: listing.lastCheckedAt,
          lastCheckQualityScore: listing.lastCheckQualityScore,
        }),
        intakeQualityScore: listing.intakeQualityScore,
        lastCheckQualityScore: listing.lastCheckQualityScore,
        lastCheckedAt: listing.lastCheckedAt,
        note: "Hybrid decay curve × qualityScore — not a trained spoilage classifier",
      });
    } catch (err) {
      console.error("GET /vendor/listings/:id/freshness", err);
      res.status(500).json({ error: "Failed to compute freshness" });
    }
  }
);

/**
 * OpenCV (ml-service) or node fallback quality check.
 * Does NOT claim a trained deep-learning spoilage model.
 */
router.post(
  "/listings/:id/quality-check",
  requireAuth,
  requireRole("vendor"),
  upload.single("photo"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }
      const listing = await prisma.listing.findFirst({
        where: { id: paramId(req), vendorId: vendor.id },
        include: listingInclude,
      });
      if (!listing) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }

      const apply =
        req.body?.apply === "true" ||
        req.body?.apply === true ||
        req.query.apply === "1";

      const quality = await runQualityCheck({
        category: listing.catalog.category,
        imageUrl:
          typeof req.body?.imageUrl === "string"
            ? req.body.imageUrl
            : listing.catalog.imageUrl,
        imageBuffer: req.file?.buffer,
        filename: req.file?.originalname,
      });

      let updated = listing;
      if (apply) {
        updated = await prisma.listing.update({
          where: { id: listing.id },
          data: {
            intakeQualityScore: quality.qualityScore,
            lastCheckQualityScore: quality.qualityScore,
            lastCheckedAt: new Date(),
          },
          include: listingInclude,
        });
        emitListingFreshness(updated);
      }

      res.json({
        listing: withFreshness(updated),
        quality,
        applied: Boolean(apply),
        note: quality.note,
      });
    } catch (err) {
      console.error("POST /vendor/listings/:id/quality-check", err);
      res.status(500).json({ error: "Quality check failed" });
    }
  }
);

const recheckSchema = z.object({
  tag: z.enum(["good", "fading", "discard_soon", "rotten"]).optional(),
  qualityPercent: z.coerce.number().min(0).max(100).optional(),
  qualityScore: z.coerce.number().min(0).max(1).optional(),
  note: z.string().max(280).optional(),
  imageUrl: z.string().url().optional(),
  runPhoto: z.boolean().optional(),
});

/**
 * Manual recheck — numeric score, tag, OR photo heuristics; always resets lastCheckedAt.
 */
router.patch(
  "/listings/:id/recheck",
  requireAuth,
  requireRole("vendor"),
  upload.single("photo"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await requireVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }
      const listing = await prisma.listing.findFirst({
        where: { id: paramId(req), vendorId: vendor.id },
        include: listingInclude,
      });
      if (!listing) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }

      const body = {
        tag: req.body?.tag,
        qualityPercent:
          req.body?.qualityPercent != null && req.body?.qualityPercent !== ""
            ? Number(req.body.qualityPercent)
            : undefined,
        qualityScore:
          req.body?.qualityScore != null && req.body?.qualityScore !== ""
            ? Number(req.body.qualityScore)
            : undefined,
        note: typeof req.body?.note === "string" ? req.body.note : undefined,
        imageUrl: req.body?.imageUrl || undefined,
        runPhoto:
          req.body?.runPhoto === "true" ||
          req.body?.runPhoto === true ||
          Boolean(req.file),
      };
      const parsed = recheckSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid recheck input",
          details: parsed.error.flatten(),
        });
        return;
      }
      const {
        tag,
        qualityPercent,
        qualityScore: manualScore,
        imageUrl,
        runPhoto,
      } = parsed.data;
      const hasPhoto = Boolean(req.file?.buffer || imageUrl);

      let qualityScore = listing.lastCheckQualityScore;
      let qualityMeta: Awaited<ReturnType<typeof runQualityCheck>> | null =
        null;

      if (qualityPercent != null && !Number.isNaN(qualityPercent)) {
        qualityScore = Math.round(qualityPercent) / 100;
      } else if (manualScore != null && !Number.isNaN(manualScore)) {
        qualityScore = manualScore;
      } else if (tag === "good") qualityScore = 1.0;
      else if (tag === "fading") qualityScore = 0.6;
      else if (tag === "discard_soon") qualityScore = 0.2;
      else if (tag === "rotten") qualityScore = 0.12;
      else if (runPhoto || hasPhoto) {
        qualityMeta = await runQualityCheck({
          category: listing.catalog.category,
          imageUrl: imageUrl || listing.catalog.imageUrl,
          imageBuffer: req.file?.buffer,
          filename: req.file?.originalname,
        });
        qualityScore = qualityMeta.qualityScore;
      }

      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: {
          lastCheckQualityScore: qualityScore,
          intakeQualityScore: qualityScore,
          lastCheckedAt: new Date(),
        },
        include: listingInclude,
      });

      emitListingFreshness(updated);

      res.json({
        listing: withFreshness(updated),
        quality: qualityMeta,
        tag: tag ?? null,
        note:
          parsed.data.note ||
          "Human-in-the-loop recheck — hybrid freshness, not a trained spoilage model",
      });
    } catch (err) {
      console.error("PATCH /vendor/listings/:id/recheck", err);
      res.status(500).json({ error: "Recheck failed" });
    }
  }
);

router.delete(
  "/listings/:id",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    const vendor = await requireVendor(req.user!.userId);
    if (!vendor) {
      res.status(404).json({ error: "Complete onboarding first" });
      return;
    }

    const listingId = paramId(req);
    const existing = await prisma.listing.findFirst({
      where: { id: listingId, vendorId: vendor.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    try {
      // Clear cart refs first to avoid FK issues
      await prisma.cartItem.deleteMany({ where: { listingId: existing.id } });
      await prisma.listing.delete({ where: { id: existing.id } });

      emitStockUpdated({
        listingId: existing.id,
        catalogId: existing.catalogId,
        vendorId: existing.vendorId,
        stock: 0,
        price: existing.price,
        lowStockThreshold: existing.lowStockThreshold,
      });

      res.json({ ok: true, id: existing.id });
    } catch (err) {
      console.error("DELETE /vendor/listings/:id", err);
      res.status(500).json({
        error:
          "Could not delete listing (it may be referenced by past orders). Archive instead in a later build.",
      });
    }
  }
);

export default router;
