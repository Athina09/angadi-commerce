import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-6xl text-terracotta-200">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink/55">That aisle does not exist on this market.</p>
      <Link
        to="/shop"
        className="mt-8 inline-flex rounded-full bg-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
      >
        Back to shop
      </Link>
    </main>
  );
}
