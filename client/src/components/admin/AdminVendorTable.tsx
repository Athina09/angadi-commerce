import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { AdminSellerRow } from "@/data/adminDashboardMock";
import { cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "score"
  | "riskMetric"
  | "fulfillmentPct"
  | "qualityPct"
  | "aiConfidence"
  | "risk"
  | "status";

type Props = {
  sellers: AdminSellerRow[];
};

const RISK_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
const STATUS_ORDER = {
  EXCELLENT: 0,
  GOOD: 1,
  WATCH: 2,
  PENDING: 3,
} as const;

export function AdminVendorTable({ sellers }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const list = [...sellers];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "score":
          cmp = a.score - b.score;
          break;
        case "riskMetric":
          cmp = a.riskMetric - b.riskMetric;
          break;
        case "fulfillmentPct":
          cmp = a.fulfillmentPct - b.fulfillmentPct;
          break;
        case "qualityPct":
          cmp = a.qualityPct - b.qualityPct;
          break;
        case "aiConfidence":
          cmp = a.aiConfidence - b.aiConfidence;
          break;
        case "risk":
          cmp = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
          break;
        case "status":
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [sellers, sortKey, sortDir]);

  return (
    <div className="rounded-[10px] border border-[#EEEEEE] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F3F4F6]">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#111827]">
          Seller Performance
        </h2>
        <p className="text-[11px] text-[#6B7280]">
          {sellers.length} sellers · ranked
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <Th label="Name" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <Th label="Score" active={sortKey === "score"} dir={sortDir} onClick={() => toggleSort("score")} />
              <Th label="Risk metric" active={sortKey === "riskMetric"} dir={sortDir} onClick={() => toggleSort("riskMetric")} />
              <Th label="Fulfillment %" active={sortKey === "fulfillmentPct"} dir={sortDir} onClick={() => toggleSort("fulfillmentPct")} />
              <Th label="Quality %" active={sortKey === "qualityPct"} dir={sortDir} onClick={() => toggleSort("qualityPct")} />
              <Th label="AI confidence" active={sortKey === "aiConfidence"} dir={sortDir} onClick={() => toggleSort("aiConfidence")} />
              <Th label="Risk" active={sortKey === "risk"} dir={sortDir} onClick={() => toggleSort("risk")} />
              <Th label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
              <th className="px-3 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => (
              <tr
                key={v.id}
                className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F8FAFB] transition-[background-color,transform] duration-300 admin-row-shift"
                style={{ transition: "background-color 150ms, opacity 300ms" }}
              >
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-medium text-[#111827]">{v.name}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    {v.region} · {v.category}
                  </p>
                </td>
                <td className="px-3 py-3.5 text-[13px] font-semibold tabular-nums text-[#111827]">
                  {v.status === "PENDING" ? "—" : v.score}
                </td>
                <td className="px-3 py-3.5 text-[13px] tabular-nums text-[#374151]">
                  {v.riskMetric}
                </td>
                <td className="px-3 py-3.5 text-[13px] tabular-nums text-[#374151]">
                  {v.status === "PENDING" ? "—" : `${v.fulfillmentPct.toFixed(1)}%`}
                </td>
                <td className="px-3 py-3.5 text-[13px] tabular-nums text-[#374151]">
                  {v.status === "PENDING" ? "—" : `${v.qualityPct.toFixed(1)}%`}
                </td>
                <td className="px-3 py-3.5 min-w-[130px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#E8F0F3] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2D5A6B] transition-[width] duration-500"
                        style={{ width: `${v.aiConfidence}%` }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-[#6B7280] w-8">
                      {v.aiConfidence}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <RiskPill risk={v.risk} />
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill status={v.status} />
                </td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#2D5A6B] hover:underline"
                  >
                    Open →
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[13px] text-[#6B7280]">
                  No sellers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2.5 first:px-4">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280] hover:text-[#111827]"
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-[#2D5A6B]" />
          ) : (
            <ArrowDown className="h-3 w-3 text-[#2D5A6B]" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-35" />
        )}
      </button>
    </th>
  );
}

function RiskPill({ risk }: { risk: AdminSellerRow["risk"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        risk === "LOW" && "bg-[#EAF5EF] text-[#3F7A58]",
        risk === "MEDIUM" && "bg-[#FBF3E6] text-[#9A6B1C]",
        risk === "HIGH" && "bg-[#FBECEC] text-[#B33E3E]"
      )}
    >
      {risk}
    </span>
  );
}

function StatusPill({ status }: { status: AdminSellerRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        status === "EXCELLENT" && "bg-[#EAF5EF] text-[#3F7A58]",
        status === "GOOD" && "bg-[#EAF4F8] text-[#3A7088]",
        status === "WATCH" && "bg-[#FBF3E6] text-[#9A6B1C]",
        status === "PENDING" && "bg-[#F3F4F6] text-[#6B7280]"
      )}
    >
      {status}
    </span>
  );
}
