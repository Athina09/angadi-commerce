import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Leaf,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { VendorAiAssistant } from "@/components/vendor/VendorAiAssistant";
import { VendorVoiceTamil } from "@/components/vendor/VendorVoiceTamil";

type Props = {
  title?: string;
  children: React.ReactNode;
  verified?: boolean | null;
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
  group?: string;
};

const NAV: NavItem[] = [
  { to: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/vendor/listings", label: "Live inventory", icon: Package, group: "Overview" },
  { to: "/vendor/freshness", label: "Freshness score", icon: Leaf, group: "Overview" },
  { to: "/vendor/orders", label: "Orders pipeline", icon: ShoppingBag, group: "Overview" },
  { to: "/vendor/alerts", label: "Low-stock alerts", icon: AlertTriangle, group: "Operations" },
  { to: "/vendor/insights", label: "Insights & forecast", icon: BarChart3, group: "Operations" },
  { to: "/vendor/competitors", label: "Competitor map", icon: Map, group: "Operations" },
  { to: "/vendor/ai", label: "Ask Advisor", icon: Sparkles, group: "Operations" },
  { to: "/vendor/verification", label: "Verification", icon: ShieldCheck, group: "Account" },
  { to: "/vendor/onboarding", label: "Store profile", icon: Store, group: "Account" },
  { to: "/vendor/settings", label: "Settings", icon: Settings, group: "Account" },
];

const GROUPS = ["Overview", "Operations", "Account"] as const;

export function VendorHubShell({ title, children, verified: verifiedProp }: Props) {
  const { user, logout } = useAuthStore();
  const [verified, setVerified] = useState<boolean | null>(verifiedProp ?? null);
  const [lang, setLang] = useState<"en" | "ta">(
    (user?.preferredLang as "en" | "ta") || "en"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (verifiedProp != null) {
      setVerified(verifiedProp);
      return;
    }
    if (user?.role !== "vendor") return;
    let cancelled = false;
    api
      .get<{ vendor: { verified: boolean } | null }>("/vendor/me")
      .then(({ data }) => {
        if (!cancelled) setVerified(data.vendor?.verified ?? null);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, verifiedProp]);

  async function toggleLang() {
    const next = lang === "en" ? "ta" : "en";
    setLang(next);
    try {
      await api.patch("/auth/me/lang", { preferredLang: next });
    } catch {
      /* local toggle still works */
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link to="/" className="font-display text-lg font-bold text-vh-blue tracking-tight">
          Angadi
        </Link>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-vh-muted font-semibold">
          Vendor Hub
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-vh-muted/80">
              {group}
            </p>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map(
                ({ to, label, icon: Icon, soon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                          isActive
                            ? "bg-vh-blue text-white shadow-sm"
                            : "text-vh-text/70 hover:bg-vh-blue-soft hover:text-vh-text",
                          soon && !isActive && "opacity-70"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{label}</span>
                      {soon && (
                        <span className="text-[9px] uppercase tracking-wide opacity-80">
                          Soon
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-vh-border p-4 space-y-3">
        <button
          type="button"
          onClick={() => void toggleLang()}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-vh-blue-soft px-3 py-2.5 text-[13px] font-semibold text-vh-text hover:bg-vh-blue-soft/80"
        >
          <span className="inline-flex items-center gap-2">
            <Globe className="h-4 w-4 text-vh-muted" />
            Language
          </span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-vh-blue">
            {lang === "en" ? "EN" : "TA"}
          </span>
        </button>

        <Link
          to="/shop"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-vh-muted hover:text-vh-text hover:bg-vh-blue-soft"
        >
          <ClipboardList className="h-4 w-4" />
          Preview shop
        </Link>

        <div className="px-1">
          {verified === false && (
            <span className="inline-flex rounded-full bg-[rgba(217,140,31,0.12)] text-vh-warn px-2.5 py-1 text-[10px] font-semibold">
              Pending verification
            </span>
          )}
          {verified === true && (
            <span className="inline-flex rounded-full bg-[rgba(31,169,122,0.12)] text-vh-good px-2.5 py-1 text-[10px] font-semibold">
              Verified seller
            </span>
          )}
          <p className="mt-2 text-[11px] text-vh-muted truncate">{user?.email}</p>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-vh-muted hover:text-vh-text hover:bg-vh-blue-soft"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bone text-ink font-[family-name:var(--font-inter)] flex vendor-hub">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 sticky top-0 h-svh border-r border-vh-border bg-white flex-col z-40">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] h-full bg-white shadow-xl z-10">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 text-muted"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-vh-page/90 backdrop-blur-md border-b border-vh-border lg:border-0">
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="lg:hidden font-display font-bold text-vh-blue truncate">
                Vendor Hub
              </p>
              {title && (
                <h1 className="hidden lg:block font-display text-[22px] font-bold tracking-tight truncate text-vh-text">
                  {title}
                </h1>
              )}
            </div>
            <Link
              to="/"
              className="hidden sm:inline font-display text-sm font-bold text-vh-blue"
            >
              Angadi
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16">
          {title && (
            <h1 className="lg:hidden font-display text-[26px] font-bold tracking-tight mb-5">
              {title}
            </h1>
          )}
          {children}
        </main>
      </div>

      {user?.role === "vendor" && <VendorAiAssistant />}
    </div>
  );
}
