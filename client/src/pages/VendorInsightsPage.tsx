import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";
import { SalesTrendSection } from "@/components/vendor/SalesTrendSection";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import type {
  AiRecommendation,
  SalesDay,
  TopProduct,
} from "@/data/vendorDashboardMock";
import { cn, formatINR } from "@/lib/utils";

type ForecastRow = {
  listingId: string;
  name: string;
  category?: string;
  stock: number;
  price?: number;
  confidence: number;
  next7dDemand: number;
  suggestedStock: number;
  stockGap: number;
  trend: number[];
  dailyDemand: number[];
};

type DemandPoint = {
  label: string;
  actualDemand: number | null;
  predictedDemand: number | null;
  low: number | null;
  high: number | null;
  actualRevenue: number | null;
  predictedRevenue: number | null;
  phase: "actual" | "forecast";
};

type InsightsPayload = {
  quickInsights: {
    conversionToday: number;
    avgBasket: number;
    mostPopular: string;
    returningPct: number;
  };
  aiRecommendations: AiRecommendation[];
  salesTrend: SalesDay[];
  topProducts: TopProduct[];
  forecast: ForecastRow[];
  demandCurve: DemandPoint[];
  skuCompare: {
    name: string;
    fullName: string;
    demand: number;
    stock: number;
    suggested: number;
    confidence: number;
    gap: number;
  }[];
  categoryDemand: { name: string; value: number }[];
  peakHours: { hour: string; demand: number }[];
  confidenceVsDemand: {
    name: string;
    confidence: number;
    demand: number;
    stockRisk: number;
  }[];
  predictiveSummary: {
    next7dRevenue: number;
    next7dOrders: number;
    next7dUnits: number;
    avgConfidence: number;
    skusAtRisk: number;
  };
};

const BLUE = "#2f6fed";
const AMBER = "#d4a017";
const EMERALD = "#10b981";
const SLATE = "#64748b";
const BAND = "#93c5fd";
const CAT_COLORS = ["#2f6fed", "#17a2a0", "#d4a017", "#f97316", "#8b5cf6", "#64748b"];

const tipStyle = {
  borderRadius: 14,
  border: "none",
  boxShadow: "0 8px 24px rgba(28,27,25,0.12)",
  fontSize: 13,
};

export function VendorInsightsPage() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data: res } = await api.get<InsightsPayload>("/vendor/insights");
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const bandSeries = useMemo(() => {
    if (!data?.demandCurve) return [];
    return data.demandCurve.map((d) => ({
      ...d,
      bandBase: d.low ?? undefined,
      bandSpan:
        d.low != null && d.high != null ? d.high - d.low : undefined,
    }));
  }, [data]);

  return (
    <VendorHubShell title="Insights & forecast">
      {loading && <p className="text-sm text-muted">Loading insights…</p>}
      {!loading && !data && (
        <p className="text-sm text-muted">Could not load insights.</p>
      )}
      {data && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Conversion",
                value: `${data.quickInsights.conversionToday}%`,
              },
              {
                label: "Avg basket",
                value: `₹${data.quickInsights.avgBasket}`,
              },
              {
                label: "Most popular",
                value: data.quickInsights.mostPopular,
              },
              {
                label: "Returning",
                value: `${data.quickInsights.returningPct}%`,
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl bg-white border border-ink/6 p-5"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-semibold">
                  {k.label}
                </p>
                <p className="mt-2 font-display text-2xl font-bold truncate">
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {data.predictiveSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  label: "Predicted revenue (7d)",
                  value: formatINR(data.predictiveSummary.next7dRevenue),
                },
                {
                  label: "Predicted orders",
                  value: String(data.predictiveSummary.next7dOrders),
                },
                {
                  label: "Predicted units",
                  value: String(data.predictiveSummary.next7dUnits),
                },
                {
                  label: "Avg model confidence",
                  value: `${data.predictiveSummary.avgConfidence}%`,
                },
                {
                  label: "SKUs understocked",
                  value: String(data.predictiveSummary.skusAtRisk),
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-2xl bg-gradient-to-br from-vh-blue-soft/80 to-white border border-vh-border/70 px-4 py-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-vh-muted font-semibold leading-snug">
                    {k.label}
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-vh-blue tabular-nums">
                    {k.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Card
            title="Demand curve"
            subtitle="Past 7 days actual vs next 7 days predicted (with confidence band)"
          >
            <div className="h-[320px] sm:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={bandSeries}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: SLATE, fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: SLATE, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(value, name) => {
                      const n =
                        typeof value === "number" ? value : Number(value);
                      if (name === "bandSpan" || name === "bandBase")
                        return [null, null];
                      return [n, String(name)];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Area
                    type="monotone"
                    dataKey="bandBase"
                    stackId="band"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    tooltipType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="bandSpan"
                    stackId="band"
                    stroke="none"
                    fill={BAND}
                    fillOpacity={0.45}
                    name="Confidence band"
                  />
                  <Line
                    type="monotone"
                    dataKey="actualDemand"
                    name="Actual demand"
                    stroke={BLUE}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: BLUE }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predictedDemand"
                    name="Predicted demand"
                    stroke={AMBER}
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: AMBER }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Revenue outlook"
              subtitle="Actual vs forecasted daily revenue"
            >
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.demandCurve}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: SLATE, fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fill: SLATE, fontSize: 11 }}
                      tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(value, name) => {
                        const n =
                          typeof value === "number" ? value : Number(value);
                        return [formatINR(n), String(name)];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="actualRevenue"
                      name="Actual"
                      fill={BLUE}
                      radius={[6, 6, 0, 0]}
                      opacity={0.9}
                    />
                    <Bar
                      dataKey="predictedRevenue"
                      name="Predicted"
                      fill={AMBER}
                      radius={[6, 6, 0, 0]}
                      opacity={0.85}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Peak shopping hours"
              subtitle="Predicted relative demand by hour of day"
            >
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.peakHours}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: SLATE, fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: SLATE, fontSize: 11 }} />
                    <Tooltip contentStyle={tipStyle} />
                    <Area
                      type="monotone"
                      dataKey="demand"
                      name="Demand index"
                      stroke={BLUE}
                      fill={BLUE}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="demand"
                      stroke={BLUE}
                      strokeWidth={2}
                      dot={{ r: 3, fill: EMERALD }}
                      legendType="none"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            title="SKU demand vs stock"
            subtitle="Predicted 7-day demand against on-hand and suggested restock"
          >
            <div className="h-[320px] sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.skuCompare}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: SLATE, fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis tick={{ fill: SLATE, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tipStyle}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullName?: string })
                        ?.fullName ?? ""
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar
                    dataKey="demand"
                    name="Predicted demand"
                    fill={BLUE}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="stock"
                    name="On hand"
                    fill={SLATE}
                    radius={[6, 6, 0, 0]}
                    opacity={0.55}
                  />
                  <Line
                    type="monotone"
                    dataKey="suggested"
                    name="Suggested stock"
                    stroke={AMBER}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: AMBER }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Category demand mix"
              subtitle="Share of predicted units next 7 days"
            >
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryDemand}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={3}
                    >
                      {data.categoryDemand.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CAT_COLORS[i % CAT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Confidence vs demand"
              subtitle="Model confidence and restock pressure by SKU"
            >
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.confidenceVsDemand}
                    margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: SLATE, fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="d"
                      tick={{ fill: SLATE, fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="c"
                      orientation="right"
                      domain={[60, 100]}
                      tick={{ fill: SLATE, fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={tipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="d"
                      dataKey="demand"
                      name="Demand"
                      fill={BLUE}
                      radius={[6, 6, 0, 0]}
                      opacity={0.85}
                    />
                    <Bar
                      yAxisId="d"
                      dataKey="stockRisk"
                      name="Stock gap"
                      fill="#f97316"
                      radius={[6, 6, 0, 0]}
                      opacity={0.75}
                    />
                    <Line
                      yAxisId="c"
                      type="monotone"
                      dataKey="confidence"
                      name="Confidence %"
                      stroke={EMERALD}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: EMERALD }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <section className="rounded-[24px] bg-white border border-ink/6 p-6">
            <h2 className="font-display text-2xl font-bold">
              7-day SKU forecast
            </h2>
            <p className="text-sm text-muted mt-1 mb-5">
              Demo confidence from live inventory + simulated demand curves.
            </p>
            <div className="space-y-3">
              {data.forecast.map((f) => (
                <div
                  key={f.listingId}
                  className="rounded-2xl border border-ink/8 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{f.name}</p>
                      <p className="text-[12px] text-muted mt-0.5">
                        Next 7d demand ~{f.next7dDemand} · suggest stock{" "}
                        {f.suggestedStock}
                        {f.stockGap > 0 && (
                          <span className="text-amber-700 font-medium">
                            {" "}
                            · gap +{f.stockGap}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-2 rounded-full bg-ink/8 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            f.confidence >= 85
                              ? "bg-emerald-500"
                              : f.confidence >= 75
                                ? "bg-amber-500"
                                : "bg-vh-blue"
                          )}
                          style={{ width: `${f.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-10 text-right">
                        {f.confidence}%
                      </span>
                    </div>
                  </div>
                  {f.dailyDemand?.length > 0 && (
                    <div className="mt-3 h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={f.dailyDemand.map((v, i) => ({
                          d: ["M", "T", "W", "T", "F", "S", "S"][i],
                          v,
                        }))}>
                          <Bar
                            dataKey="v"
                            fill={BLUE}
                            radius={[4, 4, 0, 0]}
                            opacity={0.75}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] bg-white border border-ink/6 p-6">
            <h2 className="font-display text-2xl font-bold mb-4">
              AI recommendations
            </h2>
            <ul className="space-y-3">
              {data.aiRecommendations.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl bg-[#FFFCFA] border border-ink/6 px-4 py-3 text-sm text-ink/90"
                >
                  {r.text}
                </li>
              ))}
            </ul>
          </section>

          <SalesTrendSection
            salesTrend={data.salesTrend}
            topProducts={data.topProducts}
          />
        </div>
      )}
    </VendorHubShell>
  );
}
