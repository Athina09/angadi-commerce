import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ShopPage } from "./pages/ShopPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ShopRequestPlaceholderPage } from "./pages/ShopRequestPlaceholderPage";
import { PartnerStorePage } from "./pages/PartnerStorePage";
import { ShopCheckoutPage, ShopCheckoutSuccessPage } from "./pages/ShopCheckoutPage";
import { VendorDashboardPage } from "./pages/VendorDashboardPage";
import { VendorOnboardingPage } from "./pages/VendorOnboardingPage";
import { VendorPendingVerificationPage } from "./pages/VendorPendingVerificationPage";
import { VendorVerificationPage } from "./pages/VendorVerificationPage";
import { VendorListingsPage } from "./pages/VendorListingsPage";
import { VendorFreshnessPage } from "./pages/VendorFreshnessPage";
import { VendorOrdersPage } from "./pages/VendorOrdersPage";
import { VendorAlertsPage } from "./pages/VendorAlertsPage";
import { VendorInsightsPage } from "./pages/VendorInsightsPage";
import { VendorAiPage } from "./pages/VendorAiPage";
import { VendorFeaturePlaceholder } from "./pages/VendorFeaturePlaceholder";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/product/:id" element={<ProductDetailPage />} />
        <Route path="/shop/partner/:storeId/product/:productId" element={<PartnerStorePage />} />
        <Route path="/shop/checkout" element={<ShopCheckoutPage />} />
        <Route path="/shop/checkout/success" element={<ShopCheckoutSuccessPage />} />
        <Route path="/shop/request" element={<ShopRequestPlaceholderPage />} />
        <Route
          path="/shop/*"
          element={<PlaceholderPage title="Shop (coming soon)" />}
        />

        <Route path="/vendor/login" element={<Navigate to="/login" replace />} />
        <Route path="/vendor/onboarding" element={<VendorOnboardingPage />} />
        <Route path="/vendor/listings" element={<VendorListingsPage />} />
        <Route path="/vendor/freshness" element={<VendorFreshnessPage />} />
        <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
        <Route path="/vendor/orders" element={<VendorOrdersPage />} />
        <Route path="/vendor/alerts" element={<VendorAlertsPage />} />
        <Route path="/vendor/insights" element={<VendorInsightsPage />} />
        <Route
          path="/vendor/competitors"
          element={<Navigate to="/vendor/dashboard" replace />}
        />
        <Route path="/vendor/ai" element={<VendorAiPage />} />
        <Route
          path="/vendor/settings"
          element={
            <VendorFeaturePlaceholder
              title="Settings"
              blurb="Language toggle is in the sidebar. SMS alerts and store preferences will be configurable here."
              cta={{ to: "/vendor/onboarding", label: "Edit store profile" }}
            />
          }
        />
        <Route
          path="/vendor/verification"
          element={<VendorVerificationPage />}
        />
        <Route
          path="/vendor/pending"
          element={<VendorPendingVerificationPage />}
        />
        <Route
          path="/vendor/*"
          element={<Navigate to="/vendor/dashboard" replace />}
        />

        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
