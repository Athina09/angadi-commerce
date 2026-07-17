-- Per-vendor checkout: Order → VendorOrder → OrderItem

CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'DEMO_PAY');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'HELD', 'RELEASED', 'COD_PENDING', 'COD_COLLECTED', 'REFUNDED');
CREATE TYPE "VendorOrderStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- Drop legacy order graph (demo data — re-seed after migrate)
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "status" "VendorOrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "vendorOrderId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "priceAtPurchase" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

CREATE INDEX "VendorOrder_orderId_idx" ON "VendorOrder"("orderId");
CREATE INDEX "VendorOrder_vendorId_idx" ON "VendorOrder"("vendorId");
CREATE INDEX "VendorOrder_status_idx" ON "VendorOrder"("status");
CREATE INDEX "VendorOrder_paymentStatus_idx" ON "VendorOrder"("paymentStatus");

CREATE INDEX "OrderItem_vendorOrderId_idx" ON "OrderItem"("vendorOrderId");
CREATE INDEX "OrderItem_listingId_idx" ON "OrderItem"("listingId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "VendorOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE IF EXISTS "OrderStatus";
