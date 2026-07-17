import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { LiveProduct } from "@/data/vendorDashboardMock";
import { Sparkline } from "@/components/vendor/Sparkline";
import { cn, formatINR } from "@/lib/utils";

type SortKey =
  | "name"
  | "stock"
  | "unitsSold"
  | "revenue"
  | "liveViewers"
  | "conversionPct"
  | "price";

type Props = {
  products: LiveProduct[];
  pulsingIds: Set<string>;
  onStockChange: (id: string, stock: number) => void;
  onPriceChange: (id: string, price: number) => void;
  onAddProduct?: () => void;
};

function stockMeta(stock: number) {
  if (stock <= 0)
    return { label: "Out of Stock", className: "bg-ink/8 text-muted" };
  if (stock < 3)
    return { label: "Critical", className: "bg-red-50 text-red-700" };
  if (stock <= 10)
    return { label: "Low Stock", className: "bg-amber-50 text-amber-800" };
  return { label: "Healthy", className: "bg-emerald-50 text-emerald-800" };
}

function conversionLabel(pct: number) {
  if (pct >= 24) return "Excellent";
  if (pct >= 18) return "Strong";
  if (pct >= 12) return "Average";
  return "Watch";
}

export function LiveProductTable({
  products,
  pulsingIds,
  onStockChange,
  onPriceChange,
  onAddProduct,
}: Props) {
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [stockFilter, setStockFilter] = useState<
    "all" | "healthy" | "low" | "critical" | "out"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );
  const [category, setCategory] = useState<string>("all");

  const rows = useMemo(() => {
    let list = [...products];
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (lowOnly) list = list.filter((p) => p.stock > 0 && p.stock <= 10);
    if (stockFilter === "healthy") list = list.filter((p) => p.stock > 10);
    if (stockFilter === "low")
      list = list.filter((p) => p.stock > 2 && p.stock <= 10);
    if (stockFilter === "critical")
      list = list.filter((p) => p.stock > 0 && p.stock < 3);
    if (stockFilter === "out") list = list.filter((p) => p.stock <= 0);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return list;
  }, [products, category, lowOnly, stockFilter, query, sortKey, sortDir]);

  function exportCsv() {
    const header = [
      "name",
      "category",
      "freshness",
      "daysLeft",
      "stock",
      "unitsSold",
      "revenue",
      "views",
      "conversion",
      "price",
    ];
    const lines = [
      header.join(","),
      ...rows.map((p) =>
        [
          JSON.stringify(p.name),
          p.category,
          p.freshnessPercent ?? "",
          p.daysLeft ?? "",
          p.stock,
          p.unitsSold,
          p.revenue,
          p.liveViewers,
          p.conversionPct,
          p.price,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "live-products.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="h-full flex flex-col rounded-[24px] bg-white border border-ink/6 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-7">
        <div>
          <h2 className="font-display text-[32px] font-bold tracking-tight text-ink leading-none">
            Live Products
          </h2>
          <p className="mt-2 text-base text-muted max-w-xl leading-relaxed">
            Monitor inventory, sales, pricing, and customer engagement in real
            time.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <IconBtn label="Export CSV" onClick={exportCsv}>
            <Download className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Filter" onClick={() => setLowOnly((v) => !v)}>
            <Filter className="h-4 w-4" />
          </IconBtn>
          <button
            type="button"
            onClick={onAddProduct}
            className="inline-flex items-center gap-2 h-11 rounded-xl bg-terracotta text-white px-4 text-sm font-semibold hover:bg-terracotta-dark transition"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-6">
        <div className="relative w-full xl:w-[420px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full h-12 rounded-2xl bg-cream/80 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-terracotta/25"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 flex-1 xl:justify-end">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 rounded-2xl bg-cream/80 px-4 text-[15px] font-medium"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) =>
              setStockFilter(e.target.value as typeof stockFilter)
            }
            className="h-12 rounded-2xl bg-cream/80 px-4 text-[15px] font-medium"
          >
            <option value="all">Stock status</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low stock</option>
            <option value="critical">Critical</option>
            <option value="out">Out of stock</option>
          </select>
          <select
            value={`${sortKey}-${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split("-") as [SortKey, "asc" | "desc"];
              setSortKey(k);
              setSortDir(d);
            }}
            className="h-12 rounded-2xl bg-cream/80 px-4 text-[15px] font-medium"
          >
            <option value="revenue-desc">Sort: Revenue</option>
            <option value="unitsSold-desc">Sort: Units sold</option>
            <option value="liveViewers-desc">Sort: Views</option>
            <option value="conversionPct-desc">Sort: Conversion</option>
            <option value="stock-asc">Sort: Stock (low first)</option>
            <option value="name-asc">Sort: Name</option>
          </select>
          <label className="inline-flex items-center gap-2.5 h-12 px-3 text-[15px] font-semibold text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="h-4 w-4 rounded border-ink/25 text-terracotta focus:ring-terracotta"
            />
            Low stock only
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto -mx-2">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="text-muted">
              {[
                "Product",
                "Freshness",
                "Inventory",
                "Units Sold",
                "Revenue",
                "Views",
                "Conversion",
                "Trend",
                "Price",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="pb-4 px-3 first:pl-2 last:pr-2 text-[15px] font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const stock = stockMeta(p.stock);
              const conv = conversionLabel(p.conversionPct);
              const freshBand = p.freshnessBand ?? "fresh";
              const freshClass =
                freshBand === "fresh"
                  ? "bg-emerald-50 text-emerald-800"
                  : freshBand === "fading"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-red-50 text-red-700";
              return (
                <motion.tr
                  key={p.id}
                  layout
                  whileHover={{ backgroundColor: "rgba(244,241,234,0.65)" }}
                  className={cn(
                    "border-t border-ink/5 cursor-pointer transition-colors",
                    pulsingIds.has(p.id) && "bg-terracotta/8"
                  )}
                >
                  <td className="py-0 px-3 first:pl-2 h-[72px]">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          p.imageUrl ||
                          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80"
                        }
                        alt={p.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";
                        }}
                        className="h-16 w-16 rounded-2xl object-cover bg-cream shadow-sm ring-1 ring-ink/8"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-base truncate">
                          {p.name}
                        </p>
                        <p className="text-sm text-muted mt-0.5">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          freshClass
                        )}
                      >
                        {p.freshnessText ??
                          (p.freshnessPercent != null
                            ? `${p.freshnessPercent}%`
                            : "—")}
                      </span>
                      {p.daysSurviveText && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold",
                            (p.daysLeft ?? 99) <= 1
                              ? "text-red-700"
                              : "text-muted"
                          )}
                        >
                          {p.daysSurviveText}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={() =>
                        onStockChange(p.id, Math.max(0, p.stock - 1))
                      }
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onStockChange(p.id, p.stock + 1);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold",
                        stock.className
                      )}
                      title="Click −1 · right-click +1"
                    >
                      {stock.label} · {p.stock}
                    </button>
                  </td>
                  <td className="px-3 text-base font-medium tabular-nums">
                    {p.unitsSold}
                  </td>
                  <td className="px-3">
                    <p className="font-display text-lg font-bold tabular-nums text-ink">
                      {formatINR(p.revenue)}
                    </p>
                    <Delta pct={p.revenueChangePct} />
                  </td>
                  <td className="px-3">
                    <span className="inline-flex items-center gap-1.5 text-base font-semibold tabular-nums">
                      <Eye className="h-4 w-4 text-muted" />
                      {p.liveViewers}
                    </span>
                    <Delta pct={p.viewsChangePct} />
                  </td>
                  <td className="px-3">
                    <p className="text-base font-semibold tabular-nums">
                      {p.conversionPct.toFixed(0)}%
                    </p>
                    <span className="text-xs font-semibold text-terracotta">
                      {conv}
                    </span>
                  </td>
                  <td className="px-3">
                    <Sparkline
                      data={p.conversionTrend}
                      className="h-9 w-24"
                    />
                  </td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={() =>
                        onPriceChange(
                          p.id,
                          Math.max(1, Math.round(p.price + 5))
                        )
                      }
                      className="font-semibold text-base tabular-nums hover:text-terracotta"
                    >
                      {formatINR(p.price)}
                    </button>
                  </td>
                  <td className="px-3 last:pr-2 relative">
                    <button
                      type="button"
                      className="h-10 w-10 rounded-xl hover:bg-cream flex items-center justify-center text-muted"
                      onClick={() =>
                        setMenuOpen((id) => (id === p.id ? null : p.id))
                      }
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {menuOpen === p.id && (
                      <div className="absolute right-2 top-14 z-20 w-44 rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-ink/5 py-2 text-sm">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-cream"
                          onClick={() => {
                            onStockChange(p.id, p.stock + 5);
                            setMenuOpen(null);
                          }}
                        >
                          Restock +5
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-cream"
                          onClick={() => {
                            onPriceChange(p.id, Math.max(1, p.price - 5));
                            setMenuOpen(null);
                          }}
                        >
                          Lower price ₹5
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-cream text-muted"
                          onClick={() => setMenuOpen(null)}
                        >
                          View analytics
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-center text-muted py-14 text-base">
            No products match filters.
          </p>
        )}
      </div>
    </section>
  );
}

function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold mt-0.5",
        up ? "text-emerald-600" : "text-red-600"
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="h-11 w-11 rounded-xl bg-cream/90 text-ink/70 hover:text-ink hover:bg-cream flex items-center justify-center transition"
    >
      {children}
    </button>
  );
}
