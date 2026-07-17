import { io, type Socket } from "socket.io-client";
import { PRODUCTS } from "@/mock/products";
import type { StockUpdatePayload } from "@/types/product";

type StockListener = (payload: StockUpdatePayload) => void;

const socketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;

let socket: Socket | null = null;
const listeners = new Set<StockListener>();
let simulatorTimer: ReturnType<typeof setInterval> | null = null;

const liveStock = new Map(PRODUCTS.map((p) => [p.id, p.stock]));

export function currentStock(productId: string, fallback: number): number {
  return liveStock.get(productId) ?? fallback;
}

function emitToListeners(payload: StockUpdatePayload) {
  liveStock.set(payload.productId, payload.newStock);
  listeners.forEach((listener) => listener(payload));
}

function startSimulator() {
  if (simulatorTimer) return;
  simulatorTimer = setInterval(() => {
    const inStock = PRODUCTS.filter((p) => (liveStock.get(p.id) ?? 0) > 0);
    if (inStock.length === 0) return;
    const product = inStock[Math.floor(Math.random() * inStock.length)];
    const stock = liveStock.get(product.id) ?? product.stock;
    const delta = Math.random() < 0.75 ? -(1 + Math.floor(Math.random() * 2)) : 2;
    const newStock = Math.max(0, Math.min(stock + delta, 99));
    if (newStock !== stock) emitToListeners({ productId: product.id, newStock });
  }, 5000);
}

function stopSimulator() {
  if (simulatorTimer) {
    clearInterval(simulatorTimer);
    simulatorTimer = null;
  }
}

export function onStockUpdate(listener: StockListener): () => void {
  listeners.add(listener);
  if (socketUrl) {
    if (!socket) {
      socket = io(socketUrl, { transports: ["websocket", "polling"] });
      socket.on("stock-updated", (payload: StockUpdatePayload) => {
        emitToListeners(payload);
      });
    }
  } else {
    startSimulator();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopSimulator();
      socket?.disconnect();
      socket = null;
    }
  };
}

export function joinProductRoom(productId: string) {
  socket?.emit("join", `product:${productId}`);
}

export function leaveProductRoom(productId: string) {
  socket?.emit("leave", `product:${productId}`);
}
