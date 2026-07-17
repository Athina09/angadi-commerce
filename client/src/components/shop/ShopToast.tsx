import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ShopToast = {
  id: string;
  message: string;
  tone?: "ok" | "warn" | "info";
};

export function useShopToasts() {
  const [toasts, setToasts] = useState<ShopToast[]>([]);

  const push = (message: string, tone: ShopToast["tone"] = "info") => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  };

  return { toasts, push };
}

export function ShopToastStack({ toasts }: { toasts: ShopToast[] }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-2xl px-4 py-3 text-[13px] font-medium shadow-lg text-center",
            t.tone === "ok" && "bg-emerald-800 text-white",
            t.tone === "warn" && "bg-amber-800 text-white",
            (!t.tone || t.tone === "info") && "bg-charcoal text-white"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
