import { Plus, Store } from "lucide-react";
import type { DateRange } from "@/data/vendorDashboardMock";
import { ExportIncomeCsvButton } from "@/components/vendor/ExportIncomeCsvButton";
import { cn } from "@/lib/utils";

const RANGES: { id: DateRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

type Props = {
  storeName: string;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  onQuickAdd: () => void;
};

export function DashboardHeader({
  storeName,
  range,
  onRangeChange,
  onQuickAdd,
}: Props) {
  return (
    <header className="rounded-[20px] bg-white shadow-[0_1px_3px_rgba(28,27,25,0.06),0_8px_24px_rgba(28,27,25,0.04)] px-7 sm:px-8 py-7 sm:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-terracotta/12 text-terracotta">
            <Store className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-ink truncate tracking-tight">
              {storeName}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold px-3.5 py-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Store Status: Live
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <div className="inline-flex rounded-[16px] bg-cream p-1.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRangeChange(r.id)}
                className={cn(
                  "rounded-[12px] px-5 h-14 text-base font-semibold transition",
                  range === r.id
                    ? "bg-terracotta text-white shadow-sm"
                    : "text-muted hover:text-ink"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <ExportIncomeCsvButton />
          <button
            type="button"
            onClick={onQuickAdd}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-terracotta hover:bg-terracotta-dark text-white text-base sm:text-lg font-semibold h-14 px-6 transition"
          >
            <Plus className="h-5 w-5" />
            Quick-add product
          </button>
        </div>
      </div>
    </header>
  );
}
