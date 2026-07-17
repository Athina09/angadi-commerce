import type { Server } from "socket.io";

let io: Server | null = null;

export function initIO(server: Server) {
  io = server;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

export function emitStockUpdated(payload: {
  listingId: string;
  catalogId: string;
  vendorId: string;
  stock: number;
  price: number;
  lowStockThreshold: number;
}) {
  try {
    getIO().to("listings").emit("stock-updated", payload);
  } catch (err) {
    console.warn("emit stock-updated failed", err);
  }
}

export function emitLowStockAlert(payload: {
  vendorId: string;
  listingId: string;
  catalogName: string;
  stock: number;
  lowStockThreshold: number;
}) {
  try {
    const server = getIO();
    server.to(`vendor:${payload.vendorId}`).emit("low-stock-alert", payload);
    server.to("listings").emit("low-stock-alert", payload);
  } catch (err) {
    console.warn("emit low-stock-alert failed", err);
  }
}

export function emitMarketPulse(vendorId: string, payload: unknown) {
  try {
    getIO().to(`vendor:${vendorId}`).emit("market-pulse", payload);
  } catch (err) {
    console.warn("emit market-pulse failed", err);
  }
}

export function emitVendorActivity(vendorId: string, payload: unknown) {
  try {
    getIO().to(`vendor:${vendorId}`).emit("vendor-activity", payload);
  } catch (err) {
    console.warn("emit vendor-activity failed", err);
  }
}

/** Live orders pipeline — create / status moves */
export function emitOrderPipeline(
  vendorId: string,
  payload: {
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
  }
) {
  try {
    getIO().to(`vendor:${vendorId}`).emit("order-pipeline", payload);
  } catch (err) {
    console.warn("emit order-pipeline failed", err);
  }
}

/** Freshness / quality check changed — hub + shop should refresh badges */
export function emitFreshnessUpdated(payload: {
  listingId: string;
  catalogId: string;
  vendorId: string;
  lastCheckQualityScore: number;
  freshnessPercent: number;
  freshnessBand: string;
  freshnessText: string;
  daysLeft?: number;
  daysSurviveText?: string;
}) {
  try {
    const server = getIO();
    server.to(`vendor:${payload.vendorId}`).emit("freshness-updated", payload);
    server.to("listings").emit("freshness-updated", payload);
  } catch (err) {
    console.warn("emit freshness-updated failed", err);
  }
}

/** New checkout sub-order awaiting vendor approval */
export function emitNewOrder(
  vendorId: string,
  payload: {
    vendorOrderId: string;
    orderId: string;
    customerId: string;
    customerName: string;
    subtotal: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    storeName: string;
    lines: Array<{
      listingId: string;
      name: string;
      imageUrl: string;
      qty: number;
      priceAtPurchase: number;
    }>;
  }
) {
  try {
    const server = getIO();
    server.to(`vendor:${vendorId}`).emit("new-order", payload);
    server.to(`customer:${payload.customerId}`).emit("order-created", {
      orderId: payload.orderId,
      vendorOrderId: payload.vendorOrderId,
    });
  } catch (err) {
    console.warn("emit new-order failed", err);
  }
}
