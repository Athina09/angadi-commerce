import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import { toast } from "sonner";

export function ShopCheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const shipping = subtotal >= 499 ? 0 : 39;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center gap-4 px-4">
        <p className="font-display text-2xl">Cart is empty</p>
        <Link to="/shop" className="text-amber-earth underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone text-charcoal">
      <header className="border-b border-charcoal/10 px-5 py-4 max-w-3xl mx-auto">
        <Link to="/shop" className="text-sm text-amber-earth hover:underline">
          ← Continue shopping
        </Link>
        <h1 className="font-display text-3xl mt-3">Checkout</h1>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <section className="rounded-2xl border border-charcoal/10 bg-white p-5">
          <h2 className="font-display text-lg">Delivery</h2>
          <p className="mt-2 text-sm text-charcoal/60">
            12, 3rd Cross, T. Nagar, Chennai 600017 · Demo address
          </p>
        </section>
        <section className="rounded-2xl border border-charcoal/10 bg-white p-5 space-y-2">
          <h2 className="font-display text-lg mb-3">Order summary</h2>
          {items.map((i) => (
            <div key={`${i.storeId}:${i.catalogId}`} className="flex justify-between text-sm">
              <span>
                {i.name} × {i.qty}
                <span className="block text-[10px] text-charcoal/40">{i.storeName}</span>
              </span>
              <span>{formatINR(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="border-t border-charcoal/8 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes (est.)</span>
              <span>{formatINR(tax)}</span>
            </div>
            <div className="flex justify-between font-display text-xl pt-2">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        </section>
        <button
          type="button"
          onClick={() => {
            clearCart();
            toast.success("Order placed (demo)");
            navigate("/shop/checkout/success", {
              state: { ref: `NG${Date.now().toString().slice(-6)}`, total },
            });
          }}
          className="w-full rounded-full bg-charcoal py-3 text-[11px] uppercase tracking-wider text-white"
        >
          Proceed · demo pay
        </button>
      </main>
    </div>
  );
}

export function ShopCheckoutSuccessPage() {
  const { state } = useLocation() as { state?: { ref?: string; total?: number } };
  if (!state?.ref) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Link to="/shop">Back to shop</Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-4 text-center">
      <div className="h-14 w-14 rounded-full border-2 border-emerald-600 text-emerald-600 flex items-center justify-center text-2xl">
        ✓
      </div>
      <h1 className="font-display text-3xl mt-6">Order placed!</h1>
      <p className="text-sm text-charcoal/55 mt-2">Order {state.ref}</p>
      <p className="font-display text-xl mt-2">{formatINR(state.total ?? 0)}</p>
      <Link to="/shop" className="mt-8 rounded-full bg-charcoal px-8 py-3 text-[11px] uppercase tracking-wider text-white">
        Continue shopping
      </Link>
    </div>
  );
}
