import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatINR } from "@/utils/currency";

type Props = {
  open: boolean;
  onClose: () => void;
  amount: number;
  upiId: string;
  storeName: string;
  onSuccess: (ref: string) => void;
};

export function UpiPaymentModal({
  open,
  onClose,
  amount,
  upiId,
  storeName,
  onSuccess,
}: Props) {
  const [upi, setUpi] = useState("");
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");

  useEffect(() => {
    if (open) {
      setPhase("form");
      setUpi("");
    }
  }, [open]);

  const pay = () => {
    setPhase("processing");
    window.setTimeout(() => {
      const ref = `UPI${Date.now().toString().slice(-8)}`;
      setPhase("done");
      window.setTimeout(() => onSuccess(ref), 600);
    }, 2200);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[60] bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={phase === "processing" ? undefined : onClose}
            aria-label="Close payment"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="UPI payment"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed left-1/2 top-1/2 z-[70] w-[min(100%-2rem,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-terracotta-100 bg-cream p-6 shadow-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-mustard-500">Pay with UPI</p>
                <h3 className="font-display text-xl text-ink mt-1">{storeName}</h3>
                <p className="font-display text-2xl text-terracotta-500 mt-1">{formatINR(amount)}</p>
              </div>
              {phase !== "processing" && (
                <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-terracotta-50" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {phase === "form" && (
              <div className="mt-5 space-y-4">
                <label className="block text-sm">
                  <span className="text-ink/60">Your UPI ID</span>
                  <input
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    placeholder="name@upi"
                    className="mt-1.5 w-full rounded-xl border border-terracotta-100 bg-white px-3 py-2.5 outline-none focus:border-terracotta-400"
                  />
                </label>
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-terracotta-200 bg-white">
                  <div className="grid grid-cols-5 gap-0.5 opacity-40" aria-hidden>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2.5 w-2.5 ${i % 3 === 0 ? "bg-ink" : "bg-transparent border border-ink/20"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-center text-xs text-ink/45">Scan mock QR or pay to {upiId}</p>
                <button
                  type="button"
                  disabled={upi.trim().length < 5}
                  onClick={pay}
                  className="w-full rounded-full bg-ink py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-40"
                >
                  Pay via UPI app
                </button>
              </div>
            )}

            {phase === "processing" && (
              <div className="mt-10 mb-4 flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-terracotta-500" />
                <p className="text-sm text-ink/60">Confirming payment…</p>
              </div>
            )}

            {phase === "done" && (
              <div className="mt-8 mb-2 text-center py-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-sage text-sage">
                  ✓
                </div>
                <p className="font-display text-xl">Payment successful</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
