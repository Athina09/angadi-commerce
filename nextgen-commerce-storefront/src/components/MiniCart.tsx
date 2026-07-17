import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";

export function MiniCart({ onOpen }: { onOpen: () => void }) {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-terracotta-100 bg-white text-ink shadow-soft hover:border-terracotta-300 transition-colors"
      aria-label={`Open cart, ${count} items`}
    >
      <ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.75} />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold text-white"
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
