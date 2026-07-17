import { Navigate } from "react-router-dom";
export {
  isVendorVerificationPending,
  setVendorVerificationPending,
} from "@/lib/vendorVerification";

/** Legacy path — status is shown inside the verification wizard after submit */
export function VendorPendingVerificationPage() {
  return <Navigate to="/vendor/verification" replace />;
}
