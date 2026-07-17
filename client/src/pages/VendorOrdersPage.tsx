import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package } from "lucide-react";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";
import { api } from "@/lib/api";
import {
  getSocket,
  joinVendorRoom,
  type OrderPipelineEvent,
} from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";
import { cn, formatINR } from "@/lib/utils";

type OrderStatus = "pending" | "processing" | "completed";

type OrderLine = {
  listingId: string;
  name: string;
  imageUrl: string;
  qty: number;
  priceAtPurchase: number;
};

type VendorOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  lines: OrderLine[];
};

const COLUMNS: {
  key: OrderStatus;
  label: string;
  tone: string;
  pill: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    tone: "from-amber-50/80 to-white",
    pill: "bg-amber-100 text-amber-900",
  },
  {
    key: "processing",
    label: "Processing",
    tone: "from-sky-50/80 to-white",
    pill: "bg-sky-100 text-sky-900",
  },
  {
    key: "completed",
    label: "Completed",
    tone: "from-emerald-50/80 to-white",
    pill: "bg-emerald-100 text-emerald-900",
  },
];

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  pending: "processing",
  processing: "completed",
  completed: null,
};

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";

function ProductThumb({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <img
      src={broken || !src ? PLACEHOLDER : src}
      alt={alt}
      onError={() => setBroken(true)}
      className={cn("object-cover bg-cream", className)}
      loading="lazy"
    />
  );
}

export function VendorOrdersPage() {
  const storeVendorId = useAuthStore((s) => s.user?.vendor?.id);
  const [vendorId, setVendorId] = useState<string | null>(storeVendorId ?? null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [pulseNote, setPulseNote] = useState("Waiting for live tickets…");

  const mergeOrders = useCallback((incoming: VendorOrder[]) => {
    setOrders((prev) => {
      const map = new Map(prev.map((o) => [o.id, o]));
      for (const o of incoming) map.set(o.id, o);
      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    if (incoming[0]) {
      setFlashId(incoming[0].id);
      window.setTimeout(() => setFlashId(null), 800);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{
        orders: VendorOrder[];
        vendorId?: string;
      }>("/vendor/orders");
      setOrders(data.orders);
      if (data.vendorId) setVendorId(data.vendorId);
      const pending = data.orders.filter((o) => o.status === "pending").length;
      const processing = data.orders.filter(
        (o) => o.status === "processing"
      ).length;
      setPulseNote(
        `Live flow · ${pending} pending · ${processing} processing`
      );
    } catch {
      setError("Could not load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    const id = vendorId || storeVendorId;
    if (!id) return;
    const socket = getSocket();
    if (!socket) return;
    joinVendorRoom(id);
    const onPipe = (ev: OrderPipelineEvent) => {
      mergeOrders(ev.orders as VendorOrder[]);
      const created = ev.orders.filter((o) => o.status === "pending").length;
      const moved = ev.orders.filter((o) => o.status !== "pending").length;
      setPulseNote(
        created && moved
          ? `+${created} new · ${moved} advanced together`
          : created
            ? `+${created} new pending`
            : `${moved} moved simultaneously`
      );
    };
    socket.on("order-pipeline", onPipe);
    return () => {
      socket.off("order-pipeline", onPipe);
    };
  }, [vendorId, storeVendorId, mergeOrders]);

  const advance = async (id: string, status: OrderStatus) => {
    const next = NEXT[status];
    if (!next) return;
    setFlashId(id);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next } : o))
    );
    window.setTimeout(() => setFlashId(null), 700);
    try {
      await api.patch(`/vendor/orders/${id}/status`, { status: next });
    } catch {
      void load();
    }
  };

  const grouped = useMemo(() => {
    const g: Record<OrderStatus, VendorOrder[]> = {
      pending: [],
      processing: [],
      completed: [],
    };
    for (const o of orders) g[o.status]?.push(o);
    return g;
  }, [orders]);

  const liveSkus = useMemo(() => {
    const map = new Map<string, OrderLine>();
    for (const o of orders) {
      for (const l of o.lines) {
        if (!map.has(l.listingId)) map.set(l.listingId, l);
      }
    }
    return Array.from(map.values()).slice(0, 12);
  }, [orders]);

  return (
    <VendorHubShell title="Orders pipeline">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-muted max-w-xl">
            New tickets land in Pending consecutively; Processing & Completed
            advance together — stock drops (and SMS under 4) on complete.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {pulseNote}
        </span>
      </div>

      {/* Live inventory strip — pictures for everything moving through orders */}
      {liveSkus.length > 0 && (
        <section className="mb-7 rounded-[22px] border border-ink/6 bg-white p-4 sm:p-5 shadow-[0_8px_28px_rgba(28,27,25,0.05)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-lg font-bold tracking-tight">
              In this pipeline
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {liveSkus.length} SKUs
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {liveSkus.map((sku) => (
              <div
                key={sku.listingId}
                className="shrink-0 w-[108px] group"
              >
                <div className="aspect-square rounded-2xl overflow-hidden ring-1 ring-ink/8 bg-cream shadow-sm">
                  <ProductThumb
                    src={sku.imageUrl}
                    alt={sku.name}
                    className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-ink line-clamp-2 leading-snug">
                  {sku.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <p className="text-muted text-sm">Loading orders…</p>
      )}
      {error && (
        <p className="text-red-700 text-sm mb-4">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {COLUMNS.map((col) => (
          <section
            key={col.key}
            className={cn(
              "rounded-[22px] border border-ink/6 p-4 min-h-[460px] bg-gradient-to-b",
              col.tone
            )}
          >
            <header className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-display text-lg font-bold">{col.label}</h2>
              <span
                className={cn(
                  "text-xs font-bold rounded-full px-2.5 py-1",
                  col.pill
                )}
              >
                {grouped[col.key].length}
              </span>
            </header>

            <div className="space-y-3.5">
              <AnimatePresence mode="popLayout">
                {grouped[col.key].map((o) => {
                  const hero = o.lines[0];
                  return (
                    <motion.article
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: flashId === o.id ? 1.02 : 1,
                      }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.28 }}
                      className="rounded-2xl border border-ink/8 bg-white overflow-hidden shadow-[0_6px_20px_rgba(28,27,25,0.06)]"
                    >
                      {/* Photo header */}
                      <div className="relative h-[132px] bg-cream">
                        {hero ? (
                          <ProductThumb
                            src={hero.imageUrl}
                            alt={hero.name}
                            className="absolute inset-0 h-full w-full"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted">
                            <Package className="h-8 w-8 opacity-40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm truncate drop-shadow">
                              {o.customerName}
                            </p>
                            <p className="text-white/80 text-[11px]">
                              {new Date(o.createdAt).toLocaleString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                          <p className="shrink-0 text-white font-bold text-sm tabular-nums">
                            {formatINR(o.total)}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5">
                        <ul className="space-y-2">
                          {o.lines.map((l) => (
                            <li
                              key={`${o.id}-${l.listingId}`}
                              className="flex items-center gap-2.5"
                            >
                              <ProductThumb
                                src={l.imageUrl}
                                alt={l.name}
                                className="h-11 w-11 rounded-xl shrink-0 ring-1 ring-ink/8"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-ink truncate">
                                  {l.qty}× {l.name}
                                </p>
                                <p className="text-[11px] text-muted">
                                  {formatINR(l.priceAtPurchase)} each
                                </p>
                              </div>
                              <span className="text-[12px] font-semibold tabular-nums text-ink/80">
                                {formatINR(l.priceAtPurchase * l.qty)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {NEXT[o.status] && (
                          <button
                            type="button"
                            onClick={() => void advance(o.id, o.status)}
                            className={cn(
                              "mt-3.5 w-full h-10 rounded-xl text-[12px] font-semibold",
                              "bg-ink text-white hover:bg-ink/90 transition-colors"
                            )}
                          >
                            Move to {NEXT[o.status]}
                          </button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>

              {grouped[col.key].length === 0 && (
                <p className="text-sm text-muted px-1 py-10 text-center">
                  No {col.label.toLowerCase()} orders
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </VendorHubShell>
  );
}
