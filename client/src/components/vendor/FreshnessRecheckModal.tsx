import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  SwitchCamera,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
};

type Props = {
  listingId: string;
  productName: string;
  category: string;
  imageUrl?: string;
  initialPercent?: number;
  onClose: () => void;
  onSaved: (listing: unknown) => void;
};

const TAGS = [
  {
    id: "good" as const,
    label: "Good",
    score: "100%",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    id: "fading" as const,
    label: "Fading",
    score: "60%",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "discard_soon" as const,
    label: "Discard",
    score: "20%",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "rotten" as const,
    label: "Rotten",
    score: "12%",
    tone: "bg-red-100 text-red-800 border-red-300",
  },
];

export function FreshnessRecheckModal({
  listingId,
  productName,
  category,
  imageUrl,
  initialPercent = 100,
  onClose,
  onSaved,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [manualPct, setManualPct] = useState(initialPercent);
  const [manualNote, setManualNote] = useState("");
  const [camOn, setCamOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

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

  function setPhoto(f: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setFile(f);
    setPreviewUrl(url);
    setQuality(null);
    stopCamera();
  }

  function clearPhoto() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setQuality(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function startCamera() {
    stopCamera();
    setError(null);
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
      setError("Camera blocked — use Upload instead");
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
        setPhoto(
          new File([blob], `recheck-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
        );
      },
      "image/jpeg",
      0.92
    );
  }

  async function applyTag(
    tag: "good" | "fading" | "discard_soon" | "rotten"
  ) {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.patch<{ listing: unknown }>(
        `/vendor/listings/${listingId}/recheck`,
        { tag }
      );
      onSaved(data.listing);
      onClose();
    } catch {
      setError("Could not save tag recheck");
    } finally {
      setBusy(false);
    }
  }

  async function saveManual() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.patch<{ listing: unknown }>(
        `/vendor/listings/${listingId}/recheck`,
        {
          qualityPercent: manualPct,
          note: manualNote.trim() || undefined,
        }
      );
      onSaved(data.listing);
      onClose();
    } catch {
      setError("Could not save manual score");
    } finally {
      setBusy(false);
    }
  }

  async function runPhoto(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Snap or upload a photo first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("runPhoto", "true");
      const token = localStorage.getItem("ngc_token");
      const base = import.meta.env.VITE_API_URL as string;
      const res = await fetch(`${base}/vendor/listings/${listingId}/recheck`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("recheck failed");
      const data = (await res.json()) as {
        listing: unknown;
        quality?: QualityResult;
      };
      if (data.quality) setQuality(data.quality);
      onSaved(data.listing);
      if (!data.quality) onClose();
    } catch {
      setError("Photo recheck failed — try a tag instead");
    } finally {
      setBusy(false);
    }
  }

  async function previewOnly() {
    if (!file) {
      setError("Snap or upload a photo first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("apply", "false");
      const token = localStorage.getItem("ngc_token");
      const base = import.meta.env.VITE_API_URL as string;
      const res = await fetch(
        `${base}/vendor/listings/${listingId}/quality-check`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }
      );
      if (!res.ok) throw new Error("quality failed");
      const data = (await res.json()) as { quality: QualityResult };
      setQuality(data.quality);
    } catch {
      setError("Quality preview failed");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-vh-border shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-display text-xl font-bold text-vh-text">
              Recheck freshness
            </p>
            <p className="text-[13px] text-vh-muted mt-0.5">
              {productName.split("(")[0].trim()} · {category}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-vh-muted hover:bg-vh-blue-soft"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[12px] text-vh-muted leading-relaxed mb-4">
          Set a <strong>manual %</strong>, tap a quick tag, or{" "}
          <strong>open camera / upload</strong> a photo (OpenCV heuristics —
          not a trained spoilage model).
        </p>

        <div className="rounded-xl border border-vh-border bg-[#f7f9fc] px-3 py-3 mb-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-vh-muted">
            Manual score
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={manualPct}
              onChange={(e) => setManualPct(Number(e.target.value))}
              className="flex-1 accent-[#2f6fed]"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={manualPct}
              onChange={(e) =>
                setManualPct(
                  Math.max(0, Math.min(100, Number(e.target.value) || 0))
                )
              }
              className="w-14 h-9 rounded-lg border border-vh-border bg-white px-2 text-center text-sm font-semibold"
            />
            <span className="text-xs font-bold text-vh-muted">%</span>
          </div>
          <input
            type="text"
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full h-9 rounded-lg border border-vh-border bg-white px-3 text-[12px]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveManual()}
            className="w-full h-10 rounded-xl bg-vh-blue text-white text-[12px] font-semibold disabled:opacity-50"
          >
            Save manual score
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busy}
              onClick={() => void applyTag(t.id)}
              className={cn(
                "rounded-xl border px-1 py-2.5 text-center disabled:opacity-50",
                t.tone
              )}
            >
              <p className="text-[11px] font-semibold">{t.label}</p>
              <p className="text-[10px] mt-0.5 opacity-80">{t.score}</p>
            </button>
          ))}
        </div>

        <form onSubmit={(e) => void runPhoto(e)} className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-vh-border bg-[#0f1419] aspect-[4/3] relative">
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
                alt="Capture"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-20"
                  />
                )}
                <Camera className="relative h-8 w-8 text-white/90" />
                <p className="relative text-[12px] font-semibold text-white">
                  Open camera or upload a photo
                </p>
              </div>
            )}

            {previewUrl && !camOn && (
              <>
                <span className="absolute top-2 left-2 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5">
                  Your photo
                </span>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 rounded-full bg-black/55 p-1.5 text-white"
                  aria-label="Clear photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 justify-center">
              {!camOn ? (
                <>
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-vh-blue text-white px-3.5 py-2 text-[12px] font-semibold shadow"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Open camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[12px] font-semibold shadow"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {previewUrl ? "Replace" : "Upload"}
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
                    Snap photo
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

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) setPhoto(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !file}
              onClick={() => void previewOnly()}
              className="flex-1 h-10 rounded-xl border border-vh-border text-[12px] font-semibold disabled:opacity-50"
            >
              Preview score
            </button>
            <button
              type="submit"
              disabled={busy || !file}
              className="flex-1 h-10 rounded-xl bg-vh-blue text-white text-[12px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Apply photo score
            </button>
          </div>
        </form>

        {quality && (
          <div className="mt-4 rounded-xl bg-vh-blue-soft/60 border border-vh-border px-3 py-3">
            <p className="text-[13px] font-semibold text-vh-text">
              Quality {Math.round(quality.qualityScore * 100)}%
            </p>
            <p className="text-[11px] text-vh-muted mt-1">{quality.method}</p>
            <ul className="mt-2 text-[11px] text-vh-text space-y-0.5">
              <li>Blemish score: {quality.components.blemishScore}</li>
              <li>Blemish ratio: {quality.components.blemishRatio}</li>
              {quality.components.saturationScore != null && (
                <li>Saturation: {quality.components.saturationScore}</li>
              )}
            </ul>
            <p className="mt-2 text-[10px] text-vh-muted italic">{quality.note}</p>
          </div>
        )}

        {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}
      </div>
    </div>
  );
}
