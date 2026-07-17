import { useCallback } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { apiAddToCart, apiRemoveCartItem, apiUpdateCartItem } from "@/services/api";
import { ANGADI_STORE_ID, ANGADI_STORE_NAME } from "@/mock/stores";
import type { Product } from "@/types/product";
import type { CartItem } from "@/types/cart";

export function useCart() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getCount = useCartStore((s) => s.getCount);
  const getQtyFor = useCartStore((s) => s.getQtyFor);

  const addProduct = useCallback(
    async (
      product: Product,
      qty = 1,
      store?: { id: string; name: string; price: number; stock: number }
    ) => {
      const payload: Omit<CartItem, "qty"> = {
        productId: product.id,
        name: product.name,
        price: store?.price ?? product.price,
        stock: store?.stock ?? product.stock,
        imageUrl: product.imageUrl,
        unit: product.unit,
        storeId: store?.id ?? ANGADI_STORE_ID,
        storeName: store?.name ?? ANGADI_STORE_NAME,
      };
      const ok = addItem(payload, qty);
      if (!ok) {
        toast.error("Stock exceeded", {
          description: `Only ${payload.stock} left for ${product.name}.`,
        });
        return false;
      }
      try {
        if (!store || store.id === ANGADI_STORE_ID) {
          await apiAddToCart(product.id, qty);
        }
        toast.success("Added to cart", { description: product.name });
        return true;
      } catch (err) {
        removeItem(product.id, payload.storeId);
        toast.error("Could not add to cart", {
          description: err instanceof Error ? err.message : "Network error",
        });
        return false;
      }
    },
    [addItem, removeItem]
  );

  const changeQty = useCallback(
    async (productId: string, storeId: string, qty: number) => {
      const prev = getQtyFor(productId, storeId);
      const ok = updateQty(productId, storeId, qty);
      if (!ok) {
        toast.error("Stock exceeded");
        return false;
      }
      try {
        if (storeId === ANGADI_STORE_ID) {
          if (qty <= 0) await apiRemoveCartItem(productId);
          else await apiUpdateCartItem(productId, qty);
        }
        if (qty <= 0) toast.message("Removed from cart");
        return true;
      } catch (err) {
        updateQty(productId, storeId, prev);
        toast.error("Cart sync failed", {
          description: err instanceof Error ? err.message : "Network error",
        });
        return false;
      }
    },
    [getQtyFor, updateQty]
  );

  const remove = useCallback(
    async (productId: string, storeId: string) => {
      const prevQty = getQtyFor(productId, storeId);
      removeItem(productId, storeId);
      try {
        if (storeId === ANGADI_STORE_ID) await apiRemoveCartItem(productId);
        toast.message("Removed from cart");
      } catch (err) {
        // rollback by re-adding is complex without item snapshot — toast only
        toast.error("Could not remove item", {
          description: err instanceof Error ? err.message : "Network error",
        });
        void prevQty;
      }
    },
    [getQtyFor, removeItem]
  );

  return {
    items,
    count: getCount(),
    subtotal: getSubtotal(),
    getQtyFor,
    addProduct,
    changeQty,
    remove,
    clearCart,
  };
}
