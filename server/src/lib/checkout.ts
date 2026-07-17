import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  VendorOrderStatus,
} from "@prisma/client";
import { prisma } from "./prisma.js";
import { emitLowStockAlert, emitNewOrder, emitStockUpdated } from "./io.js";
import { CRITICAL_STOCK_LT, notifyIfCriticalStock } from "./notify.js";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code?: string
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export type CheckoutLineInput = {
  listingId: string;
  qty: number;
};

type ListingRow = {
  id: string;
  vendorId: string;
  catalogId: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  catalog: { name: string; imageUrl: string };
  vendor: { id: string; storeName: string };
};

function initialPaymentStatus(method: PaymentMethod): PaymentStatus {
  return method === PaymentMethod.COD
    ? PaymentStatus.COD_PENDING
    : PaymentStatus.HELD;
}

function groupByVendor(
  lines: Array<{ listing: ListingRow; qty: number }>
): Map<string, Array<{ listing: ListingRow; qty: number }>> {
  const groups = new Map<string, Array<{ listing: ListingRow; qty: number }>>();
  for (const line of lines) {
    const cur = groups.get(line.listing.vendorId) ?? [];
    cur.push(line);
    groups.set(line.listing.vendorId, cur);
  }
  return groups;
}

/** Atomic stock decrement — fails if insufficient */
async function decrementStock(
  tx: Prisma.TransactionClient,
  listing: ListingRow,
  qty: number
) {
  const result = await tx.listing.updateMany({
    where: { id: listing.id, stock: { gte: qty } },
    data: { stock: { decrement: qty } },
  });
  if (result.count !== 1) {
    throw new CheckoutError(
      `Out of stock: ${listing.catalog.name.split("(")[0].trim()}`,
      409,
      "OUT_OF_STOCK"
    );
  }
}

export async function createOrderFromLines(args: {
  customerId: string;
  paymentMethod: PaymentMethod;
  lines: CheckoutLineInput[];
}) {
  if (args.lines.length === 0) {
    throw new CheckoutError("Cart is empty", 400, "EMPTY_CART");
  }

  const listingIds = [...new Set(args.lines.map((l) => l.listingId))];
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, stock: { gt: 0 } },
    include: {
      catalog: { select: { name: true, imageUrl: true } },
      vendor: { select: { id: true, storeName: true } },
    },
  });

  if (listings.length !== listingIds.length) {
    throw new CheckoutError(
      "One or more items are unavailable",
      409,
      "UNAVAILABLE"
    );
  }

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const resolved: Array<{ listing: ListingRow; qty: number }> = [];

  for (const line of args.lines) {
    const listing = listingById.get(line.listingId);
    if (!listing) {
      throw new CheckoutError("Listing not found", 404);
    }
    if (line.qty < 1) {
      throw new CheckoutError("Invalid quantity", 400);
    }
    if (listing.stock < line.qty) {
      throw new CheckoutError(
        `Out of stock: ${listing.catalog.name.split("(")[0].trim()}`,
        409,
        "OUT_OF_STOCK"
      );
    }
    resolved.push({ listing: listing as ListingRow, qty: line.qty });
  }

  const vendorGroups = groupByVendor(resolved);
  const payStatus = initialPaymentStatus(args.paymentMethod);
  const totalAmount = resolved.reduce(
    (s, { listing, qty }) => s + listing.price * qty,
    0
  );

  const order = await prisma.$transaction(async (tx) => {
    // Decrement ALL listings first — rolls back entire order on any failure
    for (const { listing, qty } of resolved) {
      await decrementStock(tx, listing, qty);
    }

    const created = await tx.order.create({
      data: {
        customerId: args.customerId,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paymentMethod: args.paymentMethod,
        vendorOrders: {
          create: [...vendorGroups.entries()].map(([vendorId, groupLines]) => {
            const subtotal = groupLines.reduce(
              (s, { listing, qty }) => s + listing.price * qty,
              0
            );
            return {
              vendorId,
              subtotal: Math.round(subtotal * 100) / 100,
              status: VendorOrderStatus.PENDING_APPROVAL,
              paymentStatus: payStatus,
              items: {
                create: groupLines.map(({ listing, qty }) => ({
                  listingId: listing.id,
                  qty,
                  priceAtPurchase: listing.price,
                })),
              },
            };
          }),
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        vendorOrders: {
          include: {
            vendor: { select: { id: true, storeName: true } },
            items: {
              include: {
                listing: {
                  select: {
                    id: true,
                    catalog: { select: { name: true, imageUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    await tx.cartItem.deleteMany({
      where: {
        customerId: args.customerId,
        listingId: { in: listingIds },
      },
    });

    return created;
  });

  // Post-commit: stock sockets + low-stock alerts
  for (const { listing, qty } of resolved) {
    const fresh = await prisma.listing.findUnique({
      where: { id: listing.id },
      include: { catalog: { select: { name: true } } },
    });
    if (!fresh) continue;
    emitStockUpdated({
      listingId: fresh.id,
      catalogId: fresh.catalogId,
      vendorId: fresh.vendorId,
      stock: fresh.stock,
      price: fresh.price,
      lowStockThreshold: fresh.lowStockThreshold,
    });
    if (
      fresh.stock <= fresh.lowStockThreshold ||
      fresh.stock < CRITICAL_STOCK_LT
    ) {
      emitLowStockAlert({
        vendorId: fresh.vendorId,
        listingId: fresh.id,
        catalogName: fresh.catalog.name,
        stock: fresh.stock,
        lowStockThreshold: fresh.lowStockThreshold,
      });
      void notifyIfCriticalStock(
        {
          vendorId: fresh.vendorId,
          listingId: fresh.id,
          catalogName: fresh.catalog.name,
          stock: fresh.stock,
          lowStockThreshold: fresh.lowStockThreshold,
        },
        { force: fresh.stock < CRITICAL_STOCK_LT }
      );
    }
  }

  for (const vo of order.vendorOrders) {
    emitNewOrder(vo.vendorId, {
      vendorOrderId: vo.id,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customer.name,
      subtotal: vo.subtotal,
      status: vo.status,
      paymentStatus: vo.paymentStatus,
      paymentMethod: order.paymentMethod,
      storeName: vo.vendor.storeName,
      lines: vo.items.map((i) => ({
        listingId: i.listingId,
        name: i.listing.catalog.name,
        imageUrl: i.listing.catalog.imageUrl,
        qty: i.qty,
        priceAtPurchase: i.priceAtPurchase,
      })),
    });
  }

  return order;
}

export function serializeCustomerOrder(
  order: Prisma.OrderGetPayload<{
    include: {
      customer: { select: { id: true; name: true; email: true } };
      vendorOrders: {
        include: {
          vendor: { select: { id: true; storeName: true } };
          items: {
            include: {
              listing: {
                select: {
                  id: true;
                  catalog: { select: { name: true; imageUrl: true } };
                };
              };
            };
          };
        };
      };
    };
  }>
) {
  return {
    id: order.id,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    customer: order.customer,
    vendorOrders: order.vendorOrders.map((vo) => ({
      id: vo.id,
      orderId: vo.orderId,
      vendorId: vo.vendorId,
      storeName: vo.vendor.storeName,
      subtotal: vo.subtotal,
      status: vo.status,
      paymentStatus: vo.paymentStatus,
      approvedAt: vo.approvedAt?.toISOString() ?? null,
      rejectedAt: vo.rejectedAt?.toISOString() ?? null,
      createdAt: vo.createdAt.toISOString(),
      items: vo.items.map((i) => ({
        listingId: i.listingId,
        name: i.listing.catalog.name,
        imageUrl: i.listing.catalog.imageUrl,
        qty: i.qty,
        priceAtPurchase: i.priceAtPurchase,
      })),
    })),
  };
}
