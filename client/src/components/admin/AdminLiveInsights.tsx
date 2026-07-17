import { ChevronRight } from "lucide-react";
import type { LiveInsight } from "@/data/adminDashboardMock";
import { cn } from "@/lib/utils";

type Props = {
  events: LiveInsight[];
};

export function AdminLiveInsights({ events }: Props) {
  return (
    <div className="h-full min-h-[380px] rounded-[10px] border border-[#EEEEEE] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#F3F4F6]">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#111827]">
          Live Insights
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5FA37A]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5FA37A] opacity-55" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#5FA37A]" />
          </span>
          live
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {events.map((ev, i) => (
          <li
            key={ev.id}
            className={cn(
              "flex items-start gap-2.5 px-3.5 py-2.5 border-b border-[#F3F4F6] last:border-0",
              i === 0 && "admin-feed-fade"
            )}
          >
            <span className="w-[58px] shrink-0 text-[11px] tabular-nums text-[#9CA3AF] pt-0.5">
              {ev.at}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-[#2D5A6B] shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-[13px] text-[#111827] leading-snug min-w-0">
              {ev.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
