export type VerificationStage =
  | "draft"
  | "registration"
  | "kyc"
  | "ai"
  | "submitted"
  | "manual"
  | "approved";

export type VerificationDraft = {
  // Step 1
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  // Step 2 — file names only (demo; no real upload)
  govIdName: string;
  bizCertName: string;
  gstName: string;
  bankAccount: string;
  ifsc: string;
  addressProofName: string;
  // Meta
  stage: VerificationStage;
  submittedAt: string | null;
  wizardStep: 0 | 1 | 2 | 3 | 4;
};

const STORAGE_KEY = "marketx_vendor_verification";
const PENDING_KEY = "marketx_vendor_verification_pending";

export const VERIFICATION_CATEGORIES = [
  "Produce",
  "Groceries",
  "Bakery",
  "Spices",
  "Beverages",
  "Pantry",
  "Stationery",
  "Household",
  "Personal Care",
] as const;

export const VERIFICATION_CITIES = [
  { label: "Chennai", lat: 13.0827, lng: 80.2707 },
  { label: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { label: "Mumbai", lat: 19.076, lng: 72.8777 },
  { label: "Delhi", lat: 28.6139, lng: 77.209 },
  { label: "Hyderabad", lat: 17.385, lng: 78.4867 },
] as const;

export const AI_CHECKS = [
  "Store authenticity verification",
  "Product catalog quality assessment",
  "Pricing competitiveness analysis",
  "Inventory readiness evaluation",
  "Business profile validation",
  "Image quality and authenticity checks",
  "Fraud and duplicate account detection",
  "Compliance with marketplace policies",
] as const;

export const STATUS_PIPELINE = [
  { id: "submitted", label: "Registration Submitted" },
  { id: "kyc", label: "KYC Verification" },
  { id: "ai", label: "AI Business Assessment" },
  { id: "manual", label: "Manual Review" },
  { id: "approved", label: "Approval" },
  { id: "live", label: "Store Goes Live" },
] as const;

const emptyDraft = (): VerificationDraft => ({
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  address: "",
  city: "Chennai",
  category: "Produce",
  govIdName: "",
  bizCertName: "",
  gstName: "",
  bankAccount: "",
  ifsc: "",
  addressProofName: "",
  stage: "draft",
  submittedAt: null,
  wizardStep: 0,
});

export function loadVerificationDraft(): VerificationDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDraft();
    return { ...emptyDraft(), ...JSON.parse(raw) } as VerificationDraft;
  } catch {
    return emptyDraft();
  }
}

export function saveVerificationDraft(draft: VerificationDraft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function isVendorVerificationPending(): boolean {
  return localStorage.getItem(PENDING_KEY) === "1";
}

export function setVendorVerificationPending(pending: boolean) {
  if (pending) localStorage.setItem(PENDING_KEY, "1");
  else localStorage.removeItem(PENDING_KEY);
}

export function clearVendorVerification() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PENDING_KEY);
}

/** Pipeline index for submitted applications (0–5). */
export function pipelineIndexForStage(stage: VerificationStage): number {
  switch (stage) {
    case "submitted":
      return 0;
    case "kyc":
      return 1;
    case "ai":
      return 2;
    case "manual":
      return 3;
    case "approved":
      return 4;
    default:
      return -1;
  }
}
