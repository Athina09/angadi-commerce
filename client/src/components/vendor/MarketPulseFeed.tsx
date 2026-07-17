import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  MapPin,
  Package,
  Tag,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PulseKind = "competitor" | "stock" | "price" | "density";

export type MarketPulseEvent = {
  id: string;
  kind: PulseKind;
  title: string;
  detail: string;
  at: string;
  severity?: "info" | "warn" | "critical";
};

type Props = {
  events: MarketPulseEvent[];
};

const KIND_META: Record<
  PulseKind,
  { label: string; icon: typeof MapPin; tone: string; pill: string; bar: string }
> = {
  competitor: {
    label: "Competitor",
    icon: MapPin,
    tone: "bg-sky-50 text-sky-800 ring-sky-200/80",
    pill: "bg-sky-100 text-sky-800",
    bar: "bg-sky-500",
  },
  stock: {
    label: "Stock alert",
    icon: AlertTriangle,
    tone: "bg-amber-50 text-amber-950 ring-amber-200/80",
    pill: "bg-amber-100 text-amber-900",
    bar: "bg-amber-500",
  },
  price: {
    label: "Price move",
    icon: Tag,
    tone: "bg-violet-50 text-violet-900 ring-violet-200/70",
    pill: "bg-violet-100 text-violet-800",
    bar: "bg-violet-500",
  },
  density: {
    label: "Heat spike",
    icon: TrendingUp,
    tone: "bg-emerald-50 text-emerald-900 ring-emerald-200/70",
    pill: "bg-emerald-100 text-emerald-800",
    bar: "bg-emerald-500",
  },
};

/** Only keep the newest squares — older pulses drop off */
const MAX_VISIBLE = 4;

export function MarketPulseFeed({ events }: Props) {
  const visible = events.slice(0, MAX_VISIBLE);

  return (
    <section className="h-full min-h-[480px] lg:min-h-[550px] flex flex-col rounded-[24px] bg-white border border-ink/6 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[24px] sm:text-[28px] font-bold tracking-tight text-ink leading-none">
            Market pulse
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Latest live signals — older ones fade out
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(KIND_META) as PulseKind[]).map((k) => (
          <span
            key={k}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              KIND_META[k].pill
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", KIND_META[k].bar)} />
            {KIND_META[k].label}
          </span>
        ))}
      </div>

      <ul className="flex-1 grid grid-cols-2 gap-3 content-start">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((ev, i) => {
            const meta = KIND_META[ev.kind];
            const Icon = meta.icon;
            const critical = ev.severity === "critical";
            const warn = ev.severity === "warn";
            return (
              <motion.li
                key={ev.id}
                layout
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.28 }}
                className={cn(
                  "aspect-square rounded-[18px] ring-1 p-3.5 flex flex-col",
                  meta.tone,
                  i === 0 && "shadow-sm ring-2",
                  critical && "ring-red-300 bg-red-50 text-red-950",
                  warn && ev.kind === "stock" && "ring-amber-300"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/75",
                      critical && "text-red-600"
                    )}
                  >
                    {ev.kind === "price" && ev.detail.includes("below") ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : ev.kind === "price" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : critical ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </span>
                  <span className="text-[10px] tabular-nums opacity-70 shrink-0">
                    {ev.at}
                  </span>
                </div>

                <p className="mt-3 text-[13px] font-semibold leading-snug line-clamp-3">
                  {ev.title}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug opacity-80 line-clamp-3 flex-1">
                  {ev.detail}
                </p>

                <span
                  className={cn(
                    "mt-auto pt-2 inline-flex self-start rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    critical ? "bg-red-100 text-red-700" : meta.pill
                  )}
                >
                  {critical ? "Critical" : meta.label}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}

const COMPETITOR_POOL = [
  "Crust & Crumb",
  "Oven Door Café",
  "Flour & Fire",
  "Daily Bread Co.",
  "Sweet Rise Bakery",
] as const;

const STOCK_POOL = [
  "Butter Croissants (pack of 4)",
  "Masala Chai Cookies (8)",
  "Sourdough Loaf",
  "Chocolate Chip Cookies (6)",
  "Multigrain Sandwich Bread",
] as const;

export function nextMarketPulse(seq: number): MarketPulseEvent {
  const kinds: PulseKind[] = ["competitor", "stock", "price", "density"];
  const kind = kinds[seq % kinds.length];
  const shop = COMPETITOR_POOL[seq % COMPETITOR_POOL.length];
  const sku = STOCK_POOL[seq % STOCK_POOL.length];
  const id = `pulse-${Date.now()}-${seq}`;

  if (kind === "competitor") {
    return {
      id,
      kind,
      title: `${shop} activity surge`,
      detail: `Order volume up ${8 + (seq % 14)}% within 1.2km — overlapping Bakery SKUs`,
      at: "just now",
      severity: "info",
    };
  }
  if (kind === "stock") {
    const left = 1 + (seq % 4);
    return {
      id,
      kind,
      title: `Low stock — ${sku}`,
      detail: `Only ${left} units left · threshold breached · restock recommended`,
      at: "just now",
      severity: left <= 2 ? "critical" : "warn",
    };
  }
  if (kind === "price") {
    const below = seq % 2 === 0;
    return {
      id,
      kind,
      title: `${shop} price change`,
      detail: below
        ? `Dropped ₹${10 + (seq % 20)} on overlapping SKU — you’re now above market`
        : `Raised price ₹${8 + (seq % 15)} — temporary edge for your listing`,
      at: "just now",
      severity: "info",
    };
  }
  return {
    id,
    kind: "density",
    title: "Heatmap density spike",
    detail: `Zone near ${shop} flipped to high intensity (vendor density weight)`,
    at: "just now",
    severity: "info",
  };
}

export const INITIAL_MARKET_PULSE: MarketPulseEvent[] = [
  {
    id: "p0",
    kind: "stock",
    title: "Low stock — Masala Chai Cookies (8)",
    detail: "Only 2 units left · threshold breached · restock recommended",
    at: "12s ago",
    severity: "critical",
  },
  {
    id: "p1",
    kind: "competitor",
    title: "Crust & Crumb activity surge",
    detail: "Order volume up 14% within 0.7km — overlapping Bakery SKUs",
    at: "45s ago",
    severity: "info",
  },
  {
    id: "p2",
    kind: "price",
    title: "Oven Door Café price change",
    detail: "Dropped ₹15 on croissants — you’re now above market",
    at: "2m ago",
    severity: "info",
  },
  {
    id: "p3",
    kind: "density",
    title: "Heatmap density spike",
    detail: "Zone near Flour & Fire flipped to high intensity",
    at: "3m ago",
    severity: "info",
  },
];
