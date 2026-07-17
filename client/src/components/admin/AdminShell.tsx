import {
  Bell,
  ChevronDown,
  ClipboardList,
  Crown,
  FileText,
  LayoutGrid,
  Leaf,
  Mic,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRegion } from "@/data/adminDashboardMock";
import { ADMIN_REGIONS, ADMIN_RISKS } from "@/data/adminDashboardMock";

type Props = {
  productName: string;
  adminName: string;
  search: string;
  onSearchChange: (v: string) => void;
  region: AdminRegion;
  onRegionChange: (v: AdminRegion) => void;
  risk: (typeof ADMIN_RISKS)[number];
  onRiskChange: (v: (typeof ADMIN_RISKS)[number]) => void;
  onAskAi?: () => void;
  children: React.ReactNode;
};

const SIDEBAR = [
  { id: "dash", icon: LayoutGrid, active: true },
  { id: "vendors", icon: Leaf, active: false },
  { id: "people", icon: Users, active: false },
  { id: "shield", icon: Shield, active: false },
  { id: "trophy", icon: Trophy, active: false },
  { id: "ai", icon: Sparkles, active: false },
  { id: "docs", icon: FileText, active: false },
  { id: "clipboard", icon: ClipboardList, active: false },
  { id: "settings", icon: Settings, active: false },
  { id: "crown", icon: Crown, active: false },
] as const;

const ACCENT = "#2D5A6B";

export function AdminShell({
  productName,
  adminName,
  search,
  onSearchChange,
  region,
  onRegionChange,
  risk,
  onRiskChange,
  onAskAi,
  children,
}: Props) {
  return (
    <div className="admin-shell min-h-[100svh] bg-[#FAFAFA] text-[#111827] font-[family-name:var(--font-inter)]">
      <header className="sticky top-0 z-40 border-b border-[#EEEEEE] bg-white">
        <div className="flex items-center gap-3 px-3 sm:px-4 h-[52px]">
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div
              className="h-7 w-7 rounded-[8px] flex items-center justify-center text-white"
              style={{ background: ACCENT }}
            >
              <Leaf className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="font-bold tracking-tight text-[14px] text-[#111827]">
                {productName}
              </span>
              <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#6B7280]">
                V1.0 · MARKET-OPS
              </span>
              <span className="hidden lg:inline text-[12px] text-[#9CA3AF] truncate max-w-[140px]">
                {adminName}
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center gap-2 px-1 sm:px-3 min-w-0">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search seller, product, order, delivery zone, dispute..."
                className="w-full h-9 rounded-[10px] border border-[#EEEEEE] bg-[#F7F8FA] pl-9 pr-10 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#2D5A6B]/35 focus:ring-2 focus:ring-[#2D5A6B]/10"
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[8px] text-[#6B7280] hover:bg-white hover:text-[#111827] flex items-center justify-center"
                aria-label="Voice search"
              >
                <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <button
              type="button"
              onClick={onAskAi}
              className="hidden md:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              Ask {productName} AI
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden md:inline-flex rounded-full bg-[#E8A33D] text-white px-2.5 py-1 text-[10px] font-semibold tracking-wide shadow-sm">
              Super Admin
            </span>
            <FilterSelect
              value={region}
              onChange={(v) => onRegionChange(v as AdminRegion)}
              options={ADMIN_REGIONS}
              className="hidden sm:block"
            />
            <FilterSelect
              value={risk}
              onChange={(v) => onRiskChange(v as (typeof ADMIN_RISKS)[number])}
              options={[...ADMIN_RISKS]}
              className="hidden md:block"
            />
            <button
              type="button"
              className="relative h-9 w-9 rounded-[8px] border border-[#EEEEEE] bg-white text-[#6B7280] hover:text-[#111827] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#E85D5D] ring-2 ring-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[52px] h-[calc(100svh-52px)] w-[60px] shrink-0 border-r border-[#EEEEEE] bg-white flex flex-col items-center py-3 gap-2 z-30">
          {SIDEBAR.map(({ id, icon: Icon, active }) => (
            <button
              key={id}
              type="button"
              className={cn(
                "h-9 w-9 rounded-[10px] flex items-center justify-center transition-colors",
                active
                  ? "bg-[#E8F0F3] text-[#2D5A6B]"
                  : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              )}
              aria-label={id}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ))}
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-5 py-4 sm:py-5">{children}</main>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 rounded-[8px] border border-[#EEEEEE] bg-white pl-2.5 pr-7 text-[11px] font-medium text-[#374151] outline-none focus:border-[#2D5A6B]/35 focus:ring-2 focus:ring-[#2D5A6B]/10 cursor-pointer max-w-[9.5rem]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
    </div>
  );
}
