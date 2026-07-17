import { io, type Socket } from "socket.io-client";

const url = import.meta.env.VITE_API_URL as string | undefined;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (!url) return null;
  if (!socket) {
    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinVendorRoom(vendorId: string) {
  const s = getSocket();
  s?.emit("join-vendor", vendorId);
}

export function joinProductRoom(catalogId: string) {
  getSocket()?.emit("join-product", catalogId);
}

export function leaveProductRoom(catalogId: string) {
  getSocket()?.emit("leave-product", catalogId);
}

export type StockUpdatedEvent = {
  listingId: string;
  catalogId: string;
  vendorId: string;
  stock: number;
  price: number;
  lowStockThreshold: number;
};

export type LowStockAlertEvent = {
  vendorId: string;
  listingId: string;
  catalogName: string;
  stock: number;
  lowStockThreshold: number;
};

export type MarketPulseSocketEvent = {
  id: string;
  kind: "competitor" | "stock" | "price" | "density";
  title: string;
  detail: string;
  at: string;
  severity?: "info" | "warn" | "critical";
};

export type FreshnessUpdatedEvent = {
  listingId: string;
  catalogId: string;
  vendorId: string;
  lastCheckQualityScore: number;
  freshnessPercent: number;
  freshnessBand: string;
  freshnessText: string;
  daysLeft?: number;
  daysSurviveText?: string;
};

export type OrderPipelineEvent = {
  action: "created" | "advanced" | "batch";
  orders: Array<{
    id: string;
    status: "pending" | "processing" | "completed";
    total: number;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    lines: Array<{
      listingId: string;
      name: string;
      imageUrl: string;
      qty: number;
      priceAtPurchase: number;
    }>;
  }>;
};
