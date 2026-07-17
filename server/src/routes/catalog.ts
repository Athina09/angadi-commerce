import { Router } from "express";
import { Prisma, Unit } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { haversineKm, parseCoord } from "../lib/geo.js";
import { computeFreshness } from "../lib/freshness.js";

const router = Router();

function stockLabel(totalStock: number, shopCount: number) {
  if (shopCount === 0 || totalStock <= 0) {
    return { key: "out" as const, text: "Out of stock" };
  }
  if (totalStock <= 8 || shopCount === 1) {
    return { key: "low" as const, text: "Low stock near you" };
  }
  return { key: "available" as const, text: "Available near you" };
}

/** Public catalog browse — live listings aggregate (no mock data) */
router.get("/", async (req, res) => {
  try {
    const category =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    const radiusKm = Math.min(
      50,
      Math.max(1, Number(req.query.radiusKm) || 12)
    );
    const nearMe = lat != null && lng != null;

    const where: Prisma.CatalogWhereInput = {};
    if (category && category.toLowerCase() !== "all") {
      where.category = { equals: category, mode: "insensitive" };
    }
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const items = await prisma.catalog.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        listings: {
          include: {
            vendor: {
              select: { id: true, storeName: true, lat: true, lng: true },
            },
          },
        },
      },
    });

    const categories = await prisma.catalog.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    const catalog = items.map((c) => {
      const scored = c.listings.map((l) => {
        const distanceKm =
          nearMe && l.vendor
            ? haversineKm(lat!, lng!, l.vendor.lat, l.vendor.lng)
            : null;
        return { ...l, distanceKm };
      });

      const nearby = nearMe
        ? scored.filter(
            (l) => l.distanceKm != null && l.distanceKm <= radiusKm
          )
        : scored;

      const pool = nearby.length > 0 ? nearby : scored;
      const inStock = pool.filter((l) => l.stock > 0);
      const totalStock = inStock.reduce((s, l) => s + l.stock, 0);
      const lowest = [...inStock].sort((a, b) => a.price - b.price)[0];
      const shopCount = inStock.length;
      const stock = stockLabel(totalStock, shopCount);

      const freshnessPool = (inStock.length > 0 ? inStock : pool).map((l) =>
        computeFreshness({
          shelfLifeDays: c.shelfLifeDays,
          decayCurveType: c.decayCurveType,
          lastCheckedAt: l.lastCheckedAt,
          lastCheckQualityScore: l.lastCheckQualityScore,
        })
      );
      const worstFresh = freshnessPool.length
        ? [...freshnessPool].sort((a, b) => a.percent - b.percent)[0]
        : null;
      const bestFresh = freshnessPool.length
        ? [...freshnessPool].sort((a, b) => b.percent - a.percent)[0]
        : null;

      return {
        id: c.id,
        name: c.name,
        category: c.category,
        unit: c.unit,
        imageUrl: c.imageUrl,
        shelfLifeDays: c.shelfLifeDays,
        decayCurveType: c.decayCurveType,
        createdAt: c.createdAt,
        listingCount: c.listings.length,
        shopCount,
        totalStock,
        lowestPrice: lowest?.price ?? null,
        stockStatus: stock.key,
        stockLabel: stock.text,
        nearestDistanceKm:
          nearMe && inStock.length
            ? Math.min(
                ...inStock.map((l) => l.distanceKm ?? Number.POSITIVE_INFINITY)
              )
            : null,
        bestVendor: lowest
          ? {
              id: lowest.vendor.id,
              storeName: lowest.vendor.storeName,
            }
          : null,
        freshness: worstFresh
          ? {
              percent: worstFresh.percent,
              band: worstFresh.band,
              text: worstFresh.text,
              daysLeft: worstFresh.daysLeft,
              daysSurviveText: worstFresh.daysSurviveText,
              bestPercent: bestFresh?.percent ?? worstFresh.percent,
            }
          : null,
      };
    });

    res.json({
      catalog,
      categories: categories.map((c) => c.category).filter(Boolean),
      nearMe,
      radiusKm,
    });
  } catch (err) {
    console.error("GET /catalog", err);
    res.status(500).json({ error: "Failed to load catalog" });
  }
});

/**
 * Every vendor listing for a catalog item, sorted by distance or price.
 * GET /catalog/:id/listings?lat=&lng=&radiusKm=&sort=distance|price
 */
router.get("/:id/listings", async (req, res) => {
  try {
    const id = String(req.params.id);
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    const radiusKm = Math.min(
      80,
      Math.max(1, Number(req.query.radiusKm) || 25)
    );
    const sort =
      req.query.sort === "price" ? ("price" as const) : ("distance" as const);
    const nearMe = lat != null && lng != null;

    const catalog = await prisma.catalog.findUnique({ where: { id } });
    if (!catalog) {
      res.status(404).json({ error: "Catalog item not found" });
      return;
    }

    const rows = await prisma.listing.findMany({
      where: { catalogId: id },
      include: {
        vendor: {
          select: {
            id: true,
            storeName: true,
            lat: true,
            lng: true,
            verified: true,
          },
        },
      },
    });

    const marketAvg =
      rows.length > 0
        ? rows.reduce((s, l) => s + l.competitorRefPrice, 0) / rows.length
        : 0;

    let listings = rows.map((l) => {
      const distanceKm =
        nearMe && l.vendor
          ? Math.round(
              haversineKm(lat!, lng!, l.vendor.lat, l.vendor.lng) * 100
            ) / 100
          : null;
      const freshness = computeFreshness({
        shelfLifeDays: catalog.shelfLifeDays,
        decayCurveType: catalog.decayCurveType,
        lastCheckedAt: l.lastCheckedAt,
        lastCheckQualityScore: l.lastCheckQualityScore,
      });
      const priceDeltaPct =
        marketAvg > 0
          ? Math.round(((l.price - marketAvg) / marketAvg) * 1000) / 10
          : 0;

      return {
        id: l.id,
        catalogId: l.catalogId,
        vendorId: l.vendorId,
        price: l.price,
        competitorRefPrice: l.competitorRefPrice,
        stock: l.stock,
        lowStockThreshold: l.lowStockThreshold,
        listedAt: l.listedAt,
        lastCheckedAt: l.lastCheckedAt,
        lastCheckQualityScore: l.lastCheckQualityScore,
        distanceKm,
        priceDeltaPct,
        freshness,
        vendor: l.vendor,
      };
    });

    if (nearMe) {
      const inRadius = listings.filter(
        (l) => l.distanceKm != null && l.distanceKm <= radiusKm
      );
      // Prefer in-radius; if none, still return all so empty-state CTA can show
      if (inRadius.length > 0) listings = inRadius;
    }

    listings.sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      const da = a.distanceKm ?? 9999;
      const db = b.distanceKm ?? 9999;
      if (da !== db) return da - db;
      return a.price - b.price;
    });

    res.json({
      catalog: {
        id: catalog.id,
        name: catalog.name,
        category: catalog.category,
        unit: catalog.unit,
        imageUrl: catalog.imageUrl,
        shelfLifeDays: catalog.shelfLifeDays,
        decayCurveType: catalog.decayCurveType,
      },
      listings,
      sort,
      nearMe,
      radiusKm,
      marketAvg: Math.round(marketAvg * 100) / 100,
    });
  } catch (err) {
    console.error("GET /catalog/:id/listings", err);
    res.status(500).json({ error: "Failed to load listings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.catalog.findUnique({
      where: { id: req.params.id },
    });
    if (!item) {
      res.status(404).json({ error: "Catalog item not found" });
      return;
    }
    res.json({ catalog: item });
  } catch (err) {
    console.error("GET /catalog/:id", err);
    res.status(500).json({ error: "Failed to load catalog item" });
  }
});

export const catalogUnits = Object.values(Unit);

export default router;
