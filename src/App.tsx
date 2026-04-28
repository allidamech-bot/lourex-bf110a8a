import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthSessionProvider } from "@/features/auth/AuthSessionProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { isSupabaseConfigured, missingSupabaseEnvVars } from "@/integrations/supabase/client";

const DashboardLayout = lazy(() => import("@/components/layout/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const CustomerLayout = lazy(() => import("@/components/layout/CustomerLayout").then(m => ({ default: m.CustomerLayout })));
const AICommandBar = lazy(() => import("@/components/AICommandBar"));
import {
    ACCOUNTING_DASHBOARD_UI_ROLES,
    INTERNAL_ROLES,
    OWNER_DASHBOARD_UI_ROLES,
    OWNER_ONLY_ROLES,
    SYSTEM_DASHBOARD_UI_ROLES,
} from "@/features/auth/rbac";

const HomePage = lazy(() => import("@/pages/public/HomePage"));
const RequestPage = lazy(() => import("@/pages/public/RequestPage"));
const TrackPage = lazy(() => import("@/pages/public/TrackPage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const PrivacyPage = lazy(() => import("@/pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/public/TermsPage"));
const WhyLourexPage = lazy(() => import("@/pages/public/WhyLourexPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const Auth = lazy(() => import("@/pages/Auth"));
const OverviewPage = lazy(() => import("@/pages/dashboard/OverviewPage"));
const PurchaseRequestsPage = lazy(() => import("@/pages/dashboard/PurchaseRequestsPage"));
const CustomersPage = lazy(() => import("@/pages/dashboard/CustomersPage"));
const DealsPage = lazy(() => import("@/pages/dashboard/DealsPage"));
const TrackingPage = lazy(() => import("@/pages/dashboard/TrackingPage"));
const AccountingPage = lazy(() => import("@/pages/dashboard/AccountingPage"));
const EditRequestsPage = lazy(() => import("@/pages/dashboard/EditRequestsPage"));
const AuditPage = lazy(() => import("@/pages/dashboard/AuditPage"));
const ReportsPage = lazy(() => import("@/pages/dashboard/ReportsPage"));
const SystemControlsPage = lazy(() => import("@/pages/dashboard/SystemControlsPage"));
const Admin = lazy(() => import("@/pages/Admin"));
const CustomerPortal = lazy(() => import("@/pages/customer/CustomerPortal"));
const CustomerRequestsPage = lazy(() => import("@/pages/customer/CustomerRequestsPage"));
const CustomerTrackingPage = lazy(() => import("@/pages/customer/CustomerTrackingPage"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium tracking-wide text-muted-foreground">LOUREX</span>
        </div>
    </div>
);

const PageWithAI = ({ component }: { component: React.ReactNode }) => (
    <>
        {component}
        <AICommandBar />
    </>
);

const SupabaseSetupError = () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-2xl rounded-[1.75rem] border border-destructive/30 bg-card p-8 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.65)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Configuration required</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold">Supabase environment variables are missing</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Lourex cannot start authentication or database features until the runtime environment provides the Supabase project URL and publishable key.
            </p>
            <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/30 p-4">
                <p className="text-sm font-medium">Missing variables</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {missingSupabaseEnvVars.map((name) => (
                        <li key={name} className="font-mono">{name}</li>
                    ))}
                </ul>
            </div>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
                In Lovable Cloud, open the project, go to the Cloud tab, then add these values in the environment/secrets settings for the connected Supabase project. For local development, add them to your local .env file.
            </p>
        </div>
    </div>
);

const App = () => (
    <QueryClientProvider client={queryClient}>
        <I18nProvider>
            <TooltipProvider>
                <ErrorBoundary>
                    <Toaster />
                    <Sonner />
                    {isSupabaseConfigured ? (
                        <BrowserRouter>
                            <AuthSessionProvider>
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/request" element={<PageWithAI component={<RequestPage />} />} />
                                    <Route path="/track" element={<PageWithAI component={<TrackPage />} />} />
                                    <Route path="/auth" element={<Auth />} />
                                    <Route path="/about" element={<PageWithAI component={<AboutPage />} />} />
                                    <Route path="/privacy" element={<PageWithAI component={<PrivacyPage />} />} />
                                    <Route path="/terms" element={<PageWithAI component={<TermsPage />} />} />
                                    <Route path="/guidelines" element={<PageWithAI component={<TermsPage />} />} />
                                    <Route path="/why-lourex" element={<PageWithAI component={<WhyLourexPage />} />} />
                                    <Route path="/contact" element={<PageWithAI component={<ContactPage />} />} />

                                    <Route
                                        path="/dashboard"
                                        element={
                                            <ProtectedRoute
                                                allowedRoles={INTERNAL_ROLES}
                                                requireInternal
                                                redirectToDefault
                                            >
                                                <DashboardLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route 
                                            index 
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <PageWithAI component={<OverviewPage />} />
                                                </ProtectedRoute>
                                            } 
                                        />
                                        <Route
                                            path="requests"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <PageWithAI component={<PurchaseRequestsPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="customers"
                                            element={
                                                <ProtectedRoute allowedRoles={[...OWNER_DASHBOARD_UI_ROLES, "operations_employee"]}>
                                                    <PageWithAI component={<CustomersPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="deals"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <PageWithAI component={<DealsPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="tracking"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <PageWithAI component={<TrackingPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="accounting"
                                            element={
                                                <ProtectedRoute allowedRoles={ACCOUNTING_DASHBOARD_UI_ROLES}>
                                                    <PageWithAI component={<AccountingPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="edit-requests"
                                            element={
                                                <ProtectedRoute allowedRoles={ACCOUNTING_DASHBOARD_UI_ROLES}>
                                                    <PageWithAI component={<EditRequestsPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="audit"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <PageWithAI component={<AuditPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="reports"
                                            element={
                                                <ProtectedRoute allowedRoles={[...OWNER_DASHBOARD_UI_ROLES, "operations_employee"]}>
                                                    <PageWithAI component={<ReportsPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="system"
                                            element={
                                                <ProtectedRoute allowedRoles={SYSTEM_DASHBOARD_UI_ROLES}>
                                                    <PageWithAI component={<SystemControlsPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                    </Route>

                                    <Route
                                        path="/profile"
                                        element={
                                            <ProtectedRoute>
                                                <PageWithAI component={<Profile />} />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="/customer-portal"
                                        element={
                                            <ProtectedRoute allowedRoles={["customer"]}>
                                                <CustomerLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route index element={<PageWithAI component={<CustomerPortal />} />} />
                                        <Route
                                            path="requests"
                                            element={
                                                <ProtectedRoute allowedRoles={["customer"]}>
                                                    <PageWithAI component={<CustomerRequestsPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="tracking"
                                            element={
                                                <ProtectedRoute allowedRoles={["customer"]}>
                                                    <PageWithAI component={<CustomerTrackingPage />} />
                                                </ProtectedRoute>
                                            }
                                        />
                                    </Route>
                                    <Route
                                        path="/admin"
                                        element={
                                            <ProtectedRoute allowedRoles={OWNER_ONLY_ROLES}>
                                                <PageWithAI component={<Admin />} />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route path="*" element={<NotFound />} />
                                    </Routes>
                                </Suspense>
                            </AuthSessionProvider>
                        </BrowserRouter>
                    ) : (
                        <SupabaseSetupError />
                    )}
                </ErrorBoundary>
            </TooltipProvider>
        </I18nProvider>
    </QueryClientProvider>
);

export default App;
