import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Competitor, HeatWeight } from "@/data/vendorDashboardMock";
import { Card } from "@/components/ui/Card";
import { cn, formatINR, formatPct } from "@/lib/utils";

type Props = {
  vendorLat: number;
  vendorLng: number;
  radiusKm: number;
  competitors: Competitor[];
  insight: { competitorCount: number; priceVsMarketPct: number };
  weight: HeatWeight;
  onWeightChange: (w: HeatWeight) => void;
};

function intensityFor(c: Competitor, weight: HeatWeight, competitors: Competitor[]) {
  if (weight === "density") return 0.75;
  if (weight === "orders") {
    const max = Math.max(...competitors.map((x) => x.orderVolume), 1);
    return 0.35 + (c.orderVolume / max) * 0.65;
  }
  // price threat: higher when competitor is cheaper
  return 0.35 + Math.min(1, Math.max(0, -c.priceDeltaPct / 20)) * 0.65;
}

/** Yellow → orange → red glow palette (matches reference heatmap blobs) */
function glowColor(intensity: number): string {
  if (intensity >= 0.85) return "#ef4444";
  if (intensity >= 0.65) return "#f97316";
  if (intensity >= 0.45) return "#eab308";
  return "#38bdf8";
}

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;

    void import("leaflet.heat").then(() => {
      if (cancelled) return;
      layer = L.heatLayer(points, {
        radius: 42,
        blur: 32,
        maxZoom: 17,
        max: 1,
        minOpacity: 0.35,
        gradient: {
          0.15: "#0ea5e9",
          0.35: "#eab308",
          0.55: "#f97316",
          0.75: "#ef4444",
          1.0: "#dc2626",
        },
      });
      layer.addTo(map);
    });

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

function GlowSpot({
  lat,
  lng,
  intensity,
  label,
  children,
}: {
  lat: number;
  lng: number;
  intensity: number;
  label?: string;
  children: ReactNode;
}) {
  const color = glowColor(intensity);
  const radius = 18 + intensity * 28;

  const labelIcon = useMemo(
    () =>
      label
        ? new L.DivIcon({
            className: "heatmap-label",
            html: `<span class="heatmap-label-text">${label}</span>`,
            iconSize: [120, 20],
            iconAnchor: [60, -8],
          })
        : null,
    [label]
  );

  return (
    <>
      {/* Soft outer bloom */}
      <CircleMarker
        center={[lat, lng]}
        radius={radius * 1.55}
        pathOptions={{
          color: "transparent",
          fillColor: color,
          fillOpacity: 0.12,
          weight: 0,
        }}
        interactive={false}
      />
      {/* Main glow disk */}
      <CircleMarker
        center={[lat, lng]}
        radius={radius}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.38,
          weight: 1.5,
          opacity: 0.55,
          className: "heatmap-glow-circle",
        }}
      >
        <Popup>{children}</Popup>
      </CircleMarker>
      {/* Hot core */}
      <CircleMarker
        center={[lat, lng]}
        radius={Math.max(5, radius * 0.28)}
        pathOptions={{
          color: "#fff",
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1.5,
          opacity: 0.8,
        }}
        interactive={false}
      />
      {labelIcon && (
        <Marker position={[lat, lng]} icon={labelIcon} interactive={false} />
      )}
    </>
  );
}

const WEIGHTS: { id: HeatWeight; label: string }[] = [
  { id: "density", label: "Vendor density" },
  { id: "orders", label: "Order volume" },
  { id: "price", label: "Price competitiveness" },
];

const vendorIcon = new L.DivIcon({
  className: "",
  html: `<div class="heatmap-you-marker"><span></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function CompetitorHeatmap({
  vendorLat,
  vendorLng,
  radiusKm,
  competitors,
  insight,
  weight,
  onWeightChange,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const heatPoints = useMemo((): [number, number, number][] => {
    return competitors.map((c) => [
      c.lat,
      c.lng,
      intensityFor(c, weight, competitors),
    ]);
  }, [competitors, weight]);

  const vsMarket =
    insight.priceVsMarketPct <= 0
      ? `${Math.abs(insight.priceVsMarketPct).toFixed(1)}% below`
      : `${insight.priceVsMarketPct.toFixed(1)}% above`;

  return (
    <Card
      title="Competitor Heatmap"
      subtitle={`Competing stalls within ${radiusKm}km · same categories`}
      action={
        <div className="inline-flex flex-wrap rounded-xl bg-cream border border-ink/10 p-1 gap-0.5">
          {WEIGHTS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onWeightChange(w.id)}
              className={cn(
                "rounded-[12px] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap",
                weight === w.id
                  ? "bg-terracotta text-white"
                  : "text-muted hover:text-ink"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Dark map stage — enterprise scale */}
      <div className="competitor-heatmap-map overflow-hidden rounded-[16px] h-[480px] sm:h-[520px] lg:h-[550px] min-h-[480px] w-full relative z-0 bg-vh-map shadow-inner">
        {ready && (
          <MapContainer
            center={[vendorLat, vendorLng]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full heatmap-dark-map"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> · OSM'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />
            <Circle
              center={[vendorLat, vendorLng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#2f6fed",
                fillColor: "#17a2a0",
                fillOpacity: 0.06,
                weight: 1.25,
                opacity: 0.65,
                dashArray: "4 6",
              }}
            />
            <HeatLayer points={heatPoints} />

            <Marker position={[vendorLat, vendorLng]} icon={vendorIcon}>
              <Popup>
                <strong>Your store</strong>
                <br />
                You are here
              </Popup>
            </Marker>
            <Marker
              position={[vendorLat, vendorLng]}
              interactive={false}
              icon={
                new L.DivIcon({
                  className: "heatmap-label",
                  html: `<span class="heatmap-label-text heatmap-label-you">Your store</span>`,
                  iconSize: [100, 20],
                  iconAnchor: [50, -14],
                })
              }
            />

            {competitors.map((c) => {
              const intensity = intensityFor(c, weight, competitors);
              const shortName =
                c.storeName.length > 18
                  ? `${c.storeName.slice(0, 16)}…`
                  : c.storeName;
              return (
                <GlowSpot
                  key={c.id}
                  lat={c.lat}
                  lng={c.lng}
                  intensity={intensity}
                  label={shortName}
                >
                  <div className="text-sm space-y-1 min-w-[160px]">
                    <p className="font-bold">{c.storeName}</p>
                    <p>Overlap: {c.categoryOverlapPct}%</p>
                    <p>Avg price: {formatINR(c.avgPrice)}</p>
                    <p>Distance: {c.distanceKm.toFixed(1)} km</p>
                    <p
                      className={
                        c.priceDeltaPct >= 0 ? "text-emerald-700" : "text-red-600"
                      }
                    >
                      You are {formatPct(c.priceDeltaPct)} vs their avg
                    </p>
                  </div>
                </GlowSpot>
              );
            })}
          </MapContainer>
        )}

        {/* Intensity legend — floats on the dark map */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5 font-semibold">
            Intensity
          </p>
          <div className="flex h-1.5 w-28 rounded-full overflow-hidden">
            <span className="flex-1 bg-sky-400" />
            <span className="flex-1 bg-yellow-400" />
            <span className="flex-1 bg-orange-500" />
            <span className="flex-1 bg-red-500" />
          </div>
          <div className="flex justify-between text-[9px] text-white/50 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-base text-muted bg-cream/80 rounded-[16px] px-6 py-4">
        You have{" "}
        <span className="font-bold text-ink">{insight.competitorCount} competitors</span>{" "}
        within {radiusKm}km. Your average price is{" "}
        <span
          className={cn(
            "font-bold",
            insight.priceVsMarketPct <= 0 ? "text-emerald-700" : "text-red-600"
          )}
        >
          {vsMarket}
        </span>{" "}
        local market rate.
      </p>
    </Card>
  );
}
