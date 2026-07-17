import { useEffect, useMemo, useState, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Expand, Minus, Plus } from "lucide-react";
import type { HeatMarker } from "@/data/adminDashboardMock";
import { cn } from "@/lib/utils";

type Props = {
  markers: HeatMarker[];
  regionLabel: string;
  pulseIds?: Set<string>;
};

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="absolute top-3 right-3 z-[500] flex flex-col gap-1">
      {(
        [
          { label: "Zoom in", icon: Plus, fn: () => map.zoomIn() },
          { label: "Zoom out", icon: Minus, fn: () => map.zoomOut() },
          {
            label: "Reset view",
            icon: Expand,
            fn: () => map.setView([20.5, 78.5], 4.6),
          },
        ] as const
      ).map(({ label, icon: Icon, fn }) => (
        <button
          key={label}
          type="button"
          onClick={fn}
          className="h-7 w-7 rounded-[8px] bg-[#1A2B32]/92 border border-white/12 text-white/90 hover:bg-[#243840] flex items-center justify-center"
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

function FitMarkers({ markers }: { markers: HeatMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) {
      map.setView([20.5, 78.5], 4.6);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 11);
      return;
    }
    map.fitBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
      { padding: [36, 36], maxZoom: 11 }
    );
  }, [map, markers]);
  return null;
}

function priorityColor(p: HeatMarker["priority"]) {
  if (p === "high") return "#E85D5D";
  if (p === "medium") return "#E8A33D";
  return "#5FA8C7";
}

function radiusFor(m: HeatMarker) {
  return 9 + Math.min(26, Math.sqrt(m.orderVolume) / 3.8);
}

function labelIcon(text: string) {
  return new L.DivIcon({
    className: "admin-map-label",
    html: `<span>${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function AdminVendorHeatmap({ markers, regionLabel, pulseIds }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const center = useMemo(() => {
    if (markers.length === 0) return [20.5, 78.5] as [number, number];
    const lat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const lng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    return [lat, lng] as [number, number];
  }, [markers]);

  return (
    <div className="admin-heatmap relative h-full min-h-[380px] rounded-[10px] overflow-hidden border border-[#1A2B32] bg-[#1A2B32]">
      <div className="absolute top-3 left-3 z-[500]">
        <span className="inline-flex rounded-[8px] bg-[#0F1A20]/85 border border-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/85 backdrop-blur-[2px]">
          Seller heatmap · {regionLabel}
        </span>
      </div>

      {mounted ? (
        <MapContainer
          center={center}
          zoom={5}
          className="h-full w-full admin-heatmap-map"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <ZoomButtons />
          <FitMarkers markers={markers} />
          {markers.map((m) => {
            const color = priorityColor(m.priority);
            const r = radiusFor(m);
            const pulsing = pulseIds?.has(m.id);
            return (
              <Fragment key={m.id}>
                {/* Soft glow halo */}
                <Circle
                  center={[m.lat, m.lng]}
                  radius={r * 180}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: pulsing ? 0.22 : 0.12,
                    weight: 0,
                    className: pulsing ? "admin-marker-pulse" : undefined,
                  }}
                />
                <CircleMarker
                  center={[m.lat, m.lng]}
                  radius={r}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: pulsing ? 0.65 : 0.45,
                    weight: pulsing ? 2.5 : 1.25,
                    opacity: 0.95,
                  }}
                >
                  <Popup>
                    <div className="text-[12px] font-[family-name:var(--font-inter)]">
                      <p className="font-semibold text-[#111827]">
                        {m.label ?? m.city}
                      </p>
                      <p className="text-[#6B7280] mt-0.5">
                        {m.vendorCount} sellers ·{" "}
                        {m.orderVolume.toLocaleString()} orders
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                          m.priority === "high" && "text-[#E85D5D]",
                          m.priority === "medium" && "text-[#E8A33D]",
                          m.priority === "normal" && "text-[#5FA8C7]"
                        )}
                      >
                        {m.priority} activity
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
                {(m.label || m.city) && (
                  <Marker
                    position={[m.lat + 0.04, m.lng]}
                    icon={labelIcon(m.label ?? m.city)}
                    interactive={false}
                  />
                )}
              </Fragment>
            );
          })}
        </MapContainer>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-[12px] text-white/35">
          Loading map…
        </div>
      )}
    </div>
  );
}
