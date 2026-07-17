import { Link } from "react-router-dom";
import { PARTNER_STORES } from "@/mock/stores";
import { CATEGORIES } from "@/types/product";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-terracotta-100 bg-white/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl text-ink">Angadi</p>
          <p className="mt-2 text-sm text-ink/55 leading-relaxed max-w-xs">
            Hyperlocal grocery — compare nearby stores, watch live stock, checkout with UPI or COD.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mustard-500 mb-3">
            Categories
          </p>
          <ul className="space-y-1.5 text-sm text-ink/65">
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c}>
                <Link to={`/shop?category=${encodeURIComponent(c)}`} className="hover:text-terracotta-500">
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mustard-500 mb-3">
            Partner stores
          </p>
          <ul className="space-y-1.5 text-sm text-ink/65">
            {PARTNER_STORES.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-terracotta-50 py-4 text-center text-xs text-ink/40">
        Hackathon demo · mock payments · no real charges
      </div>
    </footer>
  );
}
