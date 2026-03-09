import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Restaurant = lazy(() => import("./pages/Restaurant"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuManagement = lazy(() => import("./pages/MenuManagement"));
const FooterManagement = lazy(() => import("./pages/FooterManagement"));
const BranchesManagement = lazy(() => import("./pages/BranchesManagement"));
const Orders = lazy(() => import("./pages/Orders"));
const BranchOrders = lazy(() => import("./pages/BranchOrders"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Subscription = lazy(() => import("./pages/Subscription"));
const NotFound = lazy(() => import("./pages/NotFound"));

// إعداد React Query Client لإدارة الكاش وجلب البيانات
const queryClient = new QueryClient();

// المكون الرئيسي - تعريف Providers والراوتر
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/:username" element={<Restaurant />} />
              <Route path="/:username/dashboard" element={<Dashboard />} />
              <Route path="/:username/menu-management" element={<MenuManagement />} />
              <Route path="/:username/footer-management" element={<FooterManagement />} />
              <Route path="/:username/branches-management" element={<BranchesManagement />} />
              <Route path="/:username/orders" element={<Orders />} />
              <Route path="/:username/branch-orders" element={<BranchOrders />} />
              <Route path="/:username/wallet" element={<Wallet />} />
              <Route path="/:username/analytics" element={<Analytics />} />
              <Route path="/:username/subscription" element={<Subscription />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
