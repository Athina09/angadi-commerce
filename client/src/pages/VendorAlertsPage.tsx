import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Mail, MessageSquare, PackagePlus, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";
import { api } from "@/lib/api";
import {
  getSocket,
  joinVendorRoom,
  type LowStockAlertEvent,
} from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";
import { cn, formatINR } from "@/lib/utils";

type AlertRow = {
  id: string;
  listingId: string;
  catalogName: string;
  category?: string;
  imageUrl?: string;
  stock: number;
  lowStockThreshold: number;
  price?: number;
  at: string;
  severity: "warn" | "critical";
  source?: "live" | "demo" | "sim";
};

type NotifyEvent = {
  id: string;
  catalogName: string;
  stock: number;
  at: string;
  message: string;
  channels: Array<{
    channel: "email" | "sms";
    to: string;
    ok: boolean;
    mode: "live" | "demo";
    detail: string;
  }>;
};

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";

const CRITICAL_LT = 4;

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

export function VendorAlertsPage() {
  const storeVendorId = useAuthStore((s) => s.user?.vendor?.id);
  const [vendorId, setVendorId] = useState<string | null>(storeVendorId ?? null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [notifies, setNotifies] = useState<NotifyEvent[]>([]);
  const [summary, setSummary] = useState({ critical: 0, warn: 0, watching: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [{ data }, prefs] = await Promise.all([
        api.get<{
          alerts: AlertRow[];
          vendorId?: string;
          summary?: { critical: number; warn: number; watching: number };
        }>("/vendor/alerts"),
        api
          .get<{
            email: string | null;
            phone: string | null;
            criticalBelow: number;
          }>("/vendor/alert-prefs")
          .catch(() => null),
      ]);
      setAlerts(data.alerts ?? []);
      if (data.vendorId) setVendorId(data.vendorId);
      if (data.summary) setSummary(data.summary);
      if (prefs?.data) {
        setEmail(prefs.data.email ?? "");
        setPhone(prefs.data.phone || "6379479639");
      } else {
        setPhone("6379479639");
      }
    } catch {
      setError("Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    const id = vendorId ?? storeVendorId;
    if (id) joinVendorRoom(id);
    const socket = getSocket();
    if (!socket) return;

    const onAlert = (payload: LowStockAlertEvent) => {
      if (id && payload.vendorId !== id) return;
      setAlerts((prev) =>
        [
          {
            id: `sock-${Date.now()}`,
            listingId: payload.listingId,
            catalogName: payload.catalogName,
            stock: payload.stock,
            lowStockThreshold: payload.lowStockThreshold,
            at: new Date().toISOString(),
            severity: (payload.stock < CRITICAL_LT ? "critical" : "warn") as
              | "critical"
              | "warn",
            source: "live" as const,
          },
          ...prev.filter((a) => a.listingId !== payload.listingId),
        ].slice(0, 20)
      );
    };

    const onNotify = (payload: NotifyEvent) => {
      setNotifies((prev) => [payload, ...prev].slice(0, 12));
      setToast(payload.message);
      window.setTimeout(() => setToast(null), 5000);
    };

    socket.on("low-stock-alert", onAlert);
    socket.on("stock-notify", onNotify);
    return () => {
      socket.off("low-stock-alert", onAlert);
      socket.off("stock-notify", onNotify);
    };
  }, [vendorId, storeVendorId]);

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.put("/vendor/alert-prefs", { phone });
      setToast("Alert phone saved");
      window.setTimeout(() => setToast(null), 2500);
    } catch {
      setToast("Could not save phone");
    } finally {
      setSavingPrefs(false);
    }
  };

  const testNotify = async () => {
    setTesting(true);
    try {
      const { data } = await api.post<{
        event: NotifyEvent | null;
        stock: number;
      }>("/vendor/alerts/test-notify");
      if (data.event) {
        setNotifies((prev) => [data.event!, ...prev].slice(0, 12));
        setToast(data.event.message);
      } else {
        setToast(`Stock set to ${data.stock} — check server logs for email/SMS`);
      }
      void load();
    } catch {
      setToast("Test notify failed");
    } finally {
      setTesting(false);
      window.setTimeout(() => setToast(null), 5000);
    }
  };

  const critical = useMemo(
    () => alerts.filter((a) => a.stock < CRITICAL_LT || a.severity === "critical"),
    [alerts]
  );

  return (
    <VendorHubShell title="Low-stock alerts">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-2xl bg-ink text-white px-5 py-4 shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted max-w-xl">
          Live email + SMS to <strong className="text-ink">6379479639</strong>{" "}
          when stock drops below {CRITICAL_LT} while you edit inventory.
          Carrier SMS needs TWILIO_* or FAST2SMS_API_KEY; on this Mac, Messages
          is used as a live path.
        </p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live notify
          </span>
          <Link
            to="/vendor/listings"
            className="h-10 inline-flex items-center rounded-xl bg-terracotta text-white px-4 text-sm font-semibold"
          >
            Open inventory
          </Link>
        </div>
      </div>

      {/* Alert destination prefs */}
      <section className="mb-7 rounded-[22px] border border-ink/6 bg-white p-5 shadow-[0_8px_24px_rgba(28,27,25,0.05)]">
        <h2 className="font-display text-xl font-bold">Notification channels</h2>
        <p className="text-sm text-muted mt-1 mb-4">
          Email goes to your account. Add a phone for SMS (demo or Twilio).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <label className="text-[12px] font-semibold text-muted">
            Email
            <div className="mt-1.5 flex items-center gap-2 h-12 rounded-xl border border-ink/10 bg-cream/50 px-3">
              <Mail className="h-4 w-4 text-muted" />
              <input
                value={email}
                readOnly
                className="flex-1 bg-transparent text-sm text-ink outline-none"
              />
            </div>
          </label>
          <label className="text-[12px] font-semibold text-muted">
            SMS phone
            <div className="mt-1.5 flex items-center gap-2 h-12 rounded-xl border border-ink/10 bg-cream/50 px-3">
              <MessageSquare className="h-4 w-4 text-muted" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98xxx xxxxx"
                className="flex-1 bg-transparent text-sm text-ink outline-none"
              />
            </div>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingPrefs}
            onClick={() => void savePrefs()}
            className="h-10 rounded-xl bg-ink text-white px-4 text-sm font-semibold disabled:opacity-60"
          >
            {savingPrefs ? "Saving…" : "Save phone"}
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={() => void testNotify()}
            className="h-10 rounded-xl border border-ink/15 bg-white px-4 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {testing ? "Sending…" : "Test alert (stock → 3)"}
          </button>
        </div>
      </section>

      {/* Live notify feed */}
      {notifies.length > 0 && (
        <section className="mb-7 rounded-[22px] border border-emerald-200/80 bg-emerald-50/40 p-5">
          <h2 className="font-display text-lg font-bold mb-3">
            Live email / SMS log
          </h2>
          <ul className="space-y-2">
            {notifies.map((n) => (
              <li
                key={n.id}
                className="rounded-xl bg-white border border-ink/6 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-ink">{n.message}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {n.channels?.map((c, i) => (
                    <span
                      key={`${n.id}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium"
                    >
                      {c.channel === "email" ? (
                        <Mail className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {c.channel} → {c.to} · {c.mode}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1">
                  {new Date(n.at).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-3 gap-3 mb-7 max-w-2xl">
        {[
          {
            label: `Critical (<${CRITICAL_LT})`,
            value: critical.length || summary.critical,
            tone: "bg-red-50 text-red-800 border-red-100",
          },
          {
            label: "Warning",
            value: summary.warn,
            tone: "bg-amber-50 text-amber-900 border-amber-100",
          },
          {
            label: "Watching",
            value: summary.watching || alerts.length,
            tone: "bg-white text-ink border-ink/8",
          },
        ].map((k) => (
          <div
            key={k.label}
            className={cn(
              "rounded-2xl border px-4 py-3 shadow-[0_4px_16px_rgba(28,27,25,0.04)]",
              k.tone
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.16em] font-semibold opacity-70">
              {k.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {loading && <p className="text-sm text-muted">Loading alerts…</p>}
      {error && <p className="text-sm text-red-700 mb-4">{error}</p>}

      {!loading && alerts.length === 0 && (
        <div className="rounded-[24px] bg-white border border-ink/6 p-10 text-center max-w-lg">
          <PackagePlus className="mx-auto h-10 w-10 text-muted mb-3" />
          <p className="text-muted text-sm">
            No inventory yet. Add listings, or hit Test alert to fire email/SMS.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {alerts.map((a, i) => {
          const isCrit = a.stock < CRITICAL_LT || a.severity === "critical";
          return (
            <motion.article
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className={cn(
                "rounded-[20px] border bg-white overflow-hidden shadow-[0_8px_24px_rgba(28,27,25,0.06)]",
                isCrit ? "border-red-200" : "border-amber-200"
              )}
            >
              <div className="relative h-[148px] bg-cream">
                <ProductThumb
                  src={a.imageUrl}
                  alt={a.catalogName}
                  className="absolute inset-0 h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                <span
                  className={cn(
                    "absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    isCrit
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-900"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {isCrit ? "critical" : "warn"}
                </span>
                {typeof a.price === "number" && a.price > 0 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-ink tabular-nums">
                    {formatINR(a.price)}
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted font-semibold">
                  {a.category ?? "Inventory"}
                </p>
                <h3 className="mt-1 font-semibold text-ink leading-snug line-clamp-2">
                  {a.catalogName}
                </h3>
                <p className="mt-2 text-[13px] text-muted">
                  Stock{" "}
                  <span
                    className={cn(
                      "font-bold",
                      isCrit ? "text-red-700" : "text-amber-800"
                    )}
                  >
                    {a.stock}
                  </span>
                  {isCrit && (
                    <span className="ml-2 text-[11px] font-semibold text-red-600">
                      · email/SMS trigger (&lt;{CRITICAL_LT})
                    </span>
                  )}
                </p>
                <Link
                  to="/vendor/listings"
                  className="mt-3 inline-flex h-9 items-center rounded-xl bg-ink text-white px-3.5 text-[12px] font-semibold"
                >
                  Restock in inventory
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </VendorHubShell>
  );
}
