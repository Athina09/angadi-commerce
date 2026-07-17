import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Package,
  Sparkles,
  Trophy,
  Users,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatKpiValue,
  type AdminKpi,
} from "@/data/adminDashboardMock";

type Props = {
  kpis: AdminKpi[];
};

const ICONS = {
  score: Sparkles,
  orders: Package,
  ai: Bot,
  disputes: AlertTriangle,
  vendors: Users,
  campaigns: Trophy,
} as const;

export function AdminKpiRow({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: AdminKpi }) {
  const Icon = ICONS[kpi.icon];
  const up = (kpi.trendPct ?? 0) >= 0;
  const display = useAnimatedNumber(kpi.numericValue, kpi.format);

  return (
    <div className="rounded-[10px] border border-[#EEEEEE] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)] p-3 flex flex-col min-h-[118px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280] leading-tight pr-1">
          {kpi.label}
        </p>
        <div className="h-6 w-6 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
          <Icon className="h-3 w-3" strokeWidth={1.75} />
        </div>
      </div>

      <p className="mt-1.5 text-[22px] font-bold tracking-tight text-[#111827] leading-none tabular-nums">
        {display}
      </p>
      <p className="mt-1 text-[11px] text-[#6B7280]">{kpi.subtext}</p>

      <div className="mt-auto pt-2.5 flex items-end justify-between gap-2">
        <MiniSpark values={kpi.sparkline} positive={up} />
        {kpi.trendPct != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
              up ? "text-[#5FA37A]" : "text-[#E85D5D]"
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2.25} />
            )}
            {Math.abs(kpi.trendPct).toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px] text-[#9CA3AF]">—</span>
        )}
      </div>
    </div>
  );
}

function useAnimatedNumber(
  target: number,
  format: AdminKpi["format"]
): string {
  const [current, setCurrent] = useState(target);
  const frame = useRef<number | null>(null);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) {
      setCurrent(to);
      return;
    }
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(from + (to - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      fromRef.current = current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return formatKpiValue(current, format);
}

function MiniSpark({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={positive ? "#5FA37A" : "#E85D5D"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.9}
      />
    </svg>
  );
}
