import bcrypt from "bcryptjs";
import {
  DecayCurve,
  PrismaClient,
  PreferredLang,
  Role,
  Unit,
} from "@prisma/client";

const prisma = new PrismaClient();

/** Tamil Nadu — Chennai / nearby hyperlocal cluster (km-scale) */
const VENDORS = [
  {
    email: "ravi@greengrocer.local",
    name: "Ravi Kumar",
    storeName: "Ravi’s Green Grocer",
    lat: 13.0827,
    lng: 80.2707,
    verified: true,
  },
  {
    email: "meera@bakery.local",
    name: "Meera Selvam",
    storeName: "Meera’s Neighborhood Pantry",
    lat: 13.0500,
    lng: 80.2480,
    verified: true,
  },
  {
    email: "omar@spicebazaar.local",
    name: "Omar Hussain",
    storeName: "Omar Fresh Mart",
    lat: 13.0680,
    lng: 80.2550,
    verified: true,
  },
  {
    email: "lakshmi@thottam.local",
    name: "Lakshmi Devi",
    storeName: "Lakshmi Thottam Stall",
    lat: 13.0900,
    lng: 80.2800,
    verified: false,
  },
] as const;

type CatalogSeed = {
  name: string;
  category: string;
  unit: Unit;
  imageUrl: string;
  shelfLifeDays: number;
  decayCurveType: DecayCurve;
};

const CATALOG: CatalogSeed[] = [
  {
    name: "Tomato (நாட்டு தக்காளி)",
    category: "Vegetables",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1546470427-227c7369a0e0?w=600&q=80",
    shelfLifeDays: 5,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Onion (வெங்காயம்)",
    category: "Vegetables",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1518977956812-cd3d11ea5d83?w=600&q=80",
    shelfLifeDays: 21,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Potato (உருளைக்கிழங்கு)",
    category: "Vegetables",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
    shelfLifeDays: 30,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Carrot (கேரட்)",
    category: "Vegetables",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&q=80",
    shelfLifeDays: 14,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Spinach / Keerai (கீரை)",
    category: "Vegetables",
    unit: Unit.piece,
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80",
    shelfLifeDays: 3,
    decayCurveType: DecayCurve.FAST_EARLY,
  },
  {
    name: "Banana (நேந்திரம் / பழம்)",
    category: "Fruits",
    unit: Unit.dozen,
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
    shelfLifeDays: 5,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Mango — Alphonso (மாம்பழம்)",
    category: "Fruits",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80",
    shelfLifeDays: 7,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Apple (ஆப்பிள்)",
    category: "Fruits",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80",
    shelfLifeDays: 14,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Papaya (பப்பாளி)",
    category: "Fruits",
    unit: Unit.piece,
    imageUrl: "https://images.unsplash.com/photo-1617112848923-cc2234396a8d?w=600&q=80",
    shelfLifeDays: 6,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Coconut (தேங்காய்)",
    category: "Fruits",
    unit: Unit.piece,
    imageUrl: "https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?w=600&q=80",
    shelfLifeDays: 10,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Rice — Ponni (பொன்னி அரிசி)",
    category: "Grocery",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
    shelfLifeDays: 180,
    decayCurveType: DecayCurve.SLOW,
  },
  {
    name: "Toor Dal (துவரம் பருப்பு)",
    category: "Grocery",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1585995955121-3f2a4f0b8f7b?w=600&q=80",
    shelfLifeDays: 180,
    decayCurveType: DecayCurve.SLOW,
  },
  {
    name: "Coconut Oil (தேங்காய் எண்ணெய்)",
    category: "Grocery",
    unit: Unit.litre,
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7ea33263c8b8?w=600&q=80",
    shelfLifeDays: 365,
    decayCurveType: DecayCurve.SLOW,
  },
  {
    name: "Idli Batter (இட்லி மாவு)",
    category: "Grocery",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
    shelfLifeDays: 3,
    decayCurveType: DecayCurve.FAST_EARLY,
  },
  {
    name: "Milk — Aavin style (பால்)",
    category: "Grocery",
    unit: Unit.litre,
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80",
    shelfLifeDays: 3,
    decayCurveType: DecayCurve.FAST_EARLY,
  },
  {
    name: "Eggs (முட்டை)",
    category: "Grocery",
    unit: Unit.dozen,
    imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80",
    shelfLifeDays: 21,
    decayCurveType: DecayCurve.LINEAR,
  },
  {
    name: "Coriander Leaves (கொத்தமல்லி)",
    category: "Vegetables",
    unit: Unit.piece,
    imageUrl: "https://images.unsplash.com/photo-1618375569901-8cdcb914e847?w=600&q=80",
    shelfLifeDays: 3,
    decayCurveType: DecayCurve.FAST_EARLY,
  },
  {
    name: "Green Chilli (பச்சை மிளகாய்)",
    category: "Vegetables",
    unit: Unit.kg,
    imageUrl: "https://images.unsplash.com/photo-1583663848850-46af132dc08e?w=600&q=80",
    shelfLifeDays: 7,
    decayCurveType: DecayCurve.LINEAR,
  },
];

async function main() {
  console.log("Resetting…");
  await prisma.orderItem.deleteMany();
  await prisma.vendorOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.catalog.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const customer = await prisma.user.create({
    data: {
      name: "Aisha Rahman",
      email: "aisha@example.com",
      passwordHash,
      role: Role.customer,
      lat: 13.0600,
      lng: 80.2500,
      preferredLang: PreferredLang.en,
    },
  });

  const vendorRows = [];
  for (const v of VENDORS) {
    const user = await prisma.user.create({
      data: {
        name: v.name,
        email: v.email,
        passwordHash,
        role: Role.vendor,
        lat: v.lat,
        lng: v.lng,
        preferredLang: PreferredLang.ta,
        vendor: {
          create: {
            storeName: v.storeName,
            lat: v.lat,
            lng: v.lng,
            verified: v.verified,
          },
        },
      },
      include: { vendor: true },
    });
    vendorRows.push(user.vendor!);
  }

  // Fix spinach unit — use piece
  const catalogData = CATALOG;

  const catalogs = [];
  for (const c of catalogData) {
    catalogs.push(
      await prisma.catalog.create({
        data: {
          name: c.name,
          category: c.category,
          unit: c.unit,
          imageUrl: c.imageUrl,
          shelfLifeDays: c.shelfLifeDays,
          decayCurveType: c.decayCurveType,
        },
      })
    );
  }

  // Price/stock variation across vendors so distance+price comparison is meaningful
  const listings = [];
  for (let i = 0; i < catalogs.length; i++) {
    const catalog = catalogs[i];
    const basePrice =
      catalog.category === "Fruits"
        ? 80 + (i % 5) * 15
        : catalog.category === "Grocery"
          ? 60 + (i % 4) * 20
          : 30 + (i % 6) * 8;

    for (let vi = 0; vi < vendorRows.length; vi++) {
      // Not every vendor stocks every item
      if (vi === 3 && i % 3 === 0) continue;
      if (vi === 1 && i % 5 === 0) continue;

      const priceJitter = (vi - 1.5) * (basePrice * 0.08);
      const price = Math.round((basePrice + priceJitter) * 100) / 100;
      const competitorRefPrice =
        Math.round((basePrice + basePrice * 0.05) * 100) / 100;
      const stock = 8 + ((i * 3 + vi * 7) % 40);

      const listedAt = new Date(Date.now() - vi * 36e5 - i * 864e5 * 0.3);
      // Stagger last check so curve shapes are visible in demo (quality = 1.0)
      const curve = catalog.decayCurveType;
      const daysAgoCheck =
        curve === DecayCurve.FAST_EARLY
          ? 2 + (i % 3) // 2–4 days → leafy drops hard
          : curve === DecayCurve.SLOW
            ? 5 + (i % 4) // 5–8 days → still high %
            : 3 + (i % 5); // 3–7 days → linear mid-range
      const lastCheckedAt = new Date(
        Date.now() - daysAgoCheck * 864e5 - vi * 12e5
      );

      listings.push(
        await prisma.listing.create({
          data: {
            vendorId: vendorRows[vi].id,
            catalogId: catalog.id,
            price,
            competitorRefPrice,
            stock,
            lowStockThreshold: stock < 12 ? 8 : 5,
            listedAt,
            lastCheckedAt,
            intakeQualityScore: 1.0,
            lastCheckQualityScore: 1.0,
          },
        })
      );
    }
  }

  // Historical orders for forecast (non-trivial)
  const buyable = listings.filter((l) => l.stock > 5);
  for (let d = 14; d >= 1; d--) {
    const picks = buyable.slice((d * 2) % Math.max(1, buyable.length - 3), ((d * 2) % Math.max(1, buyable.length - 3)) + 3);
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
        status: "COMPLETED" as const,
        paymentStatus: "COD_COLLECTED" as const,
        items: { create: items },
      };
    });

    const totalAmount = vendorCreates.reduce((s, v) => s + v.subtotal, 0);

    await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paymentMethod: "COD",
        createdAt: new Date(Date.now() - d * 864e5),
        vendorOrders: { create: vendorCreates },
      },
    });
  }

  console.log("Seeded:");
  console.log(`  users: 1 customer + ${VENDORS.length} vendors`);
  console.log(`  catalog: ${catalogs.length}`);
  console.log(`  listings: ${listings.length}`);
  console.log("  password for all demo accounts: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
