import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, Sparkles } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { cn } from "../lib/utils";

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
  icon: typeof Mail;
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

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const mail = email.trim();
    const pass = password.trim() || "demo";
    if (!mail) return;
    try {
      // Demo: default to vendor hub for any sign-in (hackathon)
      const user = await login(mail, pass, "vendor");
      if (user.role === "vendor") {
        navigate("/vendor/dashboard");
      } else {
        navigate("/shop");
      }
    } catch {
      /* error shown from store */
    }
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden font-[family-name:var(--font-inter)] text-[#1C1B19]">
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

      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 pt-5 sm:pt-6">
        <Link
          to="/"
          className="font-[family-name:var(--font-playfair)] text-lg sm:text-xl tracking-[0.14em] uppercase text-white"
        >
          NextGen
        </Link>
        <Link
          to="/register"
          className="rounded-full border border-white/35 px-4 py-2 text-[12px] tracking-[0.16em] uppercase text-white hover:bg-white hover:text-[#1C1B19] transition-all duration-300"
        >
          Create account
        </Link>
      </header>

      <div className="relative z-10 flex min-h-[calc(100svh-5rem)] items-center justify-center px-5 py-12">
        <div className="signup-card-in w-full max-w-[420px]">
          <div
            className="rounded-[28px] border border-white/40 p-7 sm:p-9 shadow-[0_30px_80px_rgba(20,14,8,0.35)]"
            style={{
              background: "rgba(255,250,245,0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-[family-name:var(--font-playfair)] text-xl tracking-[0.08em]"
              >
                <Sparkles className="h-4 w-4 text-[#B97743]" strokeWidth={1.5} />
                NEXTGEN
              </Link>
              <p className="mt-3 text-[10px] tracking-[0.28em] uppercase text-[#B97743] font-medium">
                Welcome back
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-[1.85rem] font-semibold">
                Sign in
              </h1>
              <p className="mt-2 text-[14px] text-[#6b5a4a]/80">
                Continue to your marketplace.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-2xl bg-red-50 text-red-800 text-[13px] px-4 py-3 border border-red-100">
                  {error}
                </div>
              )}
              <FloatingField
                label="Email"
                type="text"
                value={email}
                onChange={setEmail}
                autoComplete="username"
                icon={Mail}
              />
              <FloatingField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                icon={Lock}
              />
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "mt-2 w-full h-14 rounded-[16px] text-white text-[14px] font-semibold",
                  "bg-gradient-to-r from-[#B97743] to-[#D19358]",
                  "shadow-[0_10px_28px_rgba(185,119,67,0.35)]",
                  "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(185,119,67,0.45)]",
                  "disabled:opacity-60"
                )}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <p className="text-center text-[12px] text-[#6b5a4a]/55 pt-1 leading-relaxed">
                Demo · any email &amp; password works · opens vendor hub
              </p>
              <p className="text-center text-[13px] text-[#6b5a4a]/70 pt-2">
                New here?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-[#B97743] hover:underline underline-offset-4"
                >
                  Create account
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
