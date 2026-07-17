import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartState } from "@/types/cart";

const keyOf = (item: Pick<CartItem, "productId" | "storeId">) =>
  `${item.storeId}:${item.productId}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) => {
        const items = get().items;
        const existing = items.find((i) => keyOf(i) === keyOf(item));
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty > item.stock) return false;
        set({
          items: existing
            ? items.map((i) =>
                keyOf(i) === keyOf(item) ? { ...i, qty: nextQty, stock: item.stock, price: item.price } : i
              )
            : [...items, { ...item, qty }],
        });
        return true;
      },

      removeItem: (productId, storeId) =>
        set({
          items: get().items.filter((i) => keyOf(i) !== `${storeId}:${productId}`),
        }),

      updateQty: (productId, storeId, qty) => {
        const items = get().items;
        const target = items.find((i) => keyOf(i) === `${storeId}:${productId}`);
        if (!target) return false;
        if (qty > target.stock) return false;
        set({
          items:
            qty <= 0
              ? items.filter((i) => i !== target)
              : items.map((i) => (i === target ? { ...i, qty } : i)),
        });
        return true;
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

      getCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      getQtyFor: (productId, storeId) =>
        get().items.find((i) => keyOf(i) === `${storeId}:${productId}`)?.qty ?? 0,

      syncStock: (productId, newStock) =>
        set({
          items: get()
            .items.map((i) =>
              i.productId === productId && i.storeId === "angadi"
                ? { ...i, stock: newStock, qty: Math.min(i.qty, Math.max(newStock, 0)) }
                : i
            )
            .filter((i) => i.qty > 0),
        }),
    }),
    { name: "ngc-storefront-cart" }
  )
);
