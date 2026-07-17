import { MessageSquare, Sparkles } from "lucide-react";
import { VendorHubShell } from "@/components/vendor/VendorHubShell";

const PROMPTS = [
  "What should I restock?",
  "Show freshness watch",
  "Where is my margin room?",
  "Evening rush tips",
];

export function VendorAiPage() {
  return (
    <VendorHubShell title="Ask Advisor">
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-vh-border bg-white p-6 sm:p-8 shadow-[0_8px_28px_rgba(26,34,51,0.06)]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vh-blue-soft text-vh-blue">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-vh-text tracking-tight">
                NextGen Advisor
              </h2>
              <p className="mt-1.5 text-[14px] text-vh-muted leading-relaxed">
                Inventory-aware guidance for restock, freshness, pricing, and
                evening demand. Open the chat from the bottom-right on any hub
                page.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[#f7f9fc] border border-vh-border px-4 py-3.5 flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-vh-blue shrink-0" />
            <p className="text-[13px] text-vh-text">
              Click <strong className="font-semibold">Ask Advisor</strong> to
              start — answers use your live listings.
            </p>
          </div>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-vh-muted">
            Try asking
          </p>
          <ul className="mt-2 space-y-2">
            {PROMPTS.map((p) => (
              <li
                key={p}
                className="rounded-xl border border-vh-border px-3.5 py-2.5 text-[13px] text-vh-text"
              >
                “{p}”
              </li>
            ))}
          </ul>

          <p className="mt-6 text-[12px] text-vh-muted leading-relaxed">
            Demo mode uses a professional inventory advisor. Set{" "}
            <code className="text-[11px] bg-vh-blue-soft px-1 rounded">
              OPENAI_API_KEY
            </code>{" "}
            on the server for live LLM replies.
          </p>
        </div>
      </div>
    </VendorHubShell>
  );
}
