import { AlertTriangle, Eye, IndianRupee, PackageCheck } from "lucide-react";
import type { DashboardMock } from "@/data/vendorDashboardMock";
import { cn, formatINR, formatPct } from "@/lib/utils";

type Props = {
  kpis: DashboardMock["kpis"];
  pulseKeys?: Set<string>;
};

const cards = [
  {
    key: "revenue",
    label: "Total Revenue",
    icon: IndianRupee,
    color: "text-terracotta bg-terracotta/10",
  },
  {
    key: "orders",
    label: "Orders Completed",
    icon: PackageCheck,
    color: "text-mustard bg-mustard/15",
  },
  {
    key: "views",
    label: "Active Product Views",
    icon: Eye,
    color: "text-emerald-700 bg-emerald-50",
  },
  {
    key: "lowStock",
    label: "Low Stock Alerts",
    icon: AlertTriangle,
    color: "text-red-700 bg-red-50",
  },
] as const;

export function KpiRow({ kpis, pulseKeys }: Props) {
  const values: Record<string, { main: string; sub?: string; alert?: boolean }> = {
    revenue: {
      main: formatINR(kpis.revenue),
      sub: `${formatPct(kpis.revenueChangePct)} vs prior period`,
    },
    orders: { main: String(kpis.ordersCompleted) },
    views: { main: String(kpis.activeProductViews), sub: "Live right now" },
    lowStock: {
      main: String(kpis.lowStockAlerts),
      alert: kpis.lowStockAlerts > 0,
      sub: kpis.lowStockAlerts > 0 ? "Needs restock" : "All healthy",
    },
  };

  return (
    <div className="grid grid-cols-12 gap-5 sm:gap-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const v = values[c.key];
        const pulsing = pulseKeys?.has(c.key);
        return (
          <div
            key={c.key}
            className={cn(
              "col-span-12 sm:col-span-6 xl:col-span-3",
              "min-h-[150px] rounded-[20px] bg-white shadow-[0_1px_3px_rgba(28,27,25,0.06),0_8px_24px_rgba(28,27,25,0.04)]",
              "px-7 py-7 flex flex-col justify-between transition-shadow",
              pulsing && "ring-2 ring-terracotta/35",
              v.alert && "ring-1 ring-red-200"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-muted">{c.label}</p>
              <span className={cn("rounded-2xl p-3", c.color)}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
            </div>
            <div>
              <p
                className={cn(
                  "font-display text-[40px] sm:text-[44px] font-bold text-ink leading-none tracking-tight tabular-nums",
                  v.alert && "text-red-600"
                )}
              >
                {v.main}
              </p>
              {v.sub && (
                <p
                  className={cn(
                    "mt-3 text-base font-medium",
                    c.key === "revenue" && kpis.revenueChangePct >= 0
                      ? "text-emerald-600"
                      : c.key === "revenue"
                        ? "text-red-600"
                        : "text-muted"
                  )}
                >
                  {v.sub}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
