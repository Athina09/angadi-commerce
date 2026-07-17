import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import {
  Clock,
  Eye,
  Heart,
  Package,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Layers,
  IndianRupee,
} from "lucide-react";
import type {
  ActivityEvent,
  AiRecommendation,
  LiveProduct,
} from "@/data/vendorDashboardMock";
import { Sparkline } from "@/components/vendor/Sparkline";
import { cn, formatINR } from "@/lib/utils";

type Props = {
  totalViewers: number;
  products: LiveProduct[];
  activity: ActivityEvent[];
  quickInsights: {
    conversionToday: number;
    avgBasket: number;
    mostPopular: string;
    returningPct: number;
  };
  aiRecommendations: AiRecommendation[];
};

const iconFor = {
  viewing: Eye,
  cart: ShoppingCart,
  order: ShoppingBag,
  wishlist: Heart,
  inventory: Package,
} as const;

const iconTone = {
  viewing: "bg-vh-blue-soft text-vh-blue",
  cart: "bg-[rgba(23,162,160,0.12)] text-vh-teal",
  order: "bg-[rgba(31,169,122,0.12)] text-vh-good",
  wishlist: "bg-rose-50 text-rose-600",
  inventory: "bg-ink/5 text-ink/70",
} as const;

const aiIcon = {
  price: IndianRupee,
  restock: Package,
  bundle: Layers,
  timing: Clock,
} as const;

export function LiveViewersPanel({
  totalViewers,
  products,
  activity,
  quickInsights,
  aiRecommendations,
}: Props) {
  const watching = useMemo(
    () =>
      products
        .filter((p) => p.liveViewers > 0)
        .sort((a, b) => b.liveViewers - a.liveViewers)
        .slice(0, 4),
    [products]
  );
  const maxViewers = Math.max(...watching.map((p) => p.liveViewers), 1);
  const feed = activity.slice(0, 4);
  const recs = aiRecommendations.slice(0, 2);

  return (
    <aside className="h-full w-full xl:w-[340px] xl:max-w-[340px] flex flex-col rounded-2xl bg-white border border-vh-border shadow-[0_8px_28px_rgba(26,34,51,0.06)] p-5 overflow-y-auto">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-vh-text">
            Live insights
          </h2>
          <p className="mt-0.5 text-[12px] text-vh-muted">Storefront right now</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(31,169,122,0.1)] px-2 py-1 text-[10px] font-semibold text-vh-good">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </header>

      <div className="rounded-xl bg-gradient-to-br from-vh-blue-soft via-white to-[rgba(23,162,160,0.08)] p-4 mb-4 border border-vh-border/60">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-vh-muted">
            Active visitors
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-vh-good">
            <TrendingUp className="h-3 w-3" />
            +18%
          </span>
        </div>
        <AnimatedCount value={totalViewers} />
      </div>

      <section className="mb-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-vh-muted mb-2">
          Most viewed
        </h3>
        <div className="space-y-2">
          {watching.length === 0 && (
            <p className="text-[13px] text-vh-muted">No browsers right now.</p>
          )}
          {watching.map((p) => (
            <motion.div
              key={p.id}
              layout
              className="rounded-xl bg-[#f7f9fc] px-2.5 py-2 flex items-center gap-2.5"
            >
              <img
                src={p.imageUrl}
                alt=""
                className="h-9 w-9 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold truncate text-vh-text">
                  {p.name.split("(")[0].trim()}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-white overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-vh-blue"
                      initial={false}
                      animate={{
                        width: `${(p.liveViewers / maxViewers) * 100}%`,
                      }}
                      transition={{ duration: 0.45 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-vh-muted tabular-nums">
                    {p.liveViewers}
                  </span>
                </div>
              </div>
              <Sparkline data={p.conversionTrend} className="h-6 w-10 shrink-0" />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <div className="grid grid-cols-2 gap-2">
          <MiniKpi label="Conversion" value={`${quickInsights.conversionToday}%`} />
          <MiniKpi label="Avg basket" value={formatINR(quickInsights.avgBasket)} />
          <MiniKpi
            label="Popular"
            value={quickInsights.mostPopular.split(" (")[0]}
            className="col-span-2"
          />
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-vh-muted mb-2">
          Activity
        </h3>
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {feed.map((ev, i) => {
              const Icon = iconFor[ev.type];
              return (
                <motion.li
                  key={ev.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex gap-2.5 rounded-xl px-2.5 py-2 bg-[#f7f9fc]",
                    i === 0 && "ring-1 ring-vh-blue/15 bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      iconTone[ev.type]
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-vh-text leading-snug line-clamp-2">
                      {ev.message}
                    </p>
                    <p className="text-[10px] text-vh-muted mt-0.5">{ev.at}</p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </section>

      <section>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-vh-muted mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-vh-blue" />
          Focus now
        </h3>
        <div className="space-y-2">
          {recs.map((rec) => {
            const Icon = aiIcon[rec.icon];
            return (
              <div
                key={rec.id}
                className="rounded-xl border border-vh-border bg-white px-3 py-2.5 flex gap-2.5"
              >
                <span className="h-7 w-7 rounded-lg bg-vh-blue-soft text-vh-blue flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[12px] text-vh-text leading-snug">{rec.text}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-vh-muted">
          Need detail? Use <span className="font-semibold text-vh-blue">Ask Advisor</span>{" "}
          bottom-right.
        </p>
      </section>
    </aside>
  );
}

function MiniKpi({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl bg-[#f7f9fc] px-3 py-2.5", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-vh-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-[15px] font-bold text-vh-text leading-tight truncate">
        {value}
      </p>
    </div>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 90, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [text, setText] = useState(String(value));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on("change", (v) => setText(String(v)));
  }, [display]);

  return (
    <p className="mt-1.5 font-display text-[40px] font-bold text-vh-blue leading-none tabular-nums">
      {text}
    </p>
  );
}
