import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MentorListingPage from "./pages/MentorListingPage";
import MentorProfilePage from "./pages/MentorProfilePage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminProfilePage from "./pages/AdminProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OrganisationListingPage from "./pages/OrganisationListingPage";
import OrganisationProfilePage from "./pages/OrganisationProfilePage";
import OrganisationSignupPage from "./pages/OrganisationSignupPage";
import InstituteDashboardPage from "./pages/InstituteDashboardPage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";
import NotificationManager from "./components/NotificationManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/mentors" element={<MentorListingPage />} />
            <Route path="/mentors/:id" element={<MentorProfilePage />} />
            <Route path="/organisations" element={<OrganisationListingPage />} />
            <Route path="/organisations/register" element={<OrganisationSignupPage />} />
            <Route path="/organisations/:slug" element={<OrganisationProfilePage />} />
            <Route path="/institute/dashboard" element={<InstituteDashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
