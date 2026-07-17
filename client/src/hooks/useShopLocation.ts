import { useCallback, useState } from "react";

const STORAGE_KEY = "ngc_shop_location";

export type ShopLocation = {
  lat: number;
  lng: number;
  label: string;
  source: "geo" | "manual";
};

/** Chennai neighborhood presets — used for picker + nearest-label for GPS */
export const AREA_PRESETS: Array<{ label: string; lat: number; lng: number }> = [
  { label: "T. Nagar, Chennai", lat: 13.0418, lng: 80.2341 },
  { label: "Anna Nagar", lat: 13.085, lng: 80.21 },
  { label: "Adyar", lat: 13.0067, lng: 80.257 },
  { label: "Velachery", lat: 12.975, lng: 80.221 },
  { label: "Mylapore", lat: 13.0339, lng: 80.2619 },
  { label: "Guindy", lat: 13.0067, lng: 80.2209 },
];

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Map GPS coords → nearest area name (so UI doesn't stay as vague "Near me") */
export function nearestAreaLabel(lat: number, lng: number): string {
  let best = AREA_PRESETS[0]!;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const p of AREA_PRESETS) {
    const km = haversineKm(lat, lng, p.lat, p.lng);
    if (km < bestKm) {
      bestKm = km;
      best = p;
    }
  }
  if (bestKm <= 8) return `Near ${best.label}`;
  return `Near me · ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export function useShopLocation() {
  const [location, setLocation] = useState<ShopLocation | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ShopLocation;
      // Upgrade legacy "Near me" labels when we have coords
      if (
        parsed.source === "geo" &&
        (!parsed.label || parsed.label === "Near me")
      ) {
        parsed.label = nearestAreaLabel(parsed.lat, parsed.lng);
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const persist = useCallback((loc: ShopLocation | null) => {
    setLocation(loc);
    if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const requestGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported — pick an area below");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        persist({
          lat,
          lng,
          label: nearestAreaLabel(lat, lng),
          source: "geo",
        });
        setLocating(false);
      },
      () => {
        setGeoError("Location denied — pick an area");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [persist]);

  const pickArea = useCallback(
    (preset: (typeof AREA_PRESETS)[number]) => {
      persist({
        lat: preset.lat,
        lng: preset.lng,
        label: preset.label,
        source: "manual",
      });
      setGeoError(null);
    },
    [persist]
  );

  const clear = useCallback(() => persist(null), [persist]);

  return {
    location,
    geoError,
    locating,
    requestGeo,
    pickArea,
    clear,
    presets: AREA_PRESETS,
  };
}
