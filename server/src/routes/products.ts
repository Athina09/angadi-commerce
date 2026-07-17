/**
 * Temporary compatibility shim.
 * Next build step replaces this with GET /catalog and GET /catalog/:id/listings.
 * Maps Catalog → a product-shaped payload so the existing shop UI does not crash.
 */
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { computeFreshness } from "../lib/freshness.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const category =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

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
        _count: {
          select: { listings: true },
        },
        listings: {
          where: { stock: { gt: 0 } },
          orderBy: { price: "asc" },
          take: 1,
          include: {
            vendor: {
              select: { id: true, storeName: true, lat: true, lng: true },
            },
          },
        },
      },
    });

    const products = items.map((c) => {
      const best = c.listings[0];
      return {
        id: c.id,
        name: c.name,
        description: `${c.category} · sold by ${c._count.listings} shop(s)`,
        price: best?.price ?? 0,
        stock: best?.stock ?? 0,
        category: c.category,
        imageUrl: c.imageUrl,
        createdAt: c.createdAt,
        vendorId: best?.vendorId ?? null,
        vendor: best?.vendor ?? {
          id: "unlisted",
          storeName: "Multiple shops",
          lat: undefined,
          lng: undefined,
        },
        unit: c.unit,
        shelfLifeDays: c.shelfLifeDays,
        decayCurveType: c.decayCurveType,
        listingCount: c._count.listings,
        freshness: best
          ? computeFreshness({
              shelfLifeDays: c.shelfLifeDays,
              decayCurveType: c.decayCurveType,
              lastCheckedAt: best.lastCheckedAt,
              lastCheckQualityScore: best.lastCheckQualityScore,
            })
          : null,
        _note: "catalog-shim — use /catalog/:id/listings in next step",
      };
    });

    const categories = Array.from(
      new Set(items.map((c) => c.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    res.json({ products, categories });
  } catch (err) {
    console.error("GET /products", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.catalog.findUnique({
      where: { id: req.params.id },
      include: {
        listings: {
          where: { stock: { gt: 0 } },
          orderBy: { price: "asc" },
          include: {
            vendor: {
              select: { id: true, storeName: true, lat: true, lng: true, verified: true },
            },
          },
        },
      },
    });
    if (!item) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const best = item.listings[0];
    res.json({
      product: {
        id: item.id,
        name: item.name,
        description: `${item.category} · ${item.listings.length} shops`,
        price: best?.price ?? 0,
        stock: best?.stock ?? 0,
        category: item.category,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        vendorId: best?.vendorId ?? null,
        vendor: best?.vendor ?? null,
        unit: item.unit,
        shelfLifeDays: item.shelfLifeDays,
        decayCurveType: item.decayCurveType,
        listings: item.listings.map((l) => ({
          ...l,
          freshness: computeFreshness({
            shelfLifeDays: item.shelfLifeDays,
            decayCurveType: item.decayCurveType,
            lastCheckedAt: l.lastCheckedAt,
            lastCheckQualityScore: l.lastCheckQualityScore,
          }),
        })),
        freshness: best
          ? computeFreshness({
              shelfLifeDays: item.shelfLifeDays,
              decayCurveType: item.decayCurveType,
              lastCheckedAt: best.lastCheckedAt,
              lastCheckQualityScore: best.lastCheckQualityScore,
            })
          : null,
      },
    });
  } catch (err) {
    console.error("GET /products/:id", err);
    res.status(500).json({ error: "Failed to load product" });
  }
});

export default router;
