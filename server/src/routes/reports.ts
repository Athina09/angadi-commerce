import { Router } from "express";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { Parser, Transform } from "json2csv";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { ensureDemoOrders, ensureDemoVendor } from "../lib/demoSim.js";

const router = Router();

async function getVendor(userId: string) {
  const existing = await prisma.vendor.findUnique({ where: { userId } });
  if (existing) return existing;
  if (process.env.AUTH_DEMO_MODE === "false") return null;
  return ensureDemoVendor(userId);
}

/** Default: last 30 days. `to` is inclusive end-of-day UTC. */
function parseDateRange(fromQ?: unknown, toQ?: unknown) {
  const now = new Date();
  const to = typeof toQ === "string" && toQ ? new Date(toQ) : now;
  const from =
    typeof fromQ === "string" && fromQ
      ? new Date(fromQ)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: "Invalid from/to date (use ISO dates)" as const };
  }

  // Inclusive day bounds
  const fromStart = new Date(from);
  fromStart.setUTCHours(0, 0, 0, 0);
  const toEnd = new Date(to);
  toEnd.setUTCHours(23, 59, 59, 999);

  if (fromStart > toEnd) {
    return { error: "`from` must be on or before `to`" as const };
  }

  const fromLabel = fromStart.toISOString().slice(0, 10);
  const toLabel = toEnd.toISOString().slice(0, 10);
  return { fromStart, toEnd, fromLabel, toLabel };
}

const INCOME_FIELDS = [
  { label: "date", value: "date" },
  { label: "orderId", value: "orderId" },
  { label: "listingName", value: "listingName" },
  { label: "qty", value: "qty" },
  { label: "priceAtPurch", value: "priceAtPurchase" },
  { label: "lineTotal", value: "lineTotal" },
] as const;

type IncomeRow = {
  date: string;
  orderId: string;
  listingName: string;
  qty: number;
  priceAtPurchase: number;
  lineTotal: number;
};

async function loadIncomeRows(
  vendorId: string,
  fromStart: Date,
  toEnd: Date
): Promise<IncomeRow[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      listing: { vendorId },
      vendorOrder: { order: { createdAt: { gte: fromStart, lte: toEnd } } },
    },
    include: {
      vendorOrder: {
        include: { order: { select: { id: true, createdAt: true } } },
      },
      listing: { select: { catalog: { select: { name: true } } } },
    },
    orderBy: { vendorOrder: { order: { createdAt: "asc" } } },
  });

  return items.map((oi) => ({
    date: oi.vendorOrder.order.createdAt.toISOString().slice(0, 10),
    orderId: oi.vendorOrder.order.id,
    listingName: oi.listing.catalog.name,
    qty: oi.qty,
    priceAtPurchase: oi.priceAtPurchase,
    lineTotal: Math.round(oi.qty * oi.priceAtPurchase * 100) / 100,
  }));
}

/**
 * GET /vendor/reports/income?from=&to=&format=csv
 * CSV only for this review step — PDF comes after approval.
 */
router.get(
  "/income",
  requireAuth,
  requireRole("vendor"),
  async (req: AuthedRequest, res) => {
    try {
      const vendor = await getVendor(req.user!.userId);
      if (!vendor) {
        res.status(404).json({ error: "Complete onboarding first" });
        return;
      }

      // Demo: backfill sales so income CSV isn't header-only for new vendors
      if (process.env.AUTH_DEMO_MODE !== "false") {
        await ensureDemoOrders(vendor.id);
      }

      const range = parseDateRange(req.query.from, req.query.to);
      if ("error" in range) {
        res.status(400).json({ error: range.error });
        return;
      }

      const format = String(req.query.format ?? "csv").toLowerCase();
      if (format !== "csv") {
        res.status(400).json({
          error: "Only format=csv is available in this build step. PDF comes next.",
        });
        return;
      }

      const rows = await loadIncomeRows(
        vendor.id,
        range.fromStart,
        range.toEnd
      );

      const filename = `income-report-${range.fromLabel}-${range.toLabel}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Empty range → valid header-only CSV (not an error)
      if (rows.length === 0) {
        const parser = new Parser({ fields: [...INCOME_FIELDS] });
        res.status(200).send(parser.parse([]));
        return;
      }

      const transform = new Transform(
        { fields: [...INCOME_FIELDS] },
        { objectMode: true }
      );
      await pipeline(Readable.from(rows), transform, res);
    } catch (err) {
      console.error("GET /vendor/reports/income", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate income report" });
      }
    }
  }
);

export default router;
