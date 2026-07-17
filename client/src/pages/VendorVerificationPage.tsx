import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Mail,
  Landmark,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  AI_CHECKS,
  STATUS_PIPELINE,
  VERIFICATION_CATEGORIES,
  VERIFICATION_CITIES,
  loadVerificationDraft,
  pipelineIndexForStage,
  saveVerificationDraft,
  setVendorVerificationPending,
  type VerificationDraft,
} from "@/lib/vendorVerification";

const STEP_META = [
  { n: 1, label: "Basic Registration" },
  { n: 2, label: "KYC Verification" },
  { n: 3, label: "AI Live Assessment" },
  { n: 4, label: "Manual Review" },
] as const;

export function VendorVerificationPage() {
  const navigate = useNavigate();
  const { user, token, fetchMe, logout } = useAuthStore();
  const [draft, setDraft] = useState<VerificationDraft>(() =>
    loadVerificationDraft()
  );
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDone, setAiDone] = useState<number>(0);
  const [aiRunning, setAiRunning] = useState(false);

  useEffect(() => {
    saveVerificationDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (!token || user?.role !== "vendor") {
      setChecking(false);
      return;
    }
    let cancelled = false;
    async function check() {
      try {
        const { data } = await api.get<{
          vendor: { id: string; storeName: string } | null;
        }>("/vendor/me");
        if (cancelled) return;
        // Seeded / already-live vendors without pending flag → dashboard
        if (data.vendor && draft.stage !== "submitted" && draft.stage !== "manual" && draft.stage !== "kyc" && draft.stage !== "ai") {
          const pending = localStorage.getItem(
            "marketx_vendor_verification_pending"
          );
          if (pending !== "1" && draft.wizardStep === 0 && !draft.businessName) {
            navigate("/vendor/dashboard", { replace: true });
            return;
          }
        }
      } catch {
        /* continue wizard */
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role, navigate, draft.stage, draft.wizardStep, draft.businessName]);

  // Simulate post-submit pipeline progression for demo polish
  useEffect(() => {
    if (draft.stage !== "submitted" && draft.stage !== "kyc" && draft.stage !== "ai" && draft.stage !== "manual") {
      return;
    }
    const timers: number[] = [];
    if (draft.stage === "submitted") {
      timers.push(
        window.setTimeout(() => {
          setDraft((d) => ({ ...d, stage: "kyc" }));
        }, 4000)
      );
    }
    if (draft.stage === "kyc") {
      timers.push(
        window.setTimeout(() => {
          setDraft((d) => ({ ...d, stage: "ai" }));
        }, 5000)
      );
    }
    if (draft.stage === "ai") {
      timers.push(
        window.setTimeout(() => {
          setDraft((d) => ({ ...d, stage: "manual" }));
        }, 6000)
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [draft.stage]);

  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role !== "vendor") return <Navigate to="/shop" replace />;

  if (checking) {
    return (
      <Shell>
        <p className="text-[12px] tracking-[0.2em] uppercase text-[#9CA3AF]">
          Loading verification…
        </p>
      </Shell>
    );
  }

  const submitted =
    draft.stage === "submitted" ||
    draft.stage === "kyc" ||
    draft.stage === "ai" ||
    draft.stage === "manual" ||
    draft.stage === "approved";

  async function submitForVerification() {
    setError(null);
    setSubmitting(true);
    try {
      const city =
        VERIFICATION_CITIES.find((c) => c.label === draft.city) ??
        VERIFICATION_CITIES[0];
      await api.post("/vendor/onboard", {
        storeName: draft.businessName.trim(),
        category: draft.category,
        lat: city.lat,
        lng: city.lng,
      });
      await fetchMe();
      setVendorVerificationPending(true);
      setDraft((d) => ({
        ...d,
        stage: "submitted",
        submittedAt: new Date().toISOString(),
        wizardStep: 4,
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Couldn’t submit verification. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function runAiAssessment() {
    setAiRunning(true);
    setAiDone(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setAiDone(i);
      if (i >= AI_CHECKS.length) {
        window.clearInterval(id);
        setAiRunning(false);
        setDraft((d) => ({ ...d, wizardStep: 4 }));
      }
    }, 700);
  }

  function goNextFromStep1(e: FormEvent) {
    e.preventDefault();
    if (
      !draft.businessName.trim() ||
      !draft.ownerName.trim() ||
      !draft.email.trim() ||
      !draft.phone.trim() ||
      !draft.address.trim()
    ) {
      setError("Please complete all required registration fields.");
      return;
    }
    setError(null);
    setDraft((d) => ({ ...d, wizardStep: 2, stage: "registration" }));
  }

  function goNextFromStep2(e: FormEvent) {
    e.preventDefault();
    if (!draft.govIdName || !draft.bankAccount.trim() || !draft.ifsc.trim() || !draft.addressProofName) {
      setError("Upload government ID, address proof, and bank details to continue.");
      return;
    }
    setError(null);
    setDraft((d) => ({ ...d, wizardStep: 3, stage: "kyc" }));
  }

  return (
    <Shell>
      <header className="flex items-center justify-between gap-4 mb-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#EEF1FF] text-[#3B5DFF] flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[14px] font-semibold tracking-tight text-[#1A1A1A]">
              Angadi
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">
              Seller verification
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[12px] text-[#6B7280] truncate max-w-[160px]">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A]"
          >
            Log out
          </button>
        </div>
      </header>

      {submitted ? (
        <StatusView draft={draft} />
      ) : (
        <>
          <IntroHero />

          <InfoBanner />

          {/* Stepper */}
          <nav className="mt-8 mb-6 flex flex-wrap gap-2">
            {STEP_META.map((s) => {
              const active = draft.wizardStep === s.n;
              const done = draft.wizardStep > s.n || (draft.wizardStep === 0 && false);
              const reachable = s.n <= Math.max(draft.wizardStep, 1) || draft.wizardStep === 0;
              return (
                <button
                  key={s.n}
                  type="button"
                  disabled={!reachable && draft.wizardStep !== 0}
                  onClick={() => {
                    if (draft.wizardStep === 0 && s.n === 1) {
                      setDraft((d) => ({ ...d, wizardStep: 1 }));
                      return;
                    }
                    if (s.n <= draft.wizardStep) {
                      setDraft((d) => ({ ...d, wizardStep: s.n as 1 | 2 | 3 | 4 }));
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors",
                    active &&
                      "border-[#3B5DFF] bg-[#EEF1FF] text-[#3B5DFF]",
                    done && !active && "border-emerald-300 text-emerald-700 bg-emerald-50/50",
                    !active &&
                      !done &&
                      "border-[#E5E7EB] text-[#6B7280] bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-[10px]",
                      active ? "bg-[#3B5DFF] text-white" : "bg-[#F3F4F6]"
                    )}
                  >
                    {done && !active ? <Check className="h-3 w-3" /> : s.n}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </nav>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {draft.wizardStep === 0 && (
            <OverviewCard
              onStart={() => setDraft((d) => ({ ...d, wizardStep: 1 }))}
            />
          )}

          {draft.wizardStep === 1 && (
            <StepCard title="Step 1 — Basic Registration" subtitle="Tell us about your business">
              <form onSubmit={goNextFromStep1} className="space-y-4">
                <Field
                  label="Business Name"
                  icon={Building2}
                  value={draft.businessName}
                  onChange={(v) => setDraft((d) => ({ ...d, businessName: v }))}
                  required
                  placeholder="e.g. Meera’s Neighborhood Bakery"
                />
                <Field
                  label="Owner Details"
                  icon={User}
                  value={draft.ownerName}
                  onChange={(v) => setDraft((d) => ({ ...d, ownerName: v }))}
                  required
                  placeholder="Full legal name"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    value={draft.email || user?.email || ""}
                    onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
                    required
                  />
                  <Field
                    label="Phone Number"
                    icon={Phone}
                    type="tel"
                    value={draft.phone}
                    onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
                    required
                    placeholder="+91 …"
                  />
                </div>
                <Field
                  label="Store Address"
                  icon={MapPin}
                  value={draft.address}
                  onChange={(v) => setDraft((d) => ({ ...d, address: v }))}
                  required
                  placeholder="Street, area, pincode"
                />
                <div>
                  <Label>Business Category</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {VERIFICATION_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, category: c }))}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[12px] font-medium border transition-colors",
                          draft.category === c
                            ? "border-[#3B5DFF] bg-[#EEF1FF] text-[#3B5DFF]"
                            : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#C7D2FE]"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>City</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                    {VERIFICATION_CITIES.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, city: c.label }))}
                        className={cn(
                          "rounded-xl border py-2.5 text-[13px] font-medium transition-colors",
                          draft.city === c.label
                            ? "border-[#3B5DFF] bg-[#EEF1FF] text-[#3B5DFF]"
                            : "border-[#E5E7EB] bg-white text-[#6B7280]"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <PrimaryButton type="submit">
                  Continue to KYC
                  <ChevronRight className="h-4 w-4" />
                </PrimaryButton>
              </form>
            </StepCard>
          )}

          {draft.wizardStep === 2 && (
            <StepCard
              title="Step 2 — KYC Verification"
              subtitle="Upload documents to verify your identity and business"
            >
              <form onSubmit={goNextFromStep2} className="space-y-4">
                <FileUpload
                  label="Government-issued ID (Aadhaar / PAN / Passport)"
                  required
                  fileName={draft.govIdName}
                  onPick={(name) => setDraft((d) => ({ ...d, govIdName: name }))}
                />
                <FileUpload
                  label="Business Registration Certificate (if applicable)"
                  fileName={draft.bizCertName}
                  onPick={(name) => setDraft((d) => ({ ...d, bizCertName: name }))}
                />
                <FileUpload
                  label="GST Certificate (optional)"
                  fileName={draft.gstName}
                  onPick={(name) => setDraft((d) => ({ ...d, gstName: name }))}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Bank Account Number"
                    icon={Landmark}
                    value={draft.bankAccount}
                    onChange={(v) => setDraft((d) => ({ ...d, bankAccount: v }))}
                    required
                    placeholder="Account number"
                  />
                  <Field
                    label="IFSC Code"
                    icon={Landmark}
                    value={draft.ifsc}
                    onChange={(v) => setDraft((d) => ({ ...d, ifsc: v }))}
                    required
                    placeholder="e.g. HDFC0001234"
                  />
                </div>
                <FileUpload
                  label="Address Proof"
                  required
                  fileName={draft.addressProofName}
                  onPick={(name) =>
                    setDraft((d) => ({ ...d, addressProofName: name }))
                  }
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <SecondaryButton
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, wizardStep: 1 }))}
                  >
                    Back
                  </SecondaryButton>
                  <PrimaryButton type="submit" className="flex-1">
                    Continue to AI Assessment
                    <ChevronRight className="h-4 w-4" />
                  </PrimaryButton>
                </div>
              </form>
            </StepCard>
          )}

          {draft.wizardStep === 3 && (
            <StepCard
              title="Step 3 — AI Live Assessment"
              subtitle="Our AI performs a comprehensive evaluation of your store"
            >
              <ul className="space-y-2.5 mb-6">
                {AI_CHECKS.map((check, i) => {
                  const done = i < aiDone;
                  const current = aiRunning && i === aiDone;
                  return (
                    <li
                      key={check}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px]",
                        done
                          ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                          : current
                            ? "border-[#C7D2FE] bg-[#EEF1FF] text-[#1A1A1A]"
                            : "border-[#E5E7EB] bg-white text-[#6B7280]"
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : current ? (
                        <Loader2 className="h-4 w-4 text-[#3B5DFF] animate-spin shrink-0" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                      )}
                      {check}
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, wizardStep: 2 }))}
                  disabled={aiRunning}
                >
                  Back
                </SecondaryButton>
                {aiDone >= AI_CHECKS.length ? (
                  <PrimaryButton
                    type="button"
                    className="flex-1"
                    onClick={() => setDraft((d) => ({ ...d, wizardStep: 4 }))}
                  >
                    Continue to Review
                    <ChevronRight className="h-4 w-4" />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    type="button"
                    className="flex-1"
                    onClick={runAiAssessment}
                    disabled={aiRunning}
                  >
                    {aiRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Running assessment…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Run AI Live Assessment
                      </>
                    )}
                  </PrimaryButton>
                )}
              </div>
            </StepCard>
          )}

          {draft.wizardStep === 4 && (
            <StepCard
              title="Step 4 — Manual Review"
              subtitle="Our verification team reviews your application alongside the AI assessment"
            >
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 mb-5">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-[#3B5DFF] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1A1A]">
                      Estimated Processing Time: 48 Hours (2 Business Days)
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[13px] text-[#6B7280]">
                      <li>• AI completes automated verification</li>
                      <li>• KYC documents are validated</li>
                      <li>• Your business profile is reviewed</li>
                      <li>• Final approval is issued</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] p-4 mb-6 text-[13px] text-[#6B7280] space-y-1">
                <p>
                  <span className="font-semibold text-[#1A1A1A]">Business:</span>{" "}
                  {draft.businessName}
                </p>
                <p>
                  <span className="font-semibold text-[#1A1A1A]">Owner:</span>{" "}
                  {draft.ownerName}
                </p>
                <p>
                  <span className="font-semibold text-[#1A1A1A]">Category:</span>{" "}
                  {draft.category} · {draft.city}
                </p>
                <p>
                  <span className="font-semibold text-[#1A1A1A]">KYC:</span>{" "}
                  {draft.govIdName ? "ID uploaded" : "Missing"} ·{" "}
                  {draft.addressProofName ? "Address proof uploaded" : "Missing"}
                </p>
                <p>
                  <span className="font-semibold text-[#1A1A1A]">AI assessment:</span>{" "}
                  Complete ({AI_CHECKS.length}/{AI_CHECKS.length} checks)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, wizardStep: 3 }))}
                >
                  Back
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  className="flex-1"
                  onClick={() => void submitForVerification()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Submit for Verification
                    </>
                  )}
                </PrimaryButton>
              </div>
              <p className="mt-3 text-center text-[12px] text-[#9CA3AF]">
                Your application will be reviewed within 48 hours before your
                store is activated.
              </p>
            </StepCard>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-[#F7F8FA] text-[#1A1A1A] font-[family-name:var(--font-inter)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</div>
    </div>
  );
}

function IntroHero() {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3B5DFF]">
        Become a Verified Vendor
      </p>
      <h1 className="mt-2 text-[26px] sm:text-[32px] font-bold tracking-tight text-[#1A1A1A] leading-tight">
        Join Angadi by completing our secure vendor verification
        process.
      </h1>
      <p className="mt-3 text-[14px] text-[#6B7280] leading-relaxed max-w-2xl">
        To ensure a trusted marketplace, every vendor undergoes a comprehensive
        verification before their store goes live.
      </p>
    </div>
  );
}

function InfoBanner() {
  return (
    <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5 flex gap-3">
      <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
      <div>
        <p className="text-[13px] font-semibold text-amber-900">
          Verification Required
        </p>
        <p className="mt-1 text-[12px] text-amber-900/80 leading-relaxed">
          To maintain a safe and trustworthy marketplace, every vendor must
          complete KYC verification and pass our AI-powered business assessment.
          Verification typically takes up to 2 business days. You’ll receive
          email and SMS notifications as your application progresses.
        </p>
      </div>
    </div>
  );
}

function OverviewCard({ onStart }: { onStart: () => void }) {
  return (
    <StepCard
      title="Registration Process"
      subtitle="Four steps to activate your storefront"
    >
      <ol className="space-y-4 mb-6">
        {[
          {
            t: "Basic Registration",
            d: "Business name, owner details, email & phone, store address, category",
          },
          {
            t: "KYC Verification",
            d: "Government ID, business cert, GST (optional), bank details, address proof",
          },
          {
            t: "AI Live Assessment",
            d: "Authenticity, catalog quality, pricing, inventory, fraud & policy checks",
          },
          {
            t: "Manual Review",
            d: "Verification team reviews your application with the AI score",
          },
        ].map((s, i) => (
          <li key={s.t} className="flex gap-3">
            <span className="h-7 w-7 rounded-full bg-[#EEF1FF] text-[#3B5DFF] text-[12px] font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div>
              <p className="text-[14px] font-semibold">{s.t}</p>
              <p className="text-[12px] text-[#6B7280] mt-0.5">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <PrimaryButton type="button" onClick={onStart} className="w-full">
        Start Verification
        <ChevronRight className="h-4 w-4" />
      </PrimaryButton>
    </StepCard>
  );
}

function StatusView({ draft }: { draft: VerificationDraft }) {
  const idx = pipelineIndexForStage(draft.stage);
  return (
    <div>
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#EEF1FF] text-[#3B5DFF] flex items-center justify-center">
          <Clock className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="mt-4 text-[24px] font-bold tracking-tight">
          Application Status
        </h1>
        <p className="mt-2 text-[14px] text-[#6B7280] max-w-md mx-auto">
          Your application for{" "}
          <span className="font-semibold text-[#1A1A1A]">
            {draft.businessName}
          </span>{" "}
          is under review. Estimated processing time:{" "}
          <span className="font-semibold text-[#1A1A1A]">48 hours</span>.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/70 px-3 py-1.5 text-[12px] font-medium text-amber-800">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          You can’t enter the seller dashboard until approval
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] mb-6">
          Progress pipeline
        </p>
        <ol className="space-y-0">
          {STATUS_PIPELINE.map((step, i) => {
            const done = idx > i || (draft.stage === "approved" && i <= 4);
            const current = idx === i;
            const isLive = step.id === "live";
            return (
              <li key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center border text-[12px] font-bold",
                      done &&
                        "bg-emerald-500 border-emerald-500 text-white",
                      current &&
                        !done &&
                        "bg-[#3B5DFF] border-[#3B5DFF] text-white",
                      !done &&
                        !current &&
                        "bg-white border-[#E5E7EB] text-[#9CA3AF]"
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < STATUS_PIPELINE.length - 1 && (
                    <div
                      className={cn(
                        "w-px flex-1 min-h-[28px] my-1",
                        done ? "bg-emerald-400" : "bg-[#E5E7EB]"
                      )}
                    />
                  )}
                </div>
                <div className={cn("pb-6", i === STATUS_PIPELINE.length - 1 && "pb-0")}>
                  <p
                    className={cn(
                      "text-[14px] font-semibold",
                      current || done ? "text-[#1A1A1A]" : "text-[#9CA3AF]"
                    )}
                  >
                    {step.label}
                    {isLive ? " 🚀" : ""}
                  </p>
                  {current && (
                    <p className="text-[12px] text-[#6B7280] mt-0.5">
                      In progress — you’ll get email & SMS updates
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <InfoBanner />

      <p className="mt-6 text-center text-[12px] text-[#9CA3AF]">
        Admins manage this queue in{" "}
        <Link to="/admin" className="text-[#3B5DFF] hover:underline">
          Vendor Command
        </Link>
        .
      </p>
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5 sm:p-7">
      <h2 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h2>
      <p className="mt-1 text-[13px] text-[#6B7280] mb-5">{subtitle}</p>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
      {children}
    </span>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: typeof User;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="relative mt-1.5">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]"
          strokeWidth={1.75}
        />
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] pl-10 pr-3 text-[14px] outline-none focus:border-[#3B5DFF]/40 focus:ring-2 focus:ring-[#3B5DFF]/15 focus:bg-white"
        />
      </div>
    </label>
  );
}

function FileUpload({
  label,
  required,
  fileName,
  onPick,
}: {
  label: string;
  required?: boolean;
  fileName: string;
  onPick: (name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mt-1.5 w-full rounded-xl border border-dashed px-4 py-4 text-left transition-colors",
          fileName
            ? "border-emerald-300 bg-emerald-50/40"
            : "border-[#D1D5DB] bg-[#F7F8FA] hover:border-[#3B5DFF]/40 hover:bg-[#EEF1FF]/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280]">
            {fileName ? (
              <FileText className="h-4 w-4 text-emerald-600" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#1A1A1A] truncate">
              {fileName || "Click to upload PDF or image"}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">Max 10MB · demo upload</p>
          </div>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f.name);
        }}
      />
    </div>
  );
}

function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#3B5DFF] text-white text-[14px] font-semibold px-5",
        "hover:bg-[#2F4DE6] transition-colors disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-[#E5E7EB] bg-white text-[14px] font-semibold text-[#374151] px-5",
        "hover:bg-[#F9FAFB] transition-colors disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}
