import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { formatINR } from "@/lib/utils";

export function MiniCartButton({ onOpen }: { onOpen: () => void }) {
  const count = useCartStore((s) => s.getCount());
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/12 bg-white"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingBag className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-charcoal px-1 text-[10px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-50 bg-charcoal/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close cart"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-xl"
            role="dialog"
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-4">
              <h2 className="font-display text-xl">Cart</h2>
              <button type="button" onClick={onClose} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center py-12">
                  <p className="font-display text-xl">Your cart is empty</p>
                  <Link
                    to="/shop"
                    onClick={onClose}
                    className="rounded-full bg-charcoal px-6 py-2.5 text-[11px] uppercase tracking-wider text-white"
                  >
                    Browse products
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li
                      key={`${i.storeId}:${i.catalogId}`}
                      className="flex gap-3 rounded-xl border border-charcoal/10 bg-white p-3"
                    >
                      <img src={i.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{i.name}</p>
                        <p className="text-[11px] text-charcoal/45">{i.storeName}</p>
                        <p className="text-sm text-amber-earth">{formatINR(i.price)}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <QuantityStepper
                            size="sm"
                            value={i.qty}
                            min={0}
                            max={i.stock}
                            onChange={(n) =>
                              n <= 0
                                ? removeItem(i.catalogId, i.storeId)
                                : updateQty(i.catalogId, i.storeId, n)
                            }
                          />
                          <button
                            type="button"
                            className="text-[11px] text-charcoal/45 hover:text-red-600"
                            onClick={() => removeItem(i.catalogId, i.storeId)}
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
              <div className="border-t border-charcoal/10 px-5 py-4 space-y-3">
                <div className="flex justify-between font-display text-lg">
                  <span>Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/shop/checkout");
                  }}
                  className="w-full rounded-full bg-charcoal py-3 text-[11px] uppercase tracking-wider text-white"
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
