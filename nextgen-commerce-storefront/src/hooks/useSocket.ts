import { useEffect, useState } from "react";
import { joinProductRoom, leaveProductRoom, onStockUpdate } from "@/services/socket";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types/product";

export function useSocket() {
  const syncStock = useCartStore((s) => s.syncStock);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return onStockUpdate((payload) => {
      syncStock(payload.productId, payload.newStock);
      setPulsingIds((prev) => new Set(prev).add(payload.productId));
      window.setTimeout(() => {
        setPulsingIds((prev) => {
          const next = new Set(prev);
          next.delete(payload.productId);
          return next;
        });
      }, 900);
    });
  }, [syncStock]);

  return { pulsingIds };
}

export function useProductRoom(productId: string | undefined) {
  useEffect(() => {
    if (!productId) return;
    joinProductRoom(productId);
    return () => leaveProductRoom(productId);
  }, [productId]);
}

export function useLiveStock(product: Product | undefined): number {
  const [stock, setStock] = useState(product?.stock ?? 0);
  useEffect(() => {
    if (!product) return;
    setStock(product.stock);
    return onStockUpdate((payload) => {
      if (payload.productId === product.id) setStock(payload.newStock);
    });
  }, [product]);
  return stock;
}
