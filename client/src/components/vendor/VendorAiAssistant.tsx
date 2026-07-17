import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STARTERS = [
  "What should I restock?",
  "Show freshness watch",
  "Where is my margin room?",
  "Evening rush tips",
];

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-vh-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function VendorAiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"live" | "advisor" | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I'm your **Angadi advisor** — ask about stock, freshness, pricing, or evening demand. Answers use your live inventory.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post<{
        reply: string;
        mode: "live" | "advisor";
        suggestions?: string[];
      }>("/vendor/chat", { message: trimmed, history });

      setMode(data.mode);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            "I couldn't reach the advisor service. Confirm the API is running on :4000, then try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-auto w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] flex flex-col rounded-2xl border border-vh-border bg-white shadow-[0_20px_50px_rgba(26,34,51,0.18)] overflow-hidden"
          >
            <header className="shrink-0 px-4 py-3.5 border-b border-vh-border bg-gradient-to-r from-[#1e4fd6] to-[#2f6fed] text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold leading-tight">
                        Angadi Advisor
                      </p>
                      <p className="text-[11px] text-white/75 mt-0.5">
                        {mode === "live"
                          ? "Live AI · inventory-aware"
                          : "Inventory advisor · always on"}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                  aria-label="Close assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div
              ref={scroller}
              className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-[#f7f9fc]"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-vh-blue text-white rounded-br-md"
                        : "bg-white border border-vh-border text-vh-text shadow-sm rounded-bl-md"
                    )}
                  >
                    {m.role === "assistant"
                      ? renderMarkdownLite(m.content)
                      : m.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-[12px] text-vh-muted px-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing your shelf…
                </div>
              )}
            </div>

            {!busy && suggestions.length > 0 && (
              <div className="shrink-0 px-3 pt-2 flex flex-wrap gap-1.5 bg-[#f7f9fc]">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-vh-border bg-white px-2.5 py-1 text-[11px] font-medium text-vh-text/80 hover:border-vh-blue/40 hover:text-vh-blue transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={onSubmit}
              className="shrink-0 p-3 border-t border-vh-border bg-white flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about stock, freshness, pricing…"
                disabled={busy}
                className="flex-1 h-10 rounded-xl border border-vh-border bg-[#f7f9fc] px-3 text-[13px] outline-none focus:border-vh-blue/50 focus:ring-2 focus:ring-vh-blue/15 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-10 w-10 rounded-xl bg-vh-blue text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#285fd4] transition-colors"
                aria-label="Send"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        layout
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "pointer-events-auto inline-flex items-center gap-2 h-12 rounded-full px-4 text-[13px] font-semibold text-white shadow-[0_10px_28px_rgba(47,111,237,0.4)]",
          "bg-gradient-to-r from-[#1e4fd6] to-[#2f6fed] hover:brightness-105 transition"
        )}
        whileTap={{ scale: 0.97 }}
        aria-expanded={open}
        aria-label="Open Angadi Advisor"
      >
        {open ? (
          <X className="h-4 w-4" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
        {open ? "Close" : "Ask Advisor"}
      </motion.button>
    </div>
  );
}
