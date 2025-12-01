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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
