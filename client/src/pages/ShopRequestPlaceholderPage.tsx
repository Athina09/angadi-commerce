import { Link, useSearchParams } from "react-router-dom";

/** Placeholder until ProductRequest API (§5) — keeps empty-state CTAs alive */
export function ShopRequestPlaceholderPage() {
  const [params] = useSearchParams();
  const name = params.get("name") || "";
  const category = params.get("category") || "";

  return (
    <div className="min-h-screen bg-bone text-charcoal flex items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="text-[10px] tracking-[0.28em] uppercase text-amber-earth">
          Product request
        </p>
        <h1 className="mt-3 font-display text-3xl">Coming in next build</h1>
        <p className="mt-3 text-sm text-charcoal/60 leading-relaxed">
          Storefront + comparison are live on real catalog data. Request emails
          to nearby vendors land next (schema + Nodemailer + vendor hub inbox).
        </p>
        {(name || category) && (
          <p className="mt-4 rounded-xl bg-white border border-charcoal/10 px-4 py-3 text-[13px] text-left">
            Prefill ready:{" "}
            <strong>{name || "—"}</strong>
            {category ? ` · ${category}` : ""}
          </p>
        )}
        <Link
          to="/shop"
          className="mt-8 inline-block text-[11px] tracking-[0.2em] uppercase border-b border-charcoal/30 pb-1"
        >
          Back to shop
        </Link>
      </div>
    </div>
  );
}
