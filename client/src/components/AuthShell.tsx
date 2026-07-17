import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthShellProps = {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
};

/** Editorial frame matching the homepage — bone mat over a distinct ambient plate. */
export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-bone text-charcoal">
      {/* Ambient plate — different from form content; soft wash only */}
      <div className="absolute inset-0">
        <img
          src="/hero/bg-store.jpg"
          alt=""
          className="h-full w-full object-cover scale-110 blur-[18px] saturate-[0.75] brightness-[0.88]"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 50% 40%, rgba(244,241,234,0.55) 0%, transparent 60%),
              radial-gradient(ellipse 90% 80% at 50% 100%, rgba(181,120,67,0.35) 0%, transparent 55%),
              linear-gradient(180deg, rgba(28,27,25,0.2), rgba(28,27,25,0.35))
            `,
          }}
        />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 pt-6 sm:pt-8">
        <Link
          to="/"
          className="font-display text-sm tracking-[0.18em] uppercase text-white/90"
        >
          NextGen
        </Link>
        <nav className="flex items-center gap-6 text-[11px] tracking-[0.2em] uppercase text-white/85">
          <Link to="/shop" className="hover:text-white transition-colors duration-500">
            Shop
          </Link>
          <Link to="/" className="hover:text-white transition-colors duration-500">
            Home
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex items-center justify-center px-5 sm:px-10 py-10 sm:py-14">
        <div className="w-full max-w-md bg-bone p-2.5 sm:p-3 shadow-[0_24px_70px_rgba(28,27,25,0.22)]">
          <div className="bg-bone px-6 sm:px-8 py-8 sm:py-10">
            <p className="text-[10px] tracking-[0.32em] uppercase text-amber-earth/90 text-center mb-3">
              {eyebrow}
            </p>
            <Link to="/" className="block text-center">
              <span className="font-display text-[1.65rem] sm:text-3xl font-medium text-amber-earth leading-none">
                NextGen{" "}
                <em className="italic font-light text-charcoal">Commerce</em>
              </span>
            </Link>
            <h1 className="mt-8 font-display text-2xl sm:text-[1.75rem] font-medium text-charcoal text-center leading-snug">
              {title}
            </h1>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const authFieldClass =
  "w-full rounded-lg border border-charcoal/10 bg-[#f7f5f0] px-4 py-3 text-[14px] text-charcoal placeholder:text-charcoal/35 outline-none transition focus:border-amber-earth/50 focus:ring-1 focus:ring-amber-earth/30";

export const authLabelClass =
  "block text-[12px] font-medium text-charcoal/70 mb-1.5";
