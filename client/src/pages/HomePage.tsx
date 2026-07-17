import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { cn } from "../lib/utils";

const HERO_SCENES = [
  {
    id: "market-essentials",
    image: "/hero/crop-1.jpg",
    support:
      "Groceries, greens, and daily staples — from neighborhood stalls to your door.",
    asideEyebrow: "Explore everyday essentials",
    asideLine: "From your kitchen to your desk",
  },
  {
    id: "desk-and-home",
    image: "/hero/crop-desk.jpg",
    support:
      "Notebooks, pantry jars, household bits — everything the week asks for.",
    asideEyebrow: "Explore everyday essentials",
    asideLine: "Stationery · home · pantry",
  },
  {
    id: "pantry-mix",
    image: "/hero/crop-mix.jpg",
    support:
      "One marketplace for produce, packaged goods, and the rest of the list.",
    asideEyebrow: "Explore everyday essentials",
    asideLine: "Available across the city",
  },
];

export function HomePage() {
  const { user, logout } = useAuthStore();
  const [scene, setScene] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (hovering) return; // pause while exploring hover actions
    const id = window.setInterval(() => {
      setScene((s) => (s + 1) % HERO_SCENES.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [hovering]);

  const current = HERO_SCENES[scene];
  const sellHref = user?.role === "vendor" ? "/vendor/dashboard" : "/register";
  const shopHref = "/shop";

  return (
    <div className="min-h-screen bg-bone text-charcoal">
      {/* Full-bleed hero — taller first viewport */}
      <section
        className="relative h-[94svh] min-h-[560px] max-h-none w-full overflow-hidden group/hero"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {HERO_SCENES.map((s, i) => (
          <img
            key={s.id}
            src={s.image}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out",
              i === scene ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/40 pointer-events-none" />

        {/* Quiet hover overlay — shop / sell locations */}
        <div
          className={cn(
            "absolute inset-0 z-30 flex items-center justify-center gap-4 sm:gap-6 px-6 transition-opacity duration-500",
            hovering ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]" />
          <Link
            to={shopHref}
            className="relative z-10 min-w-[140px] sm:min-w-[170px] rounded-full border border-white/70 bg-white/10 px-6 sm:px-8 py-3 sm:py-3.5 text-center text-[12px] sm:text-sm tracking-[0.22em] uppercase text-white hover:bg-white hover:text-charcoal transition-colors duration-500"
          >
            Shop nearby
          </Link>
          <Link
            to={sellHref}
            className="relative z-10 min-w-[140px] sm:min-w-[170px] rounded-full border border-white/70 bg-white/10 px-6 sm:px-8 py-3 sm:py-3.5 text-center text-[12px] sm:text-sm tracking-[0.22em] uppercase text-white hover:bg-white hover:text-charcoal transition-colors duration-500"
          >
            {user?.role === "vendor" ? "Vendor hub" : "Sell with us"}
          </Link>
          <p className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-10 text-[11px] sm:text-xs tracking-[0.2em] uppercase text-white/70">
            Delivering across your city
          </p>
        </div>

        {/* Visible navbar bar */}
        <header className="absolute top-0 inset-x-0 z-40">
          <div className="mx-3 sm:mx-5 mt-3 sm:mt-4 flex items-center justify-between rounded-full border border-white/20 bg-charcoal/55 backdrop-blur-md px-5 sm:px-7 py-3 sm:py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <Link
              to="/"
              className="font-display text-base sm:text-lg tracking-[0.16em] uppercase text-white"
            >
              NextGen
            </Link>
            <nav className="flex items-center gap-4 sm:gap-7 text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-white/95">
              <Link to="/shop" className="hover:text-white transition-colors">
                Shop
              </Link>
              {user ? (
                <>
                  <Link
                    to={user.role === "vendor" ? "/vendor/dashboard" : "/shop/orders"}
                    className="hover:text-white transition-colors"
                  >
                    {user.role === "vendor" ? "Hub" : "Orders"}
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="hover:text-white transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-full border border-white/60 px-3.5 py-1.5 hover:bg-white hover:text-charcoal transition-colors duration-300"
                  >
                    Sell
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <div className="absolute top-[4.75rem] sm:top-24 left-1/2 -translate-x-1/2 z-10">
          <Link
            to="/shop"
            className="inline-flex items-center rounded-full border border-white px-5 sm:px-6 py-2.5 text-[12px] sm:text-[13px] tracking-[0.24em] uppercase text-white bg-charcoal/30 backdrop-blur-sm hover:bg-white/15 transition-colors duration-500"
          >
            Shop all essentials
          </Link>
        </div>

        <div className="absolute bottom-8 sm:bottom-10 left-6 sm:left-10 lg:left-14 right-28 sm:right-44 z-10">
          <h1 className="font-display text-white leading-[0.9] tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.45)]">
            <span className="block text-[clamp(2.75rem,8vw,5.5rem)] font-medium">
              NextGen
            </span>
            <span className="block text-[clamp(2.1rem,6.5vw,4rem)] font-light italic opacity-95 -mt-0.5">
              Commerce
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-[20rem] sm:max-w-md text-[14px] sm:text-base leading-relaxed text-white font-sans drop-shadow-md">
            {current.support}
          </p>
        </div>

        <div className="absolute bottom-8 sm:bottom-10 right-6 sm:right-10 lg:right-14 z-10 text-right max-w-[11rem] sm:max-w-[13rem]">
          <p className="text-[11px] sm:text-xs tracking-[0.26em] uppercase text-white font-sans drop-shadow-md">
            {current.asideEyebrow}
          </p>
          <p className="mt-1.5 font-display text-sm sm:text-lg text-white italic leading-snug drop-shadow-md">
            {current.asideLine}
          </p>
        </div>

        {/* Scene dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {HERO_SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show scene ${i + 1}`}
              onClick={() => setScene(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === scene ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      </section>

      <section className="bg-bone px-6 sm:px-10 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.35em] uppercase text-amber-earth/85 mb-4 font-sans">
            Our promise
          </p>
          <h2 className="font-display text-[clamp(1.35rem,3.2vw,2rem)] leading-snug text-charcoal font-medium">
            Fresh from the stall,{" "}
            <em className="italic font-light">curated with care</em> — goods
            you’d buy from a neighbor, not a warehouse.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-charcoal/65 max-w-md mx-auto font-sans">
            NextGen Commerce connects you with local vendors for produce,
            pantry, bakery, and everyday essentials — picked that morning, sold
            by people with a name and a stall.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6">
            <Link
              to="/shop"
              className="text-[11px] tracking-[0.25em] uppercase border-b border-charcoal/40 pb-1 hover:border-amber-earth hover:text-amber-earth transition-colors duration-500"
            >
              Enter the market
            </Link>
            <Link
              to="/register"
              className="text-[11px] tracking-[0.25em] uppercase text-charcoal/50 hover:text-charcoal transition-colors duration-500"
            >
              Open a stall
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-bone border-t border-charcoal/8 px-4 sm:px-8 py-8 sm:py-10">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl overflow-hidden">
          <Link
            to="/shop"
            className="md:col-span-7 group relative overflow-hidden aspect-[16/10] md:aspect-auto md:min-h-[160px] md:h-[160px] bg-charcoal"
          >
            <img
              src="/hero/crop-3.jpg"
              alt="Fresh produce"
              className="h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-3 text-white">
              <p className="text-[9px] tracking-[0.28em] uppercase opacity-80">
                Produce
              </p>
              <p className="font-display text-lg mt-0.5 italic">The morning crate</p>
            </div>
          </Link>
          <div className="md:col-span-5 flex flex-col gap-2">
            <Link
              to="/shop"
              className="group relative overflow-hidden h-[76px] bg-charcoal"
            >
              <img
                src="/hero/crop-desk.jpg"
                alt="Stationery"
                className="h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute bottom-2.5 left-3 text-white">
                <p className="text-[9px] tracking-[0.28em] uppercase opacity-80">
                  Stationery
                </p>
                <p className="font-display text-sm mt-0.5">For the desk</p>
              </div>
            </Link>
            <Link
              to="/shop"
              className="group relative overflow-hidden h-[76px] bg-charcoal"
            >
              <img
                src="/hero/crop-pantry.jpg"
                alt="Pantry"
                className="h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-2.5 left-3 text-white">
                <p className="text-[9px] tracking-[0.28em] uppercase opacity-80">
                  Household & pantry
                </p>
                <p className="font-display text-sm mt-0.5 italic">Everyday staples</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-bone border-t border-charcoal/8 px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] tracking-[0.15em] uppercase text-charcoal/45">
        <span className="font-display tracking-normal normal-case text-sm text-charcoal/70">
          NextGen Commerce
        </span>
        <span>Hyperlocal market · Est. for the neighborhood</span>
      </footer>
    </div>
  );
}
