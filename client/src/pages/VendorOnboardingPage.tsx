import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Store, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Produce",
  "Fruits",
  "Vegetables",
  "Grocery",
  "Bakery",
  "Spices",
  "Beverages",
] as const;

const DEFAULT = { lat: 13.0827, lng: 80.2707 }; // Chennai

const pinIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#c45c26;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function PinDrop({
  position,
  onChange,
}: {
  position: { lat: number; lng: number };
  onChange: (p: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return <Marker position={[position.lat, position.lng]} icon={pinIcon} />;
}

export function VendorOnboardingPage() {
  const navigate = useNavigate();
  const { user, token, fetchMe } = useAuthStore();
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState<string>("Produce");
  const [photoUrl, setPhotoUrl] = useState("");
  const [pos, setPos] = useState(DEFAULT);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!token || user?.role !== "vendor") {
      setChecking(false);
      return;
    }
    let cancelled = false;
    async function check() {
      try {
        const { data } = await api.get<{
          vendor: { id: string; storeName: string } | null;
        }>("/vendor/me");
        if (!cancelled && data.vendor) {
          navigate("/vendor/listings", { replace: true });
        }
      } catch {
        /* show form */
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role, navigate]);

  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role !== "vendor") return <Navigate to="/shop" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/vendor/onboard", {
        storeName: storeName.trim(),
        category,
        lat: pos.lat,
        lng: pos.lng,
        photoUrl: photoUrl.trim() || undefined,
      });
      await fetchMe();
      navigate("/vendor/listings", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Couldn’t set up your store. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-[100svh] bg-bone flex items-center justify-center">
        <p className="text-[12px] tracking-[0.2em] uppercase text-charcoal/40">
          Opening vendor hub…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-bone text-ink font-[family-name:var(--font-inter)]">
      <header className="px-5 sm:px-8 pt-5 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-terracotta">
          Angadi
        </Link>
        <span className="text-[11px] tracking-[0.18em] uppercase text-muted">
          Vendor onboarding
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight">
          Set up your stall
        </h1>
        <p className="mt-2 text-base text-muted">
          Pin your location, name the store, pick a category. You’ll start as{" "}
          <span className="font-semibold text-ink">unverified</span> until an
          admin approves — you can still manage listings.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-6 rounded-[20px] bg-white p-6 sm:p-8 shadow-[0_8px_24px_rgba(28,27,25,0.06)]"
        >
          {error && (
            <div className="rounded-xl bg-red-50 text-red-800 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-2 flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-muted font-medium">
              <Store className="h-3.5 w-3.5" />
              Store name
            </span>
            <input
              required
              minLength={2}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Meera’s Neighborhood Pantry"
              className="h-14 w-full rounded-[14px] bg-cream/80 px-4 text-base outline-none focus:ring-2 focus:ring-terracotta/30"
            />
          </label>

          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-muted font-medium">
              <Tag className="h-3.5 w-3.5" />
              Category focus
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition",
                    category === c
                      ? "bg-terracotta text-white"
                      : "bg-cream text-muted hover:text-ink"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-[11px] tracking-[0.14em] uppercase text-muted font-medium">
              Storefront photo URL (optional)
            </span>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
              className="h-14 w-full rounded-[14px] bg-cream/80 px-4 text-base outline-none focus:ring-2 focus:ring-terracotta/30"
            />
          </label>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-muted font-medium">
              <MapPin className="h-3.5 w-3.5" />
              Pin your stall location
            </p>
            <p className="text-sm text-muted mb-3">
              Click the map to drop a pin. Lat {pos.lat.toFixed(5)}, Lng{" "}
              {pos.lng.toFixed(5)}
            </p>
            <div className="h-[280px] rounded-[16px] overflow-hidden bg-[#e8e4dc]">
              {mapReady && (
                <MapContainer
                  center={[pos.lat, pos.lng]}
                  zoom={13}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution="&copy; OSM"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <PinDrop position={pos} onChange={setPos} />
                </MapContainer>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || storeName.trim().length < 2}
            className="w-full h-14 rounded-[16px] bg-terracotta text-white text-base font-semibold disabled:opacity-50"
          >
            {loading ? "Saving…" : "Continue to listings"}
          </button>
        </form>
      </div>
    </div>
  );
}
