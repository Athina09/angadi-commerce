import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UpiPaymentModal } from "@/components/UpiPaymentModal";
import { EmptyState } from "@/components/EmptyState";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/utils/currency";

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"UPI" | "COD">("UPI");
  const [upiOpen, setUpiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState({
    name: "Aisha Rahman",
    phone: "98765 43210",
    line1: "12, 3rd Cross Street",
    area: "T. Nagar",
    city: "Chennai",
    pin: "600017",
  });

  const shipping = subtotal >= 499 || subtotal === 0 ? 0 : 39;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing to checkout"
        description="Your cart is empty."
        actionLabel="Browse products"
        onAction={() => navigate("/shop")}
      />
    );
  }

  const finish = (ref: string, pay: "UPI" | "COD") => {
    clearCart();
    navigate("/order-success", {
      state: {
        reference: ref,
        storeName: "Angadi",
        amount: total,
        method: pay,
      },
    });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <Link to="/shop" className="text-sm font-semibold text-terracotta-600 hover:underline">
        ← Continue shopping
      </Link>
      <h1 className="mt-4 font-display text-3xl text-ink">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <section className="rounded-2xl border border-terracotta-100 bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg">Delivery address</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "Full name"],
                  ["phone", "Phone"],
                  ["line1", "Address"],
                  ["area", "Area"],
                  ["city", "City"],
                  ["pin", "PIN"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm sm:col-span-1">
                  <span className="text-ink/55">{label}</span>
                  <input
                    value={address[key]}
                    onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-terracotta-100 px-3 py-2 outline-none focus:border-terracotta-400"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-terracotta-100 bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["UPI", "Pay instantly with any UPI app"],
                  ["COD", "Pay when your order arrives"],
                ] as const
              ).map(([id, note]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    method === id
                      ? "border-terracotta-500 bg-terracotta-50"
                      : "border-terracotta-100 hover:border-terracotta-300"
                  }`}
                >
                  <p className="font-display text-base">{id === "COD" ? "Cash on Delivery" : "UPI"}</p>
                  <p className="mt-1 text-xs text-ink/55">{note}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-terracotta-100 bg-white p-5 shadow-soft space-y-3">
            <h2 className="font-display text-lg">Order summary</h2>
            <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {items.map((i) => (
                <li key={`${i.storeId}:${i.productId}`} className="flex justify-between gap-2">
                  <span className="truncate text-ink/70">
                    {i.name} × {i.qty}
                    <span className="block text-[10px] text-ink/40">{i.storeName}</span>
                  </span>
                  <span>{formatINR(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-terracotta-50 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/55">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/55">Shipping</span>
                <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/55">Taxes (est.)</span>
                <span>{formatINR(tax)}</span>
              </div>
              <div className="flex justify-between pt-2 font-display text-xl">
                <span>Total</span>
                <span className="text-terracotta-500">{formatINR(total)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (method === "UPI") {
                  setUpiOpen(true);
                  return;
                }
                setBusy(true);
                window.setTimeout(() => {
                  finish(`COD${Date.now().toString().slice(-8)}`, "COD");
                }, 2000);
              }}
              className="w-full rounded-full bg-ink py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-50"
            >
              {busy ? "Placing order…" : "Proceed"}
            </button>
          </div>
        </aside>
      </div>

      <UpiPaymentModal
        open={upiOpen}
        onClose={() => setUpiOpen(false)}
        amount={total}
        upiId="angadi@upi"
        storeName="Angadi"
        onSuccess={(ref) => finish(ref, "UPI")}
      />
    </main>
  );
}
