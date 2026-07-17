import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  catalogId: string;
  listingId?: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  imageUrl: string;
  unit: string;
  storeId: string;
  storeName: string;
};

type CartStore = {
  items: CartLine[];
  addItem: (item: Omit<CartLine, "qty">, qty?: number) => boolean;
  removeItem: (catalogId: string, storeId: string) => void;
  updateQty: (catalogId: string, storeId: string, qty: number) => boolean;
  clearCart: () => void;
  getSubtotal: () => number;
  getCount: () => number;
  getQty: (catalogId: string, storeId: string) => number;
  patchStock: (catalogId: string, stock: number) => void;
};

const key = (catalogId: string, storeId: string) => `${storeId}:${catalogId}`;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) => {
        const items = get().items;
        const k = key(item.catalogId, item.storeId);
        const existing = items.find((i) => key(i.catalogId, i.storeId) === k);
        const next = (existing?.qty ?? 0) + qty;
        if (item.stock <= 0 || next > item.stock) return false;
        set({
          items: existing
            ? items.map((i) =>
                key(i.catalogId, i.storeId) === k
                  ? { ...i, qty: next, price: item.price, stock: item.stock }
                  : i
              )
            : [...items, { ...item, qty }],
        });
        return true;
      },

      removeItem: (catalogId, storeId) =>
        set({ items: get().items.filter((i) => key(i.catalogId, i.storeId) !== key(catalogId, storeId)) }),

      updateQty: (catalogId, storeId, qty) => {
        const items = get().items;
        const target = items.find((i) => key(i.catalogId, i.storeId) === key(catalogId, storeId));
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

      getSubtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      getCount: () => get().items.reduce((s, i) => s + i.qty, 0),
      getQty: (catalogId, storeId) =>
        get().items.find((i) => key(i.catalogId, i.storeId) === key(catalogId, storeId))?.qty ?? 0,

      patchStock: (catalogId, stock) =>
        set({
          items: get()
            .items.map((i) =>
              i.catalogId === catalogId
                ? { ...i, stock, qty: Math.min(i.qty, Math.max(stock, 0)) }
                : i
            )
            .filter((i) => i.qty > 0),
        }),
    }),
    { name: "angadi-cart-v3" }
  )
);
