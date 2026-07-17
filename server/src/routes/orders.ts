import { Router } from "express";
import { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  CheckoutError,
  createOrderFromLines,
  serializeCustomerOrder,
} from "../lib/checkout.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const createOrderSchema = z.object({
  paymentMethod: z.enum(["COD", "DEMO_PAY"]),
  /** Optional — if omitted, uses the authenticated customer's cart */
  items: z
    .array(
      z.object({
        listingId: z.string().min(1),
        qty: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1)
    .optional(),
  address: z.string().max(500).optional(),
});

/**
 * POST /orders
 * One parent Order + one VendorOrder per shop in the cart.
 * Atomic stock decrement across all vendors — all-or-nothing checkout.
 */
router.post(
  "/",
  requireAuth,
  requireRole("customer"),
  async (req: AuthedRequest, res) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid checkout payload",
          details: parsed.error.flatten(),
        });
        return;
      }

      const customerId = req.user!.userId;
      let lines = parsed.data.items;

      if (!lines || lines.length === 0) {
        const cart = await prisma.cartItem.findMany({
          where: { customerId },
          select: { listingId: true, qty: true },
        });
        if (cart.length === 0) {
          res.status(400).json({ error: "Cart is empty" });
          return;
        }
        lines = cart.map((c) => ({ listingId: c.listingId, qty: c.qty }));
      }

      const order = await createOrderFromLines({
        customerId,
        paymentMethod: parsed.data.paymentMethod as PaymentMethod,
        lines,
      });

      res.status(201).json({
        order: serializeCustomerOrder(order),
        note:
          parsed.data.paymentMethod === "DEMO_PAY"
            ? "Demo payment — funds held per vendor until seller approves"
            : "COD — pay each shop on delivery after approval",
      });
    } catch (err) {
      if (err instanceof CheckoutError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      console.error("POST /orders", err);
      res.status(500).json({ error: "Checkout failed" });
    }
  }
);

export default router;
