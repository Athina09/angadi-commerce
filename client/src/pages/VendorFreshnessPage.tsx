import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RefreshCw,
  SwitchCamera,
  X,
} from "lucide-react";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";
import { api } from "@/lib/api";
import {
  freshnessBadgeClass,
  freshnessConfidenceClass,
  hybridFreshness,
} from "@/lib/freshness";
import { getSocket, joinVendorRoom, type FreshnessUpdatedEvent } from "@/lib/socket";
import { cn } from "@/lib/utils";

type ListingRow = {
  id: string;
  stock: number;
  lastCheckedAt?: string;
  lastCheckQualityScore?: number;
  intakeQualityScore?: number;
  listedAt: string;
  catalog: {
    name: string;
    category: string;
    imageUrl: string;
    shelfLifeDays: number;
    decayCurveType?: "FAST_EARLY" | "LINEAR" | "SLOW";
    unit: string;
  };
  freshness?: {
    percent: number;
    band: string;
    text: string;
    confidence: "verified" | "estimated";
    confidenceText: string;
    daysLeft?: number;
    daysSurviveText?: string;
  };
};

type QualityResult = {
  qualityScore: number;
  components: {
    blemishRatio: number;
    blemishScore: number;
    saturationScore?: number;
  };
  method: string;
  note: string;
  source?: string;
  model?: string;
};

/**
 * Dedicated freshness feature — photograph each SKU, get OpenCV heuristic score.
 * Not a trained spoilage classifier.
 */
export function VendorFreshnessPage() {
  const [params] = useSearchParams();
  const preselect = params.get("listing");
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(preselect);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [manualPct, setManualPct] = useState(100);
  const [manualNote, setManualNote] = useState("");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{
        listings: ListingRow[];
        vendorId?: string;
      }>("/vendor/listings");
      setListings(data.listings ?? []);
      if (data.vendorId) {
        setVendorId(data.vendorId);
        joinVendorRoom(data.vendorId);
      }
      const ids = new Set((data.listings ?? []).map((l) => l.id));
      if (preselect && ids.has(preselect)) setActiveId(preselect);
      else if (!activeId && data.listings?.[0]) setActiveId(data.listings[0].id);
    } catch {
      setError("Could not load listings");
    } finally {
      setLoading(false);
    }
  }, [activeId, preselect]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onFresh = (ev: FreshnessUpdatedEvent) => {
      if (vendorId && ev.vendorId !== vendorId) return;
      setListings((prev) =>
        prev.map((l) =>
          l.id === ev.listingId
            ? {
                ...l,
                lastCheckQualityScore: ev.lastCheckQualityScore,
                lastCheckedAt: new Date().toISOString(),
                freshness: {
                  ...(l.freshness ?? {
                    confidence: "verified" as const,
                    confidenceText: "verified today",
                    band: ev.freshnessBand,
                    text: ev.freshnessText,
                    percent: ev.freshnessPercent,
                  }),
                  percent: ev.freshnessPercent,
                  band: ev.freshnessBand,
                  text: ev.freshnessText,
                  confidence: "verified",
                  confidenceText: "verified today",
                },
              }
            : l
        )
      );
      if (ev.listingId === activeId) {
        setManualPct(ev.freshnessPercent);
      }
    };
    s.on("freshness-updated", onFresh);
    return () => {
      s.off("freshness-updated", onFresh);
    };
  }, [vendorId, activeId]);

  const active = listings.find((l) => l.id === activeId) ?? null;

  useEffect(() => {
    if (!active) return;
    const pct = Math.round(
      (active.freshness?.percent ??
        (active.lastCheckQualityScore ?? 1) * 100)
    );
    setManualPct(pct);
  }, [active?.id, active?.lastCheckQualityScore, active?.freshness?.percent]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function startCamera() {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      showToast("Camera blocked — use Upload instead");
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], `freshness-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        void acceptPhoto(f);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  async function acceptPhoto(f: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setFile(f);
    setPreviewUrl(url);
    setQuality(null);
    stopCamera();
    // Score + save immediately so badges/inventory update (e.g. rotten → discard)
    await scorePhoto(true, f);
  }

  function clearPhoto() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setQuality(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function scorePhoto(apply: boolean, photo?: File | null) {
    if (!active) return;
    const upload = photo !== undefined ? photo : file;
    if (!upload) {
      showToast("Upload or snap a photo first");
      return;
    }

    setBusy(true);
    setToast(null);
    try {
      const token = localStorage.getItem("ngc_token");
      const base = (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
      const fd = new FormData();
      fd.append("photo", upload, upload.name || "produce.jpg");
      fd.append("apply", apply ? "true" : "false");

      const res = await fetch(
        `${base}/vendor/listings/${active.id}/quality-check`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(errBody || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        quality: QualityResult;
        listing?: ListingRow;
        applied?: boolean;
      };
      setQuality(data.quality);
      if (data.listing) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === data.listing!.id ? { ...l, ...data.listing } : l
          )
        );
      }
      const pct = Math.round(data.quality.qualityScore * 100);
      const name = active.catalog.name.split("(")[0].trim();
      showToast(
        apply
          ? pct < 35
            ? `Saved ${pct}% · ${name} marked discard / low quality`
            : `Saved ${pct}% for ${name}`
          : `Preview ${pct}% — tap Apply to save`
      );
    } catch (e) {
      console.error(e);
      showToast("Scoring failed — check API / ml-service");
    } finally {
      setBusy(false);
    }
  }

  async function applyTag(
    tag: "good" | "fading" | "discard_soon" | "rotten"
  ) {
    if (!active) return;
    setBusy(true);
    try {
      const { data } = await api.patch<{ listing: ListingRow }>(
        `/vendor/listings/${active.id}/recheck`,
        { tag }
      );
      setListings((prev) =>
        prev.map((l) =>
          l.id === data.listing.id ? { ...l, ...data.listing } : l
        )
      );
      setQuality(null);
      setManualPct(
        data.listing.freshness?.percent ??
          Math.round((data.listing.lastCheckQualityScore ?? 0) * 100)
      );
      showToast(
        `Manual tag saved · ${data.listing.freshness?.text ?? tag}`
      );
    } catch {
      showToast("Could not save tag");
    } finally {
      setBusy(false);
    }
  }

  async function saveManualScore() {
    if (!active) return;
    setBusy(true);
    try {
      const { data } = await api.patch<{ listing: ListingRow }>(
        `/vendor/listings/${active.id}/recheck`,
        {
          qualityPercent: manualPct,
          note: manualNote.trim() || undefined,
        }
      );
      setListings((prev) =>
        prev.map((l) =>
          l.id === data.listing.id ? { ...l, ...data.listing } : l
        )
      );
      setQuality(null);
      showToast(
        `Saved manual ${manualPct}% · ${data.listing.freshness?.text ?? ""}`
      );
    } catch {
      showToast("Could not save manual score");
    } finally {
      setBusy(false);
    }
  }

  return (
    <VendorHubShell title="Freshness score">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md rounded-2xl bg-ink text-white px-5 py-3 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <p className="mb-6 text-sm text-muted max-w-2xl">
        Upload or snap a photo of{" "}
        <strong className="text-ink/80">this product</strong> — we score blemish
        + saturation (OpenCV). Auto-scores on upload. Not a trained spoilage
        model.
      </p>

      {loading ? (
        <p className="text-muted text-sm">Loading shelf…</p>
      ) : error ? (
        <p className="text-red-700 text-sm">{error}</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-2">
              Your items · tap to score
            </p>
            {listings.map((l) => {
              const fresh =
                l.freshness ??
                hybridFreshness({
                  shelfLifeDays: l.catalog.shelfLifeDays,
                  decayCurveType: l.catalog.decayCurveType,
                  lastCheckedAt: l.lastCheckedAt ?? l.listedAt,
                  lastCheckQualityScore: l.lastCheckQualityScore ?? 1,
                });
              const selected = l.id === activeId;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setActiveId(l.id);
                    setQuality(null);
                    clearPhoto();
                  }}
                  className={cn(
                    "w-full text-left rounded-2xl border p-3 flex gap-3 transition",
                    selected
                      ? "border-vh-blue bg-vh-blue-soft/50 ring-1 ring-vh-blue/30"
                      : "border-ink/8 bg-white hover:border-ink/20"
                  )}
                >
                  <img
                    src={l.catalog.imageUrl}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover shrink-0 bg-cream"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate">
                      {l.catalog.name.split("(")[0].trim()}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {l.catalog.category} · Q {fresh.percent}%
                    </p>
                    <p
                      className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        fresh.daysLeft <= 1 ? "text-red-700" : "text-muted"
                      )}
                    >
                      {fresh.daysSurviveText ??
                        (fresh.daysLeft <= 0
                          ? "0 days left"
                          : `~${fresh.daysLeft} days left`)}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        freshnessBadgeClass(
                          (fresh.band || fresh.label) as
                            | "fresh"
                            | "fading"
                            | "discard_soon"
                            | "expired"
                        )
                      )}
                    >
                      {fresh.percent}%
                    </span>
                  </div>
                </button>
              );
            })}
            {listings.length === 0 && (
              <p className="text-sm text-muted py-8 text-center">
                No listings — add products in Live inventory first.
              </p>
            )}
          </aside>

          <section className="xl:col-span-8 rounded-[22px] border border-ink/6 bg-white p-5 sm:p-6 shadow-[0_8px_28px_rgba(28,27,25,0.05)]">
            {!active ? (
              <p className="text-muted text-sm py-16 text-center">
                Select an item to photograph
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight">
                      {active.catalog.name.split("(")[0].trim()}
                    </h2>
                    <p className="text-sm text-muted mt-0.5">
                      {active.catalog.category} ·{" "}
                      {active.catalog.decayCurveType?.replace("_", " ") ??
                        "LINEAR"}{" "}
                      curve
                    </p>
                  </div>
                  {active.freshness && (
                    <div className="text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          freshnessBadgeClass(
                            active.freshness.band as
                              | "fresh"
                              | "fading"
                              | "discard_soon"
                              | "expired"
                          )
                        )}
                      >
                        {active.freshness.text}
                      </span>
                      <p
                        className={cn(
                          "text-[12px] font-semibold mt-1.5 tabular-nums",
                          (active.freshness.daysLeft ?? 99) <= 1
                            ? "text-red-700"
                            : "text-vh-text"
                        )}
                      >
                        {active.freshness.daysSurviveText ??
                          hybridFreshness({
                            shelfLifeDays: active.catalog.shelfLifeDays,
                            decayCurveType: active.catalog.decayCurveType,
                            lastCheckedAt:
                              active.lastCheckedAt ?? active.listedAt,
                            lastCheckQualityScore:
                              active.lastCheckQualityScore ?? 1,
                          }).daysSurviveText}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] mt-0.5",
                          freshnessConfidenceClass(active.freshness.confidence)
                        )}
                      >
                        {active.freshness.confidenceText} · shelf{" "}
                        {active.catalog.shelfLifeDays}d
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl overflow-hidden bg-[#0f1419] aspect-[4/3] relative flex items-center justify-center">
                    {camOn ? (
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Your photo"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <img
                          src={active.catalog.imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-25"
                        />
                        <ImagePlus className="relative h-10 w-10 text-white/90" />
                        <p className="relative text-sm font-semibold text-white">
                          Upload a photo of this item
                        </p>
                        <p className="relative text-[11px] text-white/70 max-w-[220px]">
                          Catalog image is only a placeholder — scoring needs
                          your shot.
                        </p>
                      </div>
                    )}

                    {previewUrl && !camOn && (
                      <span className="absolute top-3 left-3 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 shadow">
                        Your photo
                      </span>
                    )}
                    {previewUrl && !camOn && (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute top-3 right-3 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
                        aria-label="Clear photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 justify-center">
                      {!camOn ? (
                        <>
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-vh-blue text-white px-4 py-2 text-[12px] font-semibold shadow"
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                            {previewUrl ? "Replace photo" : "Upload photo"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void startCamera()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[12px] font-semibold shadow"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Camera
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={captureFrame}
                            className="inline-flex items-center gap-1.5 rounded-full bg-vh-blue text-white px-4 py-2 text-[12px] font-semibold shadow"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Snap & score
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[12px] font-semibold"
                          >
                            <SwitchCamera className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                    {/* Gallery picker only — no capture= so desktop gets file dialog */}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f) void acceptPhoto(f);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  <div className="flex flex-col">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-2">
                      Score this item
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        disabled={busy || !file}
                        onClick={() => void scorePhoto(false)}
                        className="h-10 px-4 rounded-xl border border-ink/12 text-[12px] font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Re-score
                      </button>
                      <button
                        type="button"
                        disabled={busy || !file}
                        onClick={() => void scorePhoto(true)}
                        className="h-10 px-4 rounded-xl bg-vh-blue text-white text-[12px] font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Apply to listing
                      </button>
                    </div>
                    {!file && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
                        Upload a photo first — then we score automatically.
                      </p>
                    )}

                    <p className="text-[11px] text-muted mb-2">
                      Manual freshness (no photo)
                    </p>
                    <div className="rounded-2xl border border-ink/8 bg-cream/40 p-3 mb-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={manualPct}
                          onChange={(e) =>
                            setManualPct(Number(e.target.value))
                          }
                          className="flex-1 accent-[#2f6fed]"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={manualPct}
                          onChange={(e) =>
                            setManualPct(
                              Math.max(
                                0,
                                Math.min(100, Number(e.target.value) || 0)
                              )
                            )
                          }
                          className="w-16 h-9 rounded-lg border border-ink/12 bg-white px-2 text-center text-sm font-semibold tabular-nums"
                        />
                        <span className="text-xs font-bold text-muted">%</span>
                      </div>
                      <input
                        type="text"
                        value={manualNote}
                        onChange={(e) => setManualNote(e.target.value)}
                        placeholder="Optional note (e.g. mold on cut surface)"
                        className="w-full h-9 rounded-lg border border-ink/12 bg-white px-3 text-[12px]"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveManualScore()}
                        className="w-full h-10 rounded-xl bg-vh-blue text-white text-[12px] font-semibold disabled:opacity-50"
                      >
                        Save manual score
                      </button>
                    </div>

                    <p className="text-[11px] text-muted mb-2">Quick tags</p>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {(
                        [
                          ["good", "Good", "100"],
                          ["fading", "Fading", "60"],
                          ["discard_soon", "Discard", "20"],
                          ["rotten", "Rotten", "12"],
                        ] as const
                      ).map(([id, label, sc]) => (
                        <button
                          key={id}
                          type="button"
                          disabled={busy}
                          onClick={() => void applyTag(id)}
                          className="rounded-xl border border-ink/10 bg-cream/50 px-1.5 py-2.5 text-center text-[11px] font-semibold disabled:opacity-50"
                        >
                          {label}
                          <span className="block text-[10px] text-muted font-medium mt-0.5">
                            {sc}%
                          </span>
                        </button>
                      ))}
                    </div>

                    {busy && !quality ? (
                      <div className="mt-auto rounded-2xl border border-vh-border bg-vh-blue-soft/40 p-6 flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-vh-blue" />
                        <p className="text-sm font-medium text-vh-text">
                          Scoring your photo…
                        </p>
                      </div>
                    ) : quality ? (
                      <div className="mt-auto rounded-2xl border border-vh-border bg-vh-blue-soft/40 p-4">
                        <p className="font-display text-3xl font-bold text-vh-blue tabular-nums">
                          {Math.round(quality.qualityScore * 100)}
                          <span className="text-lg font-semibold text-vh-muted">
                            %
                          </span>
                        </p>
                        <p className="text-[12px] font-semibold text-vh-text mt-1">
                          Quality score · {quality.source ?? "opencv"}
                        </p>
                        {active && (
                          <p
                            className={cn(
                              "text-[13px] font-bold mt-2",
                              quality.qualityScore < 0.35
                                ? "text-red-700"
                                : "text-vh-text"
                            )}
                          >
                            {
                              hybridFreshness({
                                shelfLifeDays: active.catalog.shelfLifeDays,
                                decayCurveType: active.catalog.decayCurveType,
                                lastCheckedAt: new Date().toISOString(),
                                lastCheckQualityScore: quality.qualityScore,
                              }).daysSurviveText
                            }
                          </p>
                        )}
                        <p className="text-[11px] text-muted mt-0.5">
                          {quality.method}
                        </p>
                        <ul className="mt-3 space-y-1 text-[12px] text-vh-text">
                          <li className="flex justify-between gap-2">
                            <span>Blemish score</span>
                            <span className="font-semibold tabular-nums">
                              {quality.components.blemishScore}
                            </span>
                          </li>
                          <li className="flex justify-between gap-2">
                            <span>Blemish ratio</span>
                            <span className="font-semibold tabular-nums">
                              {quality.components.blemishRatio}
                            </span>
                          </li>
                          {quality.components.saturationScore != null && (
                            <li className="flex justify-between gap-2">
                              <span>Saturation (leafy)</span>
                              <span className="font-semibold tabular-nums">
                                {quality.components.saturationScore}
                              </span>
                            </li>
                          )}
                        </ul>
                        <p className="mt-3 text-[10px] text-muted italic leading-relaxed">
                          {quality.note}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-auto rounded-2xl border border-dashed border-ink/12 bg-cream/40 p-4 text-[13px] text-muted">
                        Tap <strong className="text-ink/70">Upload photo</strong>{" "}
                        and pick an image from your library. Scoring runs
                        automatically.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </VendorHubShell>
  );
}
