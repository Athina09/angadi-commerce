import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Brain,
  Check,
  Lock,
  Mail,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useAuthStore, type Role } from "../store/authStore";
import { cn } from "../lib/utils";

const FEATURES = [
  {
    title: "AI Inventory",
    desc: "Forecast stock before you run out",
    icon: Brain,
  },
  {
    title: "Live Analytics",
    desc: "See what’s selling in real time",
    icon: BarChart3,
  },
  {
    title: "Smart Pricing",
    desc: "Stay competitive in your area",
    icon: Tag,
  },
  {
    title: "Customer Insights",
    desc: "Know who buys — and why",
    icon: Users,
  },
] as const;

function FloatingField({
  label,
  type,
  value,
  onChange,
  autoComplete,
  icon: Icon,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: typeof User;
  minLength?: number;
}) {
  const id = useId();

  return (
    <div className="relative group">
      <Icon
        className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#8a7a6a] transition-colors group-focus-within:text-[#B97743]"
        strokeWidth={1.5}
      />
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        className={cn(
          "peer h-14 w-full rounded-[14px] border border-[#e8dfd4] bg-[#faf6f1] pl-12 pr-4 pt-4 text-[15px] text-[#1C1B19]",
          "outline-none transition-all duration-300",
          "placeholder:text-transparent",
          "focus:border-[#B97743]/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(185,119,67,0.12)]"
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-12 transition-all duration-200",
          "top-1/2 -translate-y-1/2 text-[14px] text-[#9a8b7c]",
          "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:tracking-[0.12em] peer-focus:uppercase peer-focus:text-[#B97743]",
          "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:tracking-[0.12em] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:text-[#B97743]"
        )}
      >
        {label}
      </label>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      const user = await register({ name, email, password, role });
      navigate(user.role === "vendor" ? "/vendor/onboarding" : "/shop");
    } catch {
      /* store holds error */
    }
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden font-[family-name:var(--font-inter)] text-[#1C1B19]">
      {/* Boutique background + warm dark overlay + vignette */}
      <div className="absolute inset-0">
        <img
          src="/auth/boutique.jpg"
          alt=""
          className="signup-bg-zoom h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(105deg, rgba(28,27,25,0.72) 0%, rgba(28,27,25,0.55) 45%, rgba(28,27,25,0.48) 100%),
              radial-gradient(ellipse at center, transparent 40%, rgba(20,16,12,0.45) 100%)
            `,
          }}
        />
      </div>

      {/* Top nav */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 pt-5 sm:pt-6">
        <Link
          to="/"
          className="font-[family-name:var(--font-playfair)] text-lg sm:text-xl tracking-[0.14em] uppercase text-white"
        >
          NextGen
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[12px] tracking-[0.16em] uppercase text-white/80">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <span className="hover:text-white transition-colors cursor-default opacity-70">
            Pricing
          </span>
          <span className="hover:text-white transition-colors cursor-default opacity-70">
            About
          </span>
          <Link
            to="/login"
            className="rounded-full border border-white/35 px-4 py-2 text-white hover:bg-white hover:text-[#1C1B19] transition-all duration-300"
          >
            Sign In
          </Link>
        </nav>
        <Link
          to="/login"
          className="md:hidden text-[12px] tracking-[0.16em] uppercase text-white/90 border border-white/35 rounded-full px-3.5 py-1.5"
        >
          Sign In
        </Link>
      </header>

      {/* Split layout */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center min-h-[calc(100svh-5rem)]">
        {/* LEFT — Hero */}
        <div id="features" className="text-white max-w-xl">
          <h1 className="font-[family-name:var(--font-playfair)] text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.12] font-medium">
            Grow Your Local Business{" "}
            <em className="italic font-normal text-[#e8c9a8]">Smarter.</em>
          </h1>
          <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-white/75 max-w-md">
            Join thousands of vendors using AI-powered analytics, inventory
            management, and customer insights to increase sales.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-[22px] border border-white/15 bg-white/8 backdrop-blur-md px-4 py-4 transition-all duration-300 hover:bg-white/12 hover:border-white/25 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#e8c9a8]">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold tracking-tight">
                        {f.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-white/55 leading-snug">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Glass signup card */}
        <div className="signup-card-in w-full max-w-[440px] mx-auto lg:ml-auto lg:mr-0">
          <div
            className="rounded-[28px] border border-white/40 p-7 sm:p-9 shadow-[0_30px_80px_rgba(20,14,8,0.35),0_2px_0_rgba(255,255,255,0.35)_inset]"
            style={{
              background: "rgba(255,250,245,0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-[family-name:var(--font-playfair)] text-xl tracking-[0.08em] text-[#1C1B19]"
              >
                <Sparkles className="h-4 w-4 text-[#B97743]" strokeWidth={1.5} />
                NEXTGEN
              </Link>
              <p className="mt-3 text-[10px] tracking-[0.28em] uppercase text-[#B97743] font-medium">
                Join the marketplace
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-[1.85rem] sm:text-[2rem] font-semibold text-[#1C1B19] leading-tight">
                Create your account
              </h2>
              <p className="mt-2 text-[14px] text-[#6b5a4a]/80">
                Start selling in minutes.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-2xl bg-red-50 text-red-800 text-[13px] px-4 py-3 border border-red-100">
                  {error}
                </div>
              )}

              <FloatingField
                label="Full name"
                type="text"
                value={name}
                onChange={setName}
                autoComplete="name"
                icon={User}
                minLength={2}
              />
              <FloatingField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                icon={Mail}
              />
              <FloatingField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                icon={Lock}
                minLength={6}
              />

              {/* Segmented role control */}
              <div>
                <p className="mb-2 text-[11px] tracking-[0.14em] uppercase text-[#8a7a6a] font-medium">
                  I am a
                </p>
                <div className="relative grid grid-cols-2 rounded-[14px] bg-[#efe8df] p-1">
                  <span
                    className={cn(
                      "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[12px] transition-transform duration-300 ease-out",
                      "bg-gradient-to-r from-[#B97743] to-[#D19358] shadow-[0_4px_14px_rgba(185,119,67,0.35)]",
                      role === "vendor" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                    )}
                    aria-hidden
                  />
                  {(["customer", "vendor"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "relative z-10 py-3 text-[13px] font-semibold tracking-[0.06em] capitalize transition-colors duration-300",
                        role === r ? "text-white" : "text-[#6b5a4a]"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "mt-2 w-full h-14 rounded-[16px] text-white text-[14px] font-semibold tracking-[0.04em]",
                  "bg-gradient-to-r from-[#B97743] to-[#D19358]",
                  "shadow-[0_10px_28px_rgba(185,119,67,0.35)]",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(185,119,67,0.45)]",
                  "active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
                )}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>

              <ul className="pt-2 space-y-2">
                {[
                  "Secure Authentication",
                  "Trusted by 5,000+ Vendors",
                  "No Credit Card Required",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 text-[12px] text-[#6b5a4a]/75"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B97743]/15 text-[#B97743]">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <p className="text-center text-[13px] text-[#6b5a4a]/70 pt-3">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-[#B97743] hover:underline underline-offset-4"
                >
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
