import { FormEvent, useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  productName: string;
  openSignal?: number;
};

const REPLIES: Record<string, string> = {
  default:
    "Focus on zones with rising dispute density and sellers with delayed fulfillment. Ask about Bengaluru heat, risk queues, or SLA dips.",
  zone: "North & East Bengaluru spiked in the last hour — prioritize courier capacity there before evening peak.",
  risk: "Three sellers crossed the risk threshold on late orders. Open Seller Risk and freeze new listings until SLAs recover.",
  dispute: "Dispute rate is elevated on perishables. Suggest photo proof at handover and tighter ETA buffers.",
};

function replyFor(q: string): string {
  const s = q.toLowerCase();
  if (/zone|bengaluru|heat|spike/.test(s)) return REPLIES.zone;
  if (/risk|seller|sla/.test(s)) return REPLIES.risk;
  if (/dispute|claim/.test(s)) return REPLIES.dispute;
  return REPLIES.default;
}

export function AdminAiChip({ productName, openSignal = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(REPLIES.default);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    window.setTimeout(() => {
      setAnswer(replyFor(input));
      setBusy(false);
      setInput("");
    }, 450);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-[320px] rounded-2xl border border-[#E7EBF0] bg-white shadow-[0_16px_40px_rgba(17,24,39,0.14)] overflow-hidden">
          <div className="flex items-start justify-between gap-2 px-4 py-3 bg-gradient-to-r from-[#1e4fd6] to-[#2f6fed] text-white">
            <div>
              <p className="text-[13px] font-semibold">{productName} Advisor</p>
              <p className="text-[11px] text-white/75 mt-0.5">Marketplace ops</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/80 hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-[12px] text-[#4B5563] leading-relaxed">{answer}</p>
            <form onSubmit={onSubmit} className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a marketplace question…"
                className="flex-1 h-9 rounded-xl border border-[#E7EBF0] bg-[#F7F9FC] px-3 text-[12px] outline-none focus:border-[#2f6fed]/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-9 px-3 rounded-xl bg-[#2f6fed] text-white text-[12px] font-semibold disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ask"}
              </button>
            </form>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 h-10 text-[12px] font-semibold text-white shadow-[0_8px_22px_rgba(47,111,237,0.35)]",
          "bg-[#2f6fed] hover:bg-[#285fd4] transition-colors"
        )}
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {productName} AI
      </button>
    </div>
  );
}
