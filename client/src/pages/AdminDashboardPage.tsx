import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { AdminVendorHeatmap } from "@/components/admin/AdminVendorHeatmap";
import { AdminLiveInsights } from "@/components/admin/AdminLiveInsights";
import { AdminVendorTable } from "@/components/admin/AdminVendorTable";
import { AdminAiChip } from "@/components/admin/AdminAiChip";
import {
  MOCK_ADMIN_DASHBOARD,
  nextLiveInsight,
  priorityFromVolume,
  type AdminKpi,
  type AdminRegion,
  type AdminSellerRow,
  type HeatMarker,
  type LiveInsight,
} from "@/data/adminDashboardMock";
import { ADMIN_RISKS } from "@/data/adminDashboardMock";

export function AdminDashboardPage() {
  const base = MOCK_ADMIN_DASHBOARD;
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<AdminRegion>("All regions");
  const [risk, setRisk] = useState<(typeof ADMIN_RISKS)[number]>("All risk levels");
  const [kpis, setKpis] = useState<AdminKpi[]>(base.kpis);
  const [markers, setMarkers] = useState<HeatMarker[]>(base.heatMarkers);
  const [sellers, setSellers] = useState<AdminSellerRow[]>(base.sellers);
  const [events, setEvents] = useState<LiveInsight[]>(base.liveInsights);
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());
  const [askOpenTick, setAskOpenTick] = useState(0);

  // Live feed + map pulse
  useEffect(() => {
    let seq = 0;
    const id = window.setInterval(() => {
      seq += 1;
      const insight = nextLiveInsight(seq);
      setEvents((prev) => {
        const aged = prev.map((e, i) => {
          if (i === 0 && e.at === "just now") return { ...e, at: "45s ago" };
          if (e.at === "45s ago") return { ...e, at: "2m ago" };
          return e;
        });
        return [insight, ...aged].slice(0, 14);
      });

      setMarkers((prev) => {
        const next = prev.map((m) => {
          const bump =
            insight.message.toLowerCase().includes(m.city.toLowerCase()) ||
            (m.label &&
              insight.message.toLowerCase().includes(m.label.toLowerCase()))
              ? 80 + Math.floor(Math.random() * 120)
              : Math.random() > 0.7
                ? Math.floor(Math.random() * 60) - 20
                : 0;
          if (!bump) return m;
          const orderVolume = Math.max(200, m.orderVolume + bump);
          return {
            ...m,
            orderVolume,
            priority: priorityFromVolume(orderVolume),
          };
        });
        const hot = next.find(
          (m) =>
            insight.message.toLowerCase().includes(m.city.toLowerCase()) ||
            (m.label &&
              insight.message.toLowerCase().includes(m.label.toLowerCase()))
        );
        if (hot) {
          setPulseIds(new Set([hot.id]));
          window.setTimeout(() => setPulseIds(new Set()), 2000);
        } else if (insight.kind === "delivery" || insight.kind === "dispute") {
          const high = next.find((m) => m.priority === "high") ?? next[0];
          if (high) {
            setPulseIds(new Set([high.id]));
            window.setTimeout(() => setPulseIds(new Set()), 2000);
          }
        }
        return next;
      });
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  // KPI soft polling every ~14s
  useEffect(() => {
    const id = window.setInterval(() => {
      setKpis((prev) =>
        prev.map((k) => {
          const delta =
            k.format === "int"
              ? Math.round((Math.random() - 0.45) * (k.id === "orders" ? 28 : 2))
              : (Math.random() - 0.4) * (k.format === "pct" ? 0.8 : 0.35);
          const numericValue = Math.max(
            0,
            Number((k.numericValue + delta).toFixed(k.format === "int" ? 0 : 1))
          );
          const trendPct =
            k.trendPct == null
              ? null
              : Number((k.trendPct + (Math.random() - 0.5) * 0.4).toFixed(1));
          const sparkline = [...k.sparkline.slice(1), numericValue];
          return { ...k, numericValue, trendPct, sparkline };
        })
      );
    }, 14000);
    return () => window.clearInterval(id);
  }, []);

  // Seller score drift → table re-ranks
  useEffect(() => {
    const id = window.setInterval(() => {
      setSellers((prev) =>
        prev.map((s) => {
          if (s.status === "PENDING") return s;
          const score = Math.min(
            99,
            Math.max(50, s.score + Math.round((Math.random() - 0.48) * 3))
          );
          const aiConfidence = Math.min(
            99,
            Math.max(35, s.aiConfidence + Math.round((Math.random() - 0.5) * 2))
          );
          return { ...s, score, aiConfidence };
        })
      );
    }, 16000);
    return () => window.clearInterval(id);
  }, []);

  const filteredSellers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellers.filter((v) => {
      if (region !== "All regions" && v.region !== region) return false;
      if (risk !== "All risk levels" && v.risk !== risk) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        v.risk.toLowerCase().includes(q)
      );
    });
  }, [sellers, search, region, risk]);

  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      if (region !== "All regions" && m.region !== region) return false;
      if (risk !== "All risk levels" || search.trim()) {
        return filteredSellers.some((v) => v.region === m.region);
      }
      return true;
    });
  }, [markers, region, risk, search, filteredSellers]);

  return (
    <>
      <AdminShell
        productName={base.productName}
        adminName={base.adminName}
        search={search}
        onSearchChange={setSearch}
        region={region}
        onRegionChange={setRegion}
        risk={risk}
        onRiskChange={setRisk}
        onAskAi={() => setAskOpenTick((t) => t + 1)}
      >
        <div className="max-w-[1440px] mx-auto space-y-4">
          <header>
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[#111827]">
              Marketplace Command Dashboard
            </h1>
            <p className="mt-0.5 text-[12px] text-[#6B7280]">
              KPIs → Map → Live feed → Seller performance
            </p>
          </header>

          <AdminKpiRow kpis={kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-3 items-stretch">
            <AdminVendorHeatmap
              markers={filteredMarkers}
              regionLabel={region === "All regions" ? "India" : region}
              pulseIds={pulseIds}
            />
            <AdminLiveInsights events={events} />
          </div>

          <AdminVendorTable sellers={filteredSellers} />
        </div>
      </AdminShell>

      <AdminAiChip productName={base.productName} openSignal={askOpenTick} />
    </>
  );
}
