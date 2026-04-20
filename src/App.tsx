import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ConsentGate } from "./components/ConsentGate";
import AICommandBar from "./components/AICommandBar";
import VerificationGate from "./components/VerificationGate";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-loaded pages for performance
const Welcome = lazy(() => import("./pages/Welcome"));
const Index = lazy(() => import("./pages/Index"));
const Track = lazy(() => import("./pages/Track"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Admin = lazy(() => import("./pages/Admin"));
const FactorySignup = lazy(() => import("./pages/FactorySignup"));
const FactoryDashboard = lazy(() => import("./pages/FactoryDashboard"));
const MessageCenter = lazy(() => import("./pages/MessageCenter"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const WhyLourex = lazy(() => import("./pages/WhyLourex"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Deals = lazy(() => import("./pages/Deals"));
const BrokerDashboard = lazy(() => import("./pages/BrokerDashboard"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Settings = lazy(() => import("./pages/Settings"));
const SupplierProfile = lazy(() => import("./pages/SupplierProfile"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const RfqNew = lazy(() => import("./pages/RfqNew"));
const RfqList = lazy(() => import("./pages/RfqList"));
const RfqDetail = lazy(() => import("./pages/RfqDetail"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground font-medium tracking-wide">LOUREX</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <ConsentGate>
    <VerificationGate>{children}</VerificationGate>
  </ConsentGate>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/track" element={<Track />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/factory-signup" element={<FactorySignup />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/why-lourex" element={<WhyLourex />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/supplier/:id" element={<SupplierProfile />} />
                <Route path="/contact" element={<ContactPage />} />
                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
                <Route path="/deals/new" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/broker" element={<ProtectedRoute><BrokerDashboard /></ProtectedRoute>} />
                <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
                <Route path="/factory-dashboard" element={<ProtectedRoute><FactoryDashboard /></ProtectedRoute>} />
                <Route path="/messages/:orderId" element={<ProtectedRoute><MessageCenter /></ProtectedRoute>} />
                <Route path="/rfq/new" element={<ProtectedRoute><RfqNew /></ProtectedRoute>} />
                <Route path="/rfqs" element={<ProtectedRoute><RfqList /></ProtectedRoute>} />
                <Route path="/rfqs/:id" element={<ProtectedRoute><RfqDetail /></ProtectedRoute>} />
                <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AICommandBar />
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
