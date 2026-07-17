export type DateRange = "today" | "7d" | "30d";

export type HeatWeight = "density" | "orders" | "price";

export type Competitor = {
  id: string;
  storeName: string;
  lat: number;
  lng: number;
  categories: string[];
  categoryOverlapPct: number;
  avgPrice: number;
  distanceKm: number;
  orderVolume: number;
  /** positive = you're cheaper; negative = you're pricier */
  priceDeltaPct: number;
};

export type LiveProduct = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  stock: number;
  price: number;
  unitsSold: number;
  revenue: number;
  revenueChangePct: number;
  liveViewers: number;
  viewsChangePct: number;
  conversionPct: number;
  conversionTrend: number[];
  freshnessPercent?: number;
  freshnessBand?: string;
  freshnessText?: string;
  daysLeft?: number;
  daysSurviveText?: string;
};

export type ActivityEvent = {
  id: string;
  type: "viewing" | "cart" | "order" | "wishlist" | "inventory";
  message: string;
  at: string;
};

export type AiRecommendation = {
  id: string;
  icon: "price" | "restock" | "bundle" | "timing";
  text: string;
};

/** Nearby sellers' overlapping bakery SKUs for competitive intel */
export type CompetitorProduct = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  sellerName: string;
  price: number;
  yourPrice: number | null;
  stockLabel: "In stock" | "Low stock" | "Out of stock";
  distanceKm: number;
  priceDeltaPct: number;
};

export type SalesDay = {
  date: string;
  revenue: number;
  orders: number;
};

export type TopProduct = {
  id: string;
  name: string;
  revenue: number;
  sparkline: number[];
};

export type DashboardMock = {
  storeName: string;
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
  insight: {
    competitorCount: number;
    priceVsMarketPct: number;
  };
  products: LiveProduct[];
  competitorProducts: CompetitorProduct[];
  activity: ActivityEvent[];
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

/** Meera's Neighborhood Bakery — own SKUs + nearby competitor bakery goods */
export const MOCK_DASHBOARD: DashboardMock = {
  storeName: "Meera's Neighborhood Bakery",
  vendorLat: 28.6129,
  vendorLng: 77.2295,
  radiusKm: 3,
  kpis: {
    revenue: 38420,
    revenueChangePct: 9.6,
    ordersCompleted: 54,
    activeProductViews: 11,
    lowStockAlerts: 1,
  },
  competitors: [
    {
      id: "c1",
      storeName: "Crust & Crumb",
      lat: 28.618,
      lng: 77.235,
      categories: ["Bakery"],
      categoryOverlapPct: 80,
      avgPrice: 165,
      distanceKm: 0.7,
      orderVolume: 140,
      priceDeltaPct: 6,
    },
    {
      id: "c2",
      storeName: "Oven Door Café",
      lat: 28.608,
      lng: 77.222,
      categories: ["Bakery", "Beverages"],
      categoryOverlapPct: 65,
      avgPrice: 195,
      distanceKm: 0.9,
      orderVolume: 98,
      priceDeltaPct: -4,
    },
    {
      id: "c3",
      storeName: "Flour & Fire",
      lat: 28.62,
      lng: 77.24,
      categories: ["Bakery"],
      categoryOverlapPct: 70,
      avgPrice: 150,
      distanceKm: 1.3,
      orderVolume: 112,
      priceDeltaPct: 11,
    },
    {
      id: "c4",
      storeName: "Daily Bread Co.",
      lat: 28.605,
      lng: 77.218,
      categories: ["Bakery", "Pantry"],
      categoryOverlapPct: 55,
      avgPrice: 175,
      distanceKm: 1.1,
      orderVolume: 86,
      priceDeltaPct: 2,
    },
    {
      id: "c5",
      storeName: "Ravi's Green Grocer",
      lat: 28.6139,
      lng: 77.209,
      categories: ["Produce", "Beverages"],
      categoryOverlapPct: 15,
      avgPrice: 90,
      distanceKm: 2.0,
      orderVolume: 210,
      priceDeltaPct: 0,
    },
    {
      id: "c6",
      storeName: "Sweet Rise Bakery",
      lat: 28.625,
      lng: 77.228,
      categories: ["Bakery"],
      categoryOverlapPct: 75,
      avgPrice: 160,
      distanceKm: 1.5,
      orderVolume: 74,
      priceDeltaPct: 8,
    },
  ],
  insight: {
    competitorCount: 6,
    priceVsMarketPct: -3.1,
  },
  /** Meera's products only */
  products: [
    {
      id: "m1",
      name: "Sourdough Loaf",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&h=80&fit=crop",
      stock: 25,
      price: 180,
      unitsSold: 42,
      revenue: 7560,
      revenueChangePct: 11.5,
      liveViewers: 3,
      viewsChangePct: 8,
      conversionPct: 22.1,
      conversionTrend: [16, 18, 19, 20, 21, 22, 22.1],
    },
    {
      id: "m2",
      name: "Butter Croissants (pack of 4)",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=80&h=80&fit=crop",
      stock: 30,
      price: 220,
      unitsSold: 36,
      revenue: 7920,
      revenueChangePct: 11.5,
      liveViewers: 4,
      viewsChangePct: 8,
      conversionPct: 19.4,
      conversionTrend: [15, 16, 17, 18, 18, 19, 19.4],
    },
    {
      id: "m3",
      name: "Chocolate Chip Cookies (6)",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=80&h=80&fit=crop",
      stock: 40,
      price: 150,
      unitsSold: 58,
      revenue: 8700,
      revenueChangePct: 11.5,
      liveViewers: 2,
      viewsChangePct: 8,
      conversionPct: 26.0,
      conversionTrend: [20, 21, 22, 24, 25, 25, 26],
    },
    {
      id: "m4",
      name: "Multigrain Sandwich Bread",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=80&h=80&fit=crop",
      stock: 45,
      price: 95,
      unitsSold: 61,
      revenue: 5795,
      revenueChangePct: 11.5,
      liveViewers: 1,
      viewsChangePct: 8,
      conversionPct: 18.2,
      conversionTrend: [14, 15, 16, 17, 17, 18, 18.2],
    },
    {
      id: "m5",
      name: "Masala Chai Cookies (8)",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=80&h=80&fit=crop",
      stock: 2,
      price: 130,
      unitsSold: 29,
      revenue: 3770,
      revenueChangePct: 11.5,
      liveViewers: 1,
      viewsChangePct: 8,
      conversionPct: 14.8,
      conversionTrend: [12, 12, 13, 14, 14, 14, 14.8],
    },
  ],
  competitorProducts: [
    {
      id: "cp1",
      name: "Country Sourdough",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&h=80&fit=crop",
      sellerName: "Crust & Crumb",
      price: 195,
      yourPrice: 180,
      stockLabel: "In stock",
      distanceKm: 0.7,
      priceDeltaPct: 8,
    },
    {
      id: "cp2",
      name: "Butter Croissants (4)",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=80&h=80&fit=crop",
      sellerName: "Oven Door Café",
      price: 240,
      yourPrice: 220,
      stockLabel: "In stock",
      distanceKm: 0.9,
      priceDeltaPct: 9,
    },
    {
      id: "cp3",
      name: "Dark Chocolate Cookies",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=80&h=80&fit=crop",
      sellerName: "Sweet Rise Bakery",
      price: 140,
      yourPrice: 150,
      stockLabel: "Low stock",
      distanceKm: 1.5,
      priceDeltaPct: -7,
    },
    {
      id: "cp4",
      name: "Seeded Sandwich Loaf",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=80&h=80&fit=crop",
      sellerName: "Daily Bread Co.",
      price: 110,
      yourPrice: 95,
      stockLabel: "In stock",
      distanceKm: 1.1,
      priceDeltaPct: 16,
    },
    {
      id: "cp5",
      name: "Cardamom Biscuits (8)",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=80&h=80&fit=crop",
      sellerName: "Flour & Fire",
      price: 125,
      yourPrice: 130,
      stockLabel: "In stock",
      distanceKm: 1.3,
      priceDeltaPct: -4,
    },
    {
      id: "cp6",
      name: "Brioche Rolls (6)",
      category: "Bakery",
      imageUrl:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&h=80&fit=crop",
      sellerName: "Crust & Crumb",
      price: 210,
      yourPrice: null,
      stockLabel: "Out of stock",
      distanceKm: 0.7,
      priceDeltaPct: 0,
    },
  ],
  activity: [
    {
      id: "a1",
      type: "viewing",
      message: "4 people viewing Butter Croissants",
      at: "Just now",
    },
    {
      id: "a2",
      type: "cart",
      message: "Customer added Sourdough Loaf to cart",
      at: "18s ago",
    },
    {
      id: "a3",
      type: "order",
      message: "Order placed: ₹370",
      at: "1m ago",
    },
    {
      id: "a4",
      type: "viewing",
      message: "3 people viewing Chocolate Chip Cookies",
      at: "2m ago",
    },
    {
      id: "a5",
      type: "cart",
      message: "Customer added Masala Chai Cookies to cart",
      at: "3m ago",
    },
    {
      id: "a6",
      type: "order",
      message: "Order placed: ₹220",
      at: "5m ago",
    },
    {
      id: "a7",
      type: "viewing",
      message: "2 people viewing Multigrain Sandwich Bread",
      at: "6m ago",
    },
    {
      id: "a8",
      type: "order",
      message: "Order placed: ₹150",
      at: "8m ago",
    },
    {
      id: "a9",
      type: "wishlist",
      message: "Product added to wishlist — Chocolate Chip Cookies",
      at: "just now",
    },
    {
      id: "a10",
      type: "inventory",
      message: "Inventory updated — Multigrain Sandwich Bread",
      at: "1m ago",
    },
  ],
  salesTrend: [
    { date: "Mon", revenue: 4800, orders: 8 },
    { date: "Tue", revenue: 5200, orders: 9 },
    { date: "Wed", revenue: 4550, orders: 7 },
    { date: "Thu", revenue: 6100, orders: 11 },
    { date: "Fri", revenue: 7400, orders: 13 },
    { date: "Sat", revenue: 6800, orders: 12 },
    { date: "Sun", revenue: 3570, orders: 6 },
  ],
  topProducts: [
    {
      id: "m3",
      name: "Chocolate Chip Cookies",
      revenue: 8700,
      sparkline: [900, 1100, 1200, 1400, 1300, 1500, 1300],
    },
    {
      id: "m2",
      name: "Butter Croissants",
      revenue: 7920,
      sparkline: [800, 900, 1100, 1200, 1300, 1400, 1220],
    },
    {
      id: "m1",
      name: "Sourdough Loaf",
      revenue: 7560,
      sparkline: [700, 900, 1000, 1100, 1200, 1300, 1260],
    },
    {
      id: "m4",
      name: "Multigrain Bread",
      revenue: 5795,
      sparkline: [600, 700, 800, 850, 900, 950, 995],
    },
    {
      id: "m5",
      name: "Masala Chai Cookies",
      revenue: 3770,
      sparkline: [400, 450, 500, 550, 600, 650, 620],
    },
  ],
  quickInsights: {
    conversionToday: 24,
    avgBasket: 382,
    mostPopular: "Chocolate Chip Cookies (6)",
    returningPct: 62,
  },
  aiRecommendations: [
    {
      id: "ai1",
      icon: "price",
      text: "Increase Chocolate Chip Cookies by ₹10 to match demand.",
    },
    {
      id: "ai2",
      icon: "restock",
      text: "Restock Butter Croissants within 2 hours.",
    },
    {
      id: "ai3",
      icon: "bundle",
      text: "Bundle Sourdough with Multigrain Bread to lift average order value.",
    },
    {
      id: "ai4",
      icon: "timing",
      text: "Best time to promote bakery products today: 5 PM–7 PM.",
    },
  ],
};
