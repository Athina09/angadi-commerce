export type AdminRegion =
  | "All regions"
  | "Bengaluru"
  | "Chennai"
  | "Mumbai"
  | "Delhi"
  | "Hyderabad";

export type AdminRisk = "LOW" | "MEDIUM" | "HIGH";
export type AdminStatus = "EXCELLENT" | "GOOD" | "WATCH" | "PENDING";

export type AdminKpi = {
  id: string;
  label: string;
  /** Numeric value used for live polling animation */
  numericValue: number;
  format: "decimal1" | "int" | "pct";
  subtext: string;
  trendPct: number | null;
  sparkline: number[];
  icon: "score" | "orders" | "ai" | "disputes" | "vendors" | "campaigns";
};

export type HeatMarker = {
  id: string;
  city: string;
  region: Exclude<AdminRegion, "All regions">;
  lat: number;
  lng: number;
  priority: "high" | "medium" | "normal";
  vendorCount: number;
  orderVolume: number;
  label?: string;
};

export type LiveInsight = {
  id: string;
  message: string;
  at: string;
  kind: "order" | "stock" | "price" | "delivery" | "onboard" | "dispute";
};

export type AdminSellerRow = {
  id: string;
  name: string;
  region: Exclude<AdminRegion, "All regions">;
  category: string;
  score: number;
  riskMetric: number;
  fulfillmentPct: number;
  qualityPct: number;
  aiConfidence: number;
  risk: AdminRisk;
  status: AdminStatus;
};

export type AdminDashboardMock = {
  productName: string;
  adminName: string;
  kpis: AdminKpi[];
  heatMarkers: HeatMarker[];
  liveInsights: LiveInsight[];
  sellers: AdminSellerRow[];
};

export const ADMIN_REGIONS: AdminRegion[] = [
  "All regions",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Hyderabad",
];

export const ADMIN_RISKS = ["All risk levels", "LOW", "MEDIUM", "HIGH"] as const;

export const MOCK_ADMIN_DASHBOARD: AdminDashboardMock = {
  productName: "NextGen",
  adminName: "Priya Sharma",
  kpis: [
    {
      id: "score",
      label: "Overall marketplace score",
      numericValue: 86.4,
      format: "decimal1",
      subtext: "Excellent",
      trendPct: 3.2,
      sparkline: [72, 74, 76, 78, 80, 82, 84, 85, 86, 86.4],
      icon: "score",
    },
    {
      id: "orders",
      label: "Active orders",
      numericValue: 1248,
      format: "int",
      subtext: "across 5 regions",
      trendPct: -4.1,
      sparkline: [980, 1020, 1100, 1180, 1320, 1290, 1248],
      icon: "orders",
    },
    {
      id: "ai",
      label: "AI fraud / quality conf.",
      numericValue: 92,
      format: "pct",
      subtext: "Verified signals",
      trendPct: 1.4,
      sparkline: [88, 89, 90, 90, 91, 91, 92],
      icon: "ai",
    },
    {
      id: "disputes",
      label: "Compliance issues",
      numericValue: 17,
      format: "int",
      subtext: "4 critical · 2 overdue",
      trendPct: -12.5,
      sparkline: [28, 24, 22, 20, 19, 18, 17],
      icon: "disputes",
    },
    {
      id: "participation",
      label: "Seller participation rate",
      numericValue: 78.6,
      format: "decimal1",
      subtext: "142 active sellers",
      trendPct: 6.8,
      sparkline: [68, 70, 72, 74, 75, 77, 78.6],
      icon: "vendors",
    },
    {
      id: "campaigns",
      label: "Active promotions",
      numericValue: 9,
      format: "int",
      subtext: "3 ending soon",
      trendPct: 2.1,
      sparkline: [4, 5, 6, 7, 8, 8, 9],
      icon: "campaigns",
    },
  ],
  heatMarkers: [
    {
      id: "blr-core",
      city: "Bengaluru",
      region: "Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      priority: "high",
      vendorCount: 48,
      orderVolume: 4200,
      label: "Koramangala",
    },
    {
      id: "blr-ind",
      city: "Bengaluru",
      region: "Bengaluru",
      lat: 12.9784,
      lng: 77.6408,
      priority: "medium",
      vendorCount: 22,
      orderVolume: 1800,
      label: "Indiranagar",
    },
    {
      id: "chn",
      city: "Chennai",
      region: "Chennai",
      lat: 13.0827,
      lng: 80.2707,
      priority: "medium",
      vendorCount: 31,
      orderVolume: 2100,
      label: "T. Nagar",
    },
    {
      id: "chn-ady",
      city: "Chennai",
      region: "Chennai",
      lat: 13.0067,
      lng: 80.2206,
      priority: "normal",
      vendorCount: 14,
      orderVolume: 720,
      label: "Adyar",
    },
    {
      id: "mum",
      city: "Mumbai",
      region: "Mumbai",
      lat: 19.076,
      lng: 72.8777,
      priority: "high",
      vendorCount: 39,
      orderVolume: 3800,
      label: "Bandra",
    },
    {
      id: "mum-and",
      city: "Mumbai",
      region: "Mumbai",
      lat: 19.1197,
      lng: 72.8464,
      priority: "medium",
      vendorCount: 18,
      orderVolume: 1100,
      label: "Andheri",
    },
    {
      id: "del",
      city: "Delhi",
      region: "Delhi",
      lat: 28.6139,
      lng: 77.209,
      priority: "normal",
      vendorCount: 22,
      orderVolume: 1400,
      label: "Connaught Pl",
    },
    {
      id: "hyd",
      city: "Hyderabad",
      region: "Hyderabad",
      lat: 17.385,
      lng: 78.4867,
      priority: "medium",
      vendorCount: 18,
      orderVolume: 980,
      label: "Hitech City",
    },
  ],
  liveInsights: [
    {
      id: "e1",
      message: "New order placed — Zone 4",
      at: "just now",
      kind: "order",
    },
    {
      id: "e2",
      message: "Seller stock updated — Fresh Produce Co.",
      at: "45s ago",
      kind: "stock",
    },
    {
      id: "e3",
      message: "Price change detected — Stationery category",
      at: "2m ago",
      kind: "price",
    },
    {
      id: "e4",
      message: "Delivery delayed — Route 12",
      at: "4m ago",
      kind: "delivery",
    },
    {
      id: "e5",
      message: "New seller onboarded — verification pending",
      at: "6m ago",
      kind: "onboard",
    },
    {
      id: "e6",
      message: "Dispute opened — Vendor #214 payout",
      at: "9m ago",
      kind: "dispute",
    },
    {
      id: "e7",
      message: "SLA breach cleared — Zone 3 South",
      at: "12m ago",
      kind: "delivery",
    },
  ],
  sellers: [
    {
      id: "s1",
      name: "Meera’s Neighborhood Bakery",
      region: "Chennai",
      category: "Bakery",
      score: 94,
      riskMetric: 12,
      fulfillmentPct: 98.2,
      qualityPct: 96.5,
      aiConfidence: 96,
      risk: "LOW",
      status: "EXCELLENT",
    },
    {
      id: "s2",
      name: "Ravi’s Green Grocer",
      region: "Chennai",
      category: "Produce",
      score: 88,
      riskMetric: 18,
      fulfillmentPct: 96.1,
      qualityPct: 93.2,
      aiConfidence: 91,
      risk: "LOW",
      status: "EXCELLENT",
    },
    {
      id: "s3",
      name: "Omar Spice Bazaar",
      region: "Chennai",
      category: "Spices",
      score: 81,
      riskMetric: 34,
      fulfillmentPct: 93.4,
      qualityPct: 89.0,
      aiConfidence: 84,
      risk: "MEDIUM",
      status: "GOOD",
    },
    {
      id: "s4",
      name: "Fresh Produce Co.",
      region: "Bengaluru",
      category: "Produce",
      score: 72,
      riskMetric: 48,
      fulfillmentPct: 88.0,
      qualityPct: 82.4,
      aiConfidence: 78,
      risk: "MEDIUM",
      status: "WATCH",
    },
    {
      id: "s5",
      name: "Bandra Daily Mart",
      region: "Mumbai",
      category: "Groceries",
      score: 79,
      riskMetric: 22,
      fulfillmentPct: 91.5,
      qualityPct: 90.1,
      aiConfidence: 82,
      risk: "LOW",
      status: "GOOD",
    },
    {
      id: "s6",
      name: "Andheri Juice Lab",
      region: "Mumbai",
      category: "Beverages",
      score: 64,
      riskMetric: 71,
      fulfillmentPct: 82.3,
      qualityPct: 74.8,
      aiConfidence: 71,
      risk: "HIGH",
      status: "WATCH",
    },
    {
      id: "s7",
      name: "CP Organic Basket",
      region: "Delhi",
      category: "Produce",
      score: 85,
      riskMetric: 16,
      fulfillmentPct: 95.0,
      qualityPct: 92.7,
      aiConfidence: 88,
      risk: "LOW",
      status: "GOOD",
    },
    {
      id: "s8",
      name: "Koramangala Pantry Hub",
      region: "Bengaluru",
      category: "Groceries",
      score: 58,
      riskMetric: 62,
      fulfillmentPct: 0,
      qualityPct: 0,
      aiConfidence: 42,
      risk: "HIGH",
      status: "PENDING",
    },
  ],
};

const INSIGHT_POOL: Omit<LiveInsight, "id" | "at">[] = [
  { message: "New order placed — Zone 4", kind: "order" },
  { message: "Seller stock updated — Fresh Produce Co.", kind: "stock" },
  { message: "Price change detected — Stationery category", kind: "price" },
  { message: "Delivery delayed — Route 12", kind: "delivery" },
  { message: "New seller onboarded — verification pending", kind: "onboard" },
  { message: "Dispute flagged — Vendor #318 payout hold", kind: "dispute" },
  { message: "Heat spike — Koramangala order volume +18%", kind: "order" },
  { message: "Quality score rebound — CP Organic Basket", kind: "stock" },
  { message: "Promotion claim surge — Weekend Fresh challenge", kind: "order" },
  { message: "SLA breach detected — Hyderabad Zone 2", kind: "delivery" },
];

export function nextLiveInsight(seq: number): LiveInsight {
  const template = INSIGHT_POOL[seq % INSIGHT_POOL.length];
  return {
    id: `live-${Date.now()}-${seq}`,
    at: "just now",
    ...template,
  };
}

export function formatKpiValue(
  n: number,
  format: AdminKpi["format"]
): string {
  if (format === "pct") return `${Math.round(n)}%`;
  if (format === "int") return Math.round(n).toLocaleString("en-IN");
  return n.toFixed(1);
}

export function priorityFromVolume(orderVolume: number): HeatMarker["priority"] {
  if (orderVolume >= 3000) return "high";
  if (orderVolume >= 1200) return "medium";
  return "normal";
}
