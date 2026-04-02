import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ENABLE_ORGANISATIONS } from "@/lib/featureFlags";
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
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import NotFound from "./pages/NotFound";
import NotificationManager from "./components/NotificationManager";
import EnableNotificationsPrompt from "./components/EnableNotificationsPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationManager />
          <EnableNotificationsPrompt />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/mentors" element={<MentorListingPage />} />
            <Route path="/mentors/:id" element={<MentorProfilePage />} />
            {ENABLE_ORGANISATIONS ? (
              <>
                <Route path="/organisations" element={<OrganisationListingPage />} />
                <Route path="/organisations/register" element={<OrganisationSignupPage />} />
                <Route path="/organisations/:slug" element={<OrganisationProfilePage />} />
                <Route path="/institute/dashboard" element={<InstituteDashboardPage />} />
              </>
            ) : (
              <>
                <Route path="/organisations" element={<Navigate to="/mentors" replace />} />
                <Route path="/organisations/*" element={<Navigate to="/mentors" replace />} />
                <Route path="/institute/*" element={<Navigate to="/mentors" replace />} />
              </>
            )}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/booking-confirmed/:bookingId" element={<BookingConfirmationPage />} />
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
