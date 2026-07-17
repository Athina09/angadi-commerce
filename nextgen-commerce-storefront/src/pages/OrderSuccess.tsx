import { Link, Navigate, useLocation } from "react-router-dom";
import { formatINR } from "@/utils/currency";

type State = {
  reference?: string;
  storeName?: string;
  amount?: number;
  method?: string;
};

export default function OrderSuccess() {
  const location = useLocation();
  const order = (location.state ?? {}) as State;
  if (!order.reference) return <Navigate to="/shop" replace />;

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-sage text-sage text-2xl">
        ✓
      </div>
      <h1 className="mt-6 font-display text-3xl text-ink">Order placed!</h1>
      <p className="mt-2 text-sm text-ink/60">
        {order.storeName} · {order.method ?? "Payment"} confirmed
      </p>
      <p className="mt-4 font-display text-xl text-terracotta-500">
        {formatINR(order.amount ?? 0)}
      </p>
      <p className="mt-2 text-sm text-ink/55">
        Order ID <span className="font-semibold text-ink">{order.reference}</span>
      </p>
      <p className="mt-1 text-sm text-ink/45">Estimated delivery · 45–90 minutes</p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/shop"
          className="rounded-full bg-ink px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
