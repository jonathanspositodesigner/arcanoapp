import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BibliotecaPrompts from "./pages/BibliotecaPrompts";
import ContributePrompts from "./pages/ContributePrompts";
import AdminUpload from "./pages/AdminUpload";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCommunityReview from "./pages/AdminCommunityReview";
import AdminManageImages from "./pages/AdminManageImages";
import AdminCollections from "./pages/AdminCollections";
import UserLogin from "./pages/UserLogin";
import InstallApp from "./pages/InstallApp";
import Planos from "./pages/Planos";
import UpgradePlano from "./pages/UpgradePlano";
import AdminPushNotifications from "./pages/AdminPushNotifications";
import AdminInstallStats from "./pages/AdminInstallStats";
import AdminManagePremium from "./pages/AdminManagePremium";
import AdminPremiumDashboard from "./pages/AdminPremiumDashboard";
import AdminPartners from "./pages/AdminPartners";
import PartnerLogin from "./pages/PartnerLogin";
import PartnerDashboard from "./pages/PartnerDashboard";
import PartnerUpload from "./pages/PartnerUpload";
import ForjaSelos3D from "./pages/ForjaSelos3D";
import NotFound from "./pages/NotFound";

import { useInstallTracker } from "./hooks/useInstallTracker";
import { usePageViewTracker } from "./hooks/usePageViewTracker";

const queryClient = new QueryClient();

const AppContent = () => {
  // Track app installations and page views
  useInstallTracker();
  usePageViewTracker();

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/biblioteca-prompts" element={<BibliotecaPrompts />} />
        <Route path="/contribuir" element={<ContributePrompts />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-upload" element={<AdminUpload />} />
        <Route path="/admin-community-review" element={<AdminCommunityReview />} />
        <Route path="/admin-manage-images" element={<AdminManageImages />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/install" element={<InstallApp />} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/upgrade" element={<UpgradePlano />} />
        <Route path="/admin-push-notifications" element={<AdminPushNotifications />} />
        <Route path="/admin-install-stats" element={<AdminInstallStats />} />
        <Route path="/admin-manage-premium" element={<AdminManagePremium />} />
        <Route path="/admin-premium-dashboard" element={<AdminPremiumDashboard />} />
        <Route path="/admin-collections" element={<AdminCollections />} />
        <Route path="/admin-partners" element={<AdminPartners />} />
        <Route path="/parceiro-login" element={<PartnerLogin />} />
        <Route path="/parceiro-dashboard" element={<PartnerDashboard />} />
        <Route path="/parceiro-upload" element={<PartnerUpload />} />
        <Route path="/forja-selos-3d" element={<ForjaSelos3D />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
