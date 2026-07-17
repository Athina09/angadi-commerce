import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/utils/currency";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { items, subtotal, changeQty, remove } = useCart();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart"
            className="fixed inset-0 z-50 bg-ink/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-terracotta-100 px-5 py-4">
              <h2 className="font-display text-xl text-ink">Your cart</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 hover:bg-terracotta-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center gap-4 py-16">
                  <div className="h-24 w-24 rounded-2xl bg-terracotta-50 flex items-center justify-center font-display text-3xl text-terracotta-400">
                    0
                  </div>
                  <p className="font-display text-xl text-ink">Cart is empty</p>
                  <p className="text-sm text-ink/55 max-w-xs">
                    Browse the neighbourhood shelves and add something fresh.
                  </p>
                  <Link
                    to="/shop"
                    onClick={onClose}
                    className="rounded-full bg-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
                  >
                    Browse products
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li
                      key={`${item.storeId}:${item.productId}`}
                      className="flex gap-3 rounded-2xl border border-terracotta-100 bg-white p-3 shadow-soft"
                    >
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover bg-terracotta-50"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm truncate">{item.name}</p>
                        <p className="text-[11px] text-ink/45 truncate">{item.storeName}</p>
                        <p className="mt-0.5 text-sm text-terracotta-500">{formatINR(item.price)}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QuantityStepper
                            size="sm"
                            value={item.qty}
                            min={0}
                            max={item.stock}
                            onChange={(n) => void changeQty(item.productId, item.storeId, n)}
                          />
                          <button
                            type="button"
                            onClick={() => void remove(item.productId, item.storeId)}
                            className="text-[11px] uppercase tracking-wide text-ink/45 hover:text-crit"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-terracotta-100 bg-white px-5 py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-ink/60">Subtotal</span>
                  <span className="font-display text-lg">{formatINR(subtotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/checkout");
                  }}
                  className="w-full rounded-full bg-ink py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:opacity-90"
                >
                  Checkout
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
