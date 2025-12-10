import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Promptverso from "./pages/Promptverso";
import BibliotecaPrompts from "./pages/BibliotecaPrompts";
import BibliotecaArtes from "./pages/BibliotecaArtes";
import ContributePrompts from "./pages/ContributePrompts";
import AdminUpload from "./pages/AdminUpload";
import AdminUploadArtes from "./pages/AdminUploadArtes";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCommunityReview from "./pages/AdminCommunityReview";
import AdminArtesReview from "./pages/AdminArtesReview";
import AdminManageImages from "./pages/AdminManageImages";
import AdminManageArtes from "./pages/AdminManageArtes";
import AdminCollections from "./pages/AdminCollections";
import UserLogin from "./pages/UserLogin";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProfileSettings from "./pages/ProfileSettings";
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
import UpscalerArcano from "./pages/UpscalerArcano";
import ForjaSelos3D from "./pages/ForjaSelos3D";
import MudarRoupa from "./pages/MudarRoupa";
import MudarPose from "./pages/MudarPose";
import NotFound from "./pages/NotFound";

// Artes system pages
import UserLoginArtes from "./pages/UserLoginArtes";
import PlanosArtes from "./pages/PlanosArtes";
import PlanosArtesMembro from "./pages/PlanosArtesMembro";
import ChangePasswordArtes from "./pages/ChangePasswordArtes";
import ForgotPasswordArtes from "./pages/ForgotPasswordArtes";
import ResetPasswordArtes from "./pages/ResetPasswordArtes";
import ProfileSettingsArtes from "./pages/ProfileSettingsArtes";
import PartnerLoginArtes from "./pages/PartnerLoginArtes";
import PartnerDashboardArtes from "./pages/PartnerDashboardArtes";
import PartnerUploadArtes from "./pages/PartnerUploadArtes";
import AdminPartnersArtes from "./pages/AdminPartnersArtes";
import AdminCategoriesArtes from "./pages/AdminCategoriesArtes";
import AdminCategoriesPrompts from "./pages/AdminCategoriesPrompts";
import AdminManagePacks from "./pages/AdminManagePacks";
import AdminManageBanners from "./pages/AdminManageBanners";
import AdminPackPurchases from "./pages/AdminPackPurchases";
import AdminImportClients from "./pages/AdminImportClients";
import AdminManageAdmins from "./pages/AdminManageAdmins";
import ForjaSelos3DArtes from "./pages/ForjaSelos3DArtes";
import TutorialArtes from "./pages/TutorialArtes";
import AdminManagePromotions from "./pages/AdminManagePromotions";
import AdminManageBlacklist from "./pages/AdminManageBlacklist";
import AdminWebhookLogs from "./pages/AdminWebhookLogs";
import GlobalImportProgress from "./components/GlobalImportProgress";

import { useInstallTracker } from "./hooks/useInstallTracker";
import { usePageViewTracker } from "./hooks/usePageViewTracker";

const queryClient = new QueryClient();

const AppContent = () => {
  // Track app installations and page views
  useInstallTracker();
  usePageViewTracker();

  return (
    <TooltipProvider>
      <GlobalImportProgress />
      <Toaster />
      <Sonner />
      
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/promptverso" element={<Promptverso />} />
        <Route path="/biblioteca-prompts" element={<BibliotecaPrompts />} />
        <Route path="/biblioteca-artes" element={<BibliotecaArtes />} />
        <Route path="/contribuir" element={<ContributePrompts />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-upload" element={<AdminUpload />} />
        <Route path="/admin-upload-artes" element={<AdminUploadArtes />} />
        <Route path="/admin-community-review" element={<AdminCommunityReview />} />
        <Route path="/admin-artes-review" element={<AdminArtesReview />} />
        <Route path="/admin-manage-images" element={<AdminManageImages />} />
        <Route path="/admin-manage-artes" element={<AdminManageArtes />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile-settings" element={<ProfileSettings />} />
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
        <Route path="/upscaler-arcano" element={<UpscalerArcano />} />
        <Route path="/forja-selos-3d" element={<ForjaSelos3D />} />
        <Route path="/mudar-roupa" element={<MudarRoupa />} />
        <Route path="/mudar-pose" element={<MudarPose />} />
        
        {/* Artes system routes */}
        <Route path="/login-artes" element={<UserLoginArtes />} />
        <Route path="/planos-artes" element={<PlanosArtes />} />
        <Route path="/planos-artes-membro" element={<PlanosArtesMembro />} />
        <Route path="/change-password-artes" element={<ChangePasswordArtes />} />
        <Route path="/forgot-password-artes" element={<ForgotPasswordArtes />} />
        <Route path="/reset-password-artes" element={<ResetPasswordArtes />} />
        <Route path="/perfil-artes" element={<ProfileSettingsArtes />} />
        <Route path="/parceiro-login-artes" element={<PartnerLoginArtes />} />
        <Route path="/parceiro-dashboard-artes" element={<PartnerDashboardArtes />} />
        <Route path="/parceiro-upload-artes" element={<PartnerUploadArtes />} />
        <Route path="/admin-parceiros-artes" element={<AdminPartnersArtes />} />
        <Route path="/admin-categories-artes" element={<AdminCategoriesArtes />} />
        <Route path="/admin-categories-prompts" element={<AdminCategoriesPrompts />} />
        <Route path="/admin-manage-packs" element={<AdminManagePacks />} />
        <Route path="/admin-manage-banners" element={<AdminManageBanners />} />
        <Route path="/admin-pack-purchases" element={<AdminPackPurchases />} />
        <Route path="/admin-import-clients" element={<AdminImportClients />} />
        <Route path="/admin-manage-admins" element={<AdminManageAdmins />} />
        <Route path="/forja-selos-3d-artes" element={<ForjaSelos3DArtes />} />
        <Route path="/tutorial-artes/:slug" element={<TutorialArtes />} />
        <Route path="/admin-manage-promotions" element={<AdminManagePromotions />} />
        <Route path="/admin-blacklist" element={<AdminManageBlacklist />} />
        <Route path="/admin-webhook-logs" element={<AdminWebhookLogs />} />
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
