import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DateRangePreset = "7d" | "30d" | "custom";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeFromPreset(preset: DateRangePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === "7d") from.setDate(from.getDate() - 7);
  else from.setDate(from.getDate() - 30);
  return { from: toISODate(from), to: toISODate(to) };
}

type Props = {
  className?: string;
};

/**
 * Income CSV export only — PDF / inventory / orders after review.
 */
export function ExportIncomeCsvButton({ className }: Props) {
  const defaults = useMemo(() => rangeFromPreset("30d"), []);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (p: DateRangePreset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = rangeFromPreset(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const download = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("ngc_token");
      const base = import.meta.env.VITE_API_URL as string;
      const qs = new URLSearchParams({
        from,
        to,
        format: "csv",
      });
      const res = await fetch(`${base}/vendor/reports/income?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `income-report-${from}-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-ink/12 bg-white hover:bg-cream text-ink text-base font-semibold h-14 px-5 transition"
      >
        <Download className="h-5 w-5 text-terracotta" />
        Export report
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[320px] rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_16px_40px_rgba(28,27,25,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted">
            Income · CSV
          </p>
          <p className="mt-1 text-[12px] text-muted leading-snug">
            Line items from your orders in the selected range.
          </p>

          <div className="mt-3 flex gap-1.5">
            {(
              [
                { id: "7d", label: "7d" },
                { id: "30d", label: "30d" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "flex-1 h-9 rounded-xl text-[12px] font-semibold",
                  preset === p.id
                    ? "bg-terracotta text-white"
                    : "bg-cream text-muted hover:text-ink"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted font-medium">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setPreset("custom");
                  setFrom(e.target.value);
                }}
                className="mt-1 h-10 w-full rounded-xl border border-ink/12 px-2 text-[13px] text-ink"
              />
            </label>
            <label className="text-[11px] text-muted font-medium">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setPreset("custom");
                  setTo(e.target.value);
                }}
                className="mt-1 h-10 w-full rounded-xl border border-ink/12 px-2 text-[13px] text-ink"
              />
            </label>
          </div>

          {error && (
            <p className="mt-2 text-[12px] text-red-700">{error}</p>
          )}

          <button
            type="button"
            disabled={loading || !from || !to}
            onClick={() => void download()}
            className="mt-3 w-full h-11 rounded-xl bg-ink text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download CSV
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
