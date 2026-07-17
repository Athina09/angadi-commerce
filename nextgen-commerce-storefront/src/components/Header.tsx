import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";
import { MiniCart } from "@/components/MiniCart";
import { CartDrawer } from "@/components/CartDrawer";

export function Header() {
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  const handleSearch = (query: string) => {
    if (location.pathname === "/shop") {
      setSearchParams(
        (params) => {
          if (query) params.set("q", query);
          else params.delete("q");
          return params;
        },
        { replace: true }
      );
    } else if (query) {
      navigate(`/shop?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-terracotta-100/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Link to="/shop" className="flex shrink-0 items-center gap-2" aria-label="Angadi home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-terracotta-500 font-display text-lg text-white shadow-soft">
              N
            </span>
            <span className="hidden font-display text-lg font-bold leading-tight sm:block">
              Angadi
              <span className="block text-xs font-semibold uppercase tracking-widest text-mustard-500">
                Commerce
              </span>
            </span>
          </Link>
          <SearchBar onSearch={handleSearch} className="flex-1" />
          <MiniCart onOpen={() => setCartOpen(true)} />
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
