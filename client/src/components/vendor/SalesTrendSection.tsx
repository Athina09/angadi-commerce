import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesDay, TopProduct } from "@/data/vendorDashboardMock";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/vendor/Sparkline";
import { formatINR } from "@/lib/utils";

type Props = {
  salesTrend: SalesDay[];
  topProducts: TopProduct[];
};

export function SalesTrendSection({ salesTrend, topProducts }: Props) {
  return (
    <Card
      title="Selling Details"
      subtitle="Daily revenue with order count overlay"
    >
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 h-[450px] sm:h-[480px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={salesTrend}
              margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2c211818" />
              <XAxis dataKey="date" tick={{ fill: "#6b5a4a", fontSize: 14 }} />
              <YAxis
                yAxisId="rev"
                tick={{ fill: "#6b5a4a", fontSize: 14 }}
                tickFormatter={(v) => `₹${v / 1000}k`}
              />
              <YAxis
                yAxisId="ord"
                orientation="right"
                tick={{ fill: "#6b5a4a", fontSize: 14 }}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value);
                  if (name === "revenue") return [formatINR(n), "Revenue"];
                  return [n, "Orders"];
                }}
                contentStyle={{
                  borderRadius: 16,
                  border: "none",
                  boxShadow: "0 8px 24px rgba(28,27,25,0.12)",
                  fontSize: 15,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Bar
                yAxisId="rev"
                dataKey="revenue"
                name="revenue"
                fill="#2f6fed"
                radius={[8, 8, 0, 0]}
                opacity={0.9}
              />
              <Line
                yAxisId="ord"
                type="monotone"
                dataKey="orders"
                name="orders"
                stroke="#d4a017"
                strokeWidth={3}
                dot={{ r: 4, fill: "#d4a017" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <p className="text-sm font-bold uppercase tracking-wide text-muted mb-4">
            Top 5 products
          </p>
          <ol className="space-y-4">
            {topProducts.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-[16px] bg-cream/70 px-4 py-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta/15 text-terracotta text-sm font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-muted mt-0.5">
                    {formatINR(p.revenue)}
                  </p>
                </div>
                <Sparkline data={p.sparkline} className="h-10 w-20 shrink-0" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}
