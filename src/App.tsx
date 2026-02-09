import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import { LocaleProvider } from "./contexts/LocaleContext";

import { AuthProvider } from "./contexts/AuthContext";
import { AIDebugProvider } from "./contexts/AIDebugContext";
import { AIJobProvider } from "./contexts/AIJobContext";
import "./lib/i18n"; // Initialize i18n
// Critical pages - keep static for fast initial load
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages - loaded on demand
const Promptverso = lazy(() => import("./pages/Promptverso"));
const BibliotecaPrompts = lazy(() => import("./pages/BibliotecaPrompts"));
const BibliotecaArtes = lazy(() => import("./pages/BibliotecaArtes"));
const BibliotecaArtesHub = lazy(() => import("./pages/BibliotecaArtesHub"));
const BibliotecaArtesMusicos = lazy(() => import("./pages/BibliotecaArtesMusicos"));
const ContributePrompts = lazy(() => import("./pages/ContributePrompts"));
const AdminUpload = lazy(() => import("./pages/AdminUpload"));
const AdminUploadArtes = lazy(() => import("./pages/AdminUploadArtes"));
const AdminUploadArtesMusicos = lazy(() => import("./pages/AdminUploadArtesMusicos"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminHub = lazy(() => import("./pages/AdminHub"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminFerramentas = lazy(() => import("./pages/AdminFerramentas"));
const AdminMarketing = lazy(() => import("./pages/AdminMarketing"));

// Platform-specific admin pages
const ArtesEventosDashboard = lazy(() => import("./pages/admin/ArtesEventosDashboard"));
const ArtesEventosFerramentas = lazy(() => import("./pages/admin/ArtesEventosFerramentas"));
const ArtesEventosMarketing = lazy(() => import("./pages/admin/ArtesEventosMarketing"));
const ArtesMusicosDashboard = lazy(() => import("./pages/admin/ArtesMusicosDashboard"));
const ArtesMusicosFerramentas = lazy(() => import("./pages/admin/ArtesMusicosFerramentas"));
const ArtesMusicosMarketing = lazy(() => import("./pages/admin/ArtesMusicosMarketing"));
const PromptsDashboard = lazy(() => import("./pages/admin/PromptsDashboard"));
const PromptsFerramentas = lazy(() => import("./pages/admin/PromptsFerramentas"));
const PromptsMarketing = lazy(() => import("./pages/admin/PromptsMarketing"));
const PromptsCustosIA = lazy(() => import("./pages/admin/PromptsCustosIA"));
const PromptsDebugIA = lazy(() => import("./pages/admin/PromptsDebugIA"));
const PromptsRentabilidade = lazy(() => import("./pages/admin/PromptsRentabilidade"));
const AdminCommunityReview = lazy(() => import("./pages/AdminCommunityReview"));
const AdminArtesReview = lazy(() => import("./pages/AdminArtesReview"));
const AdminManageImages = lazy(() => import("./pages/AdminManageImages"));
const AdminManageArtes = lazy(() => import("./pages/AdminManageArtes"));
const AdminManageArtesMusicos = lazy(() => import("./pages/AdminManageArtesMusicos"));
const AdminCollections = lazy(() => import("./pages/AdminCollections"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const CreditHistory = lazy(() => import("./pages/CreditHistory"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const Planos = lazy(() => import("./pages/Planos"));
const Planos2 = lazy(() => import("./pages/Planos2"));
const UpgradePlano = lazy(() => import("./pages/UpgradePlano"));
const AdminInstallStats = lazy(() => import("./pages/AdminInstallStats"));
const AdminManagePremium = lazy(() => import("./pages/AdminManagePremium"));
const AdminPremiumDashboard = lazy(() => import("./pages/AdminPremiumDashboard"));
const AdminPartners = lazy(() => import("./pages/AdminPartners"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const PartnerUpload = lazy(() => import("./pages/PartnerUpload"));
const UpscalerArcanoVersionSelect = lazy(() => import("./pages/UpscalerArcanoVersionSelect"));
const ToolVersionLessons = lazy(() => import("./pages/ToolVersionLessons"));
const ForjaSelos3D = lazy(() => import("./pages/ForjaSelos3D"));
const MudarRoupa = lazy(() => import("./pages/MudarRoupa"));
const MudarPose = lazy(() => import("./pages/MudarPose"));

// Artes system pages
const UserLoginArtes = lazy(() => import("./pages/UserLoginArtes"));
const UserLoginArtesMusicos = lazy(() => import("./pages/UserLoginArtesMusicos"));
const PlanosArtes = lazy(() => import("./pages/PlanosArtes"));
const PlanosArtesMembro = lazy(() => import("./pages/PlanosArtesMembro"));
const PromosNatal = lazy(() => import("./pages/PromosNatal"));
const PlanosArtesMusicos = lazy(() => import("./pages/PlanosArtesMusicos"));
const ChangePasswordArtes = lazy(() => import("./pages/ChangePasswordArtes"));
const ForgotPasswordArtes = lazy(() => import("./pages/ForgotPasswordArtes"));
const ResetPasswordArtes = lazy(() => import("./pages/ResetPasswordArtes"));
const ChangePasswordArtesMusicos = lazy(() => import("./pages/ChangePasswordArtesMusicos"));
const ForgotPasswordArtesMusicos = lazy(() => import("./pages/ForgotPasswordArtesMusicos"));
const ResetPasswordArtesMusicos = lazy(() => import("./pages/ResetPasswordArtesMusicos"));
const ProfileSettingsArtes = lazy(() => import("./pages/ProfileSettingsArtes"));
const PartnerLoginArtes = lazy(() => import("./pages/PartnerLoginArtes"));
const PartnerDashboardArtes = lazy(() => import("./pages/PartnerDashboardArtes"));
const PartnerUploadArtes = lazy(() => import("./pages/PartnerUploadArtes"));
const PartnerLoginUnified = lazy(() => import("./pages/PartnerLoginUnified"));
const PartnerPlatformSelect = lazy(() => import("./pages/PartnerPlatformSelect"));
const PartnerDashboardMusicos = lazy(() => import("./pages/PartnerDashboardMusicos"));
const PartnerUploadMusicos = lazy(() => import("./pages/PartnerUploadMusicos"));
const AdminPartnersArtes = lazy(() => import("./pages/AdminPartnersArtes"));
const AdminCategoriesArtes = lazy(() => import("./pages/AdminCategoriesArtes"));
const AdminCategoriesMusicos = lazy(() => import("./pages/AdminCategoriesMusicos"));
const AdminCategoriesPrompts = lazy(() => import("./pages/AdminCategoriesPrompts"));
const AdminManagePacks = lazy(() => import("./pages/AdminManagePacks"));
const AdminManageBanners = lazy(() => import("./pages/AdminManageBanners"));
const AdminPackPurchases = lazy(() => import("./pages/AdminPackPurchases"));
const AdminManageAdmins = lazy(() => import("./pages/AdminManageAdmins"));
const ForjaSelos3DArtes = lazy(() => import("./pages/ForjaSelos3DArtes"));
const TutorialArtes = lazy(() => import("./pages/TutorialArtes"));
const FerramentaIAArtes = lazy(() => import("./pages/FerramentaIAArtes"));
// Removed: FerramentasIA and FerramentasIAES - redirected to FerramentasIAAplicativo
const AdminManagePromotions = lazy(() => import("./pages/AdminManagePromotions"));
const AdminManageBlacklist = lazy(() => import("./pages/AdminManageBlacklist"));
const AdminWebhookLogs = lazy(() => import("./pages/AdminWebhookLogs"));
const AdminPushNotifications = lazy(() => import("./pages/AdminPushNotifications"));
const AdminAbandonedCheckouts = lazy(() => import("./pages/AdminAbandonedCheckouts"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminPremiumMusicos = lazy(() => import("./pages/AdminPremiumMusicos"));
const SucessoArtesMusicos = lazy(() => import("./pages/SucessoArtesMusicos"));
const PlanosUpscalerArcano = lazy(() => import("./pages/PlanosUpscalerArcano"));
const PlanosUpscalerArcano69 = lazy(() => import("./pages/PlanosUpscalerArcano69v2"));
const PlanosUpscalerArcano69ES = lazy(() => import("./pages/PlanosUpscalerArcano69ES"));
const PlanosUpscalerArcano590ES = lazy(() => import("./pages/PlanosUpscalerArcano590ES"));
const PlanosForjaSelos3D = lazy(() => import("./pages/PlanosForjaSelos3D"));
const UpscalerArcanoTool = lazy(() => import("./pages/UpscalerArcanoTool"));
const PoseChangerTool = lazy(() => import("./pages/PoseChangerTool"));
const VesteAITool = lazy(() => import("./pages/VesteAITool"));
const VideoUpscalerTool = lazy(() => import("./pages/VideoUpscalerTool"));
const ArcanoClonerTool = lazy(() => import("./pages/ArcanoClonerTool"));
const GeradorPersonagemTool = lazy(() => import("./pages/GeradorPersonagemTool"));
const UpscalerSelectionPage = lazy(() => import("./pages/UpscalerSelectionPage"));
const AguardandoPagamentoMusicos = lazy(() => import("./pages/AguardandoPagamentoMusicos"));
const PackAgendas = lazy(() => import("./pages/PackAgendas"));
const ComboArtesArcanas = lazy(() => import("./pages/ComboArtesArcanas"));
const PlanosCreditos = lazy(() => import("./pages/PlanosCreditos"));
const FerramentasIAAplicativo = lazy(() => import("./pages/FerramentasIAAplicativo"));
const ForceUpdate = lazy(() => import("./pages/ForceUpdate"));
const ResgatarCreditos = lazy(() => import("./pages/ResgatarCreditos"));
import { useInstallTracker } from "./hooks/useInstallTracker";
import { useUtmTracker } from "./hooks/useUtmTracker";


// Loading fallback component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
  </div>
);

const queryClient = new QueryClient();

const AppContent = () => {
  // Log version to confirm deployment
  console.log("[APP] ===== VERSION 5.3.0 LOADED =====", new Date().toISOString());
  
  // Track app installations
  useInstallTracker();
  
  // Capture UTM parameters on app load
  useUtmTracker();
  

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
       
      
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/promptverso" element={<Promptverso />} />
          <Route path="/biblioteca-prompts" element={<BibliotecaPrompts />} />
          <Route path="/biblioteca-artes" element={<BibliotecaArtes />} />
          <Route path="/biblioteca-artes-hub" element={<BibliotecaArtesHub />} />
          <Route path="/biblioteca-artes-musicos" element={<BibliotecaArtesMusicos />} />
          <Route path="/contribuir" element={<ContributePrompts />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-hub" element={<AdminHub />} />
          <Route path="/admin-dashboard" element={<Navigate to="/admin-hub" replace />} />
          <Route path="/admin-ferramentas" element={<Navigate to="/admin-hub" replace />} />
          <Route path="/admin-marketing" element={<Navigate to="/admin-hub" replace />} />
          {/* Platform-specific admin routes */}
          <Route path="/admin-artes-eventos" element={<ArtesEventosFerramentas />} />
          <Route path="/admin-artes-eventos/ferramentas" element={<Navigate to="/admin-artes-eventos" replace />} />
          <Route path="/admin-artes-eventos/dashboard" element={<ArtesEventosDashboard />} />
          <Route path="/admin-artes-eventos/marketing" element={<ArtesEventosMarketing />} />

          <Route path="/admin-artes-musicos" element={<ArtesMusicosFerramentas />} />
          <Route path="/admin-artes-musicos/ferramentas" element={<Navigate to="/admin-artes-musicos" replace />} />
          <Route path="/admin-artes-musicos/dashboard" element={<ArtesMusicosDashboard />} />
          <Route path="/admin-artes-musicos/marketing" element={<ArtesMusicosMarketing />} />

          <Route path="/admin-prompts" element={<PromptsFerramentas />} />
          <Route path="/admin-prompts/ferramentas" element={<Navigate to="/admin-prompts" replace />} />
          <Route path="/admin-prompts/dashboard" element={<PromptsDashboard />} />
          <Route path="/admin-prompts/marketing" element={<PromptsMarketing />} />
          <Route path="/admin-prompts/custos-ia" element={<PromptsCustosIA />} />
          <Route path="/admin-prompts/debug-ia" element={<PromptsDebugIA />} />
          <Route path="/admin-prompts/rentabilidade" element={<PromptsRentabilidade />} />
          <Route path="/admin-upload" element={<AdminUpload />} />
          <Route path="/admin-upload-artes" element={<AdminUploadArtes />} />
          <Route path="/admin-upload-artes-musicos" element={<AdminUploadArtesMusicos />} />
          <Route path="/admin-community-review" element={<AdminCommunityReview />} />
          <Route path="/admin-artes-review" element={<AdminArtesReview />} />
          <Route path="/admin-manage-images" element={<AdminManageImages />} />
          <Route path="/admin-manage-artes" element={<AdminManageArtes />} />
          <Route path="/admin-manage-artes-musicos" element={<AdminManageArtesMusicos />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/credit-history" element={<CreditHistory />} />
          <Route path="/install-app" element={<InstallApp />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/planos-2" element={<Planos2 />} />
          <Route path="/upgrade" element={<UpgradePlano />} />
          <Route path="/admin-install-stats" element={<AdminInstallStats />} />
          <Route path="/admin-manage-premium" element={<AdminManagePremium />} />
          <Route path="/admin-premium-dashboard" element={<AdminPremiumDashboard />} />
          <Route path="/admin-collections" element={<AdminCollections />} />
          <Route path="/admin-partners" element={<AdminPartners />} />

          {/* Colaborador (login unificado) */}
          <Route path="/parceiro-login" element={<Navigate to="/parceiro-login-unificado" replace />} />
          <Route path="/parceiro-selecionar-plataforma" element={<Navigate to="/parceiro-plataformas" replace />} />

          <Route path="/parceiro-dashboard" element={<PartnerDashboard />} />
          <Route path="/parceiro-upload" element={<PartnerUpload />} />
          <Route path="/upscaler-arcano" element={<UpscalerArcanoVersionSelect />} />
          <Route path="/ferramenta-ia-artes/upscaller-arcano" element={<UpscalerArcanoVersionSelect />} />
          <Route path="/ferramenta-ia-artes/upscaller-arcano-v1" element={<Navigate to="/ferramenta-ia-artes/upscaller-arcano/v1" replace />} />
          <Route path="/ferramenta-ia-artes/upscaller-arcano-v2" element={<Navigate to="/ferramenta-ia-artes/upscaller-arcano/v2" replace />} />
          {/* Dynamic route for tool versions */}
          <Route path="/ferramenta-ia-artes/:toolSlug/:versionSlug" element={<ToolVersionLessons />} />
          <Route path="/forja-selos-3d" element={<ForjaSelos3D />} />
          <Route path="/mudar-roupa" element={<MudarRoupa />} />
          <Route path="/mudar-pose" element={<MudarPose />} />
          
          {/* Artes system routes */}
          <Route path="/login-artes" element={<UserLoginArtes />} />
          <Route path="/login-artes-musicos" element={<UserLoginArtesMusicos />} />
          <Route path="/planos-artes" element={<PlanosArtes />} />
          <Route path="/planos-artes-membro" element={<PlanosArtesMembro />} />
          <Route path="/promos-natal" element={<PromosNatal />} />
          <Route path="/planos-artes-musicos" element={<PlanosArtesMusicos />} />
          <Route path="/change-password-artes" element={<ChangePasswordArtes />} />
          <Route path="/forgot-password-artes" element={<ForgotPasswordArtes />} />
          <Route path="/reset-password-artes" element={<ResetPasswordArtes />} />
          <Route path="/change-password-artes-musicos" element={<ChangePasswordArtesMusicos />} />
          <Route path="/forgot-password-artes-musicos" element={<ForgotPasswordArtesMusicos />} />
          <Route path="/reset-password-artes-musicos" element={<ResetPasswordArtesMusicos />} />
          <Route path="/perfil-artes" element={<ProfileSettingsArtes />} />
          <Route path="/parceiro-login-artes" element={<PartnerLoginArtes />} />
          <Route path="/parceiro-dashboard-artes" element={<PartnerDashboardArtes />} />
          <Route path="/parceiro-upload-artes" element={<PartnerUploadArtes />} />
          <Route path="/parceiro-login-unificado" element={<PartnerLoginUnified />} />
          <Route path="/parceiro-plataformas" element={<PartnerPlatformSelect />} />
          <Route path="/parceiro-dashboard-musicos" element={<PartnerDashboardMusicos />} />
          <Route path="/parceiro-upload-musicos" element={<PartnerUploadMusicos />} />
          <Route path="/admin-parceiros-artes" element={<AdminPartnersArtes />} />
          <Route path="/admin-categories-artes" element={<AdminCategoriesArtes />} />
          <Route path="/admin-categories-musicos" element={<AdminCategoriesMusicos />} />
          <Route path="/admin-categories-prompts" element={<AdminCategoriesPrompts />} />
          <Route path="/admin-manage-packs" element={<AdminManagePacks />} />
          <Route path="/admin-manage-banners" element={<AdminManageBanners />} />
          <Route path="/admin-pack-purchases" element={<AdminPackPurchases />} />
          <Route path="/admin-manage-admins" element={<AdminManageAdmins />} />
          <Route path="/forja-selos-3d-artes" element={<ForjaSelos3DArtes />} />
          <Route path="/tutorial-artes/:slug" element={<TutorialArtes />} />
          <Route path="/ferramenta-ia-artes/:slug" element={<FerramentaIAArtes />} />
          {/* Redirects automáticos das páginas antigas para a nova */}
          <Route path="/ferramentas-ia" element={<Navigate to="/ferramentas-ia-aplicativo" replace />} />
          <Route path="/ferramentas-ia-es" element={<Navigate to="/ferramentas-ia-aplicativo" replace />} />
          <Route path="/admin-manage-promotions" element={<AdminManagePromotions />} />
          <Route path="/admin-blacklist" element={<AdminManageBlacklist />} />
          <Route path="/admin-webhook-logs" element={<AdminWebhookLogs />} />
          <Route path="/admin-push-notifications" element={<AdminPushNotifications />} />
          <Route path="/admin-abandoned-checkouts" element={<AdminAbandonedCheckouts />} />
          <Route path="/admin-leads" element={<AdminLeads />} />
          <Route path="/admin-premium-musicos" element={<AdminPremiumMusicos />} />
          <Route path="/sucesso-artes-musicos" element={<SucessoArtesMusicos />} />
          <Route path="/aguardando-pagamento-musicos" element={<AguardandoPagamentoMusicos />} />
          <Route path="/planos-upscaler-arcano" element={<PlanosUpscalerArcano />} />
          <Route path="/planos-upscaler-arcano-69" element={<PlanosUpscalerArcano69 />} />
          <Route path="/planos-upscaler-arcano-69-es" element={<PlanosUpscalerArcano69ES />} />
          <Route path="/planos-upscaler-arcano-590-es" element={<PlanosUpscalerArcano590ES />} />
          <Route path="/planos-forja-selos-3d" element={<PlanosForjaSelos3D />} />
          <Route path="/upscaler-arcano-tool" element={<UpscalerArcanoTool />} />
          <Route path="/pose-changer-tool" element={<PoseChangerTool />} />
          <Route path="/veste-ai-tool" element={<VesteAITool />} />
          <Route path="/video-upscaler-tool" element={<VideoUpscalerTool />} />
          <Route path="/arcano-cloner-tool" element={<ArcanoClonerTool />} />
          <Route path="/gerador-personagem" element={<GeradorPersonagemTool />} />
          <Route path="/upscaler-selection" element={<UpscalerSelectionPage />} />
          <Route path="/pack-agendas" element={<PackAgendas />} />
          <Route path="/combo-artes-arcanas" element={<ComboArtesArcanas />} />
          <Route path="/planos-creditos" element={<PlanosCreditos />} />
          <Route path="/ferramentas-ia-aplicativo" element={<FerramentasIAAplicativo />} />
           <Route path="/force-update" element={<ForceUpdate />} />
           <Route path="/resgatar-creditos" element={<ResgatarCreditos />} />
          
           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
           <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <AIDebugProvider>
            <AIJobProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </AIJobProvider>
          </AIDebugProvider>
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
};

export default App;
