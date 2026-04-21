import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import AICommandBar from "@/components/AICommandBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthSessionProvider } from "@/features/auth/AuthSessionProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ACCOUNTING_ROLES, INTERNAL_ROLES, OWNER_ONLY_ROLES } from "@/features/auth/rbac";

const HomePage = lazy(() => import("@/pages/public/HomePage"));
const RequestPage = lazy(() => import("@/pages/public/RequestPage"));
const TrackPage = lazy(() => import("@/pages/public/TrackPage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
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
const Admin = lazy(() => import("@/pages/Admin"));
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

const App = () => (
    <QueryClientProvider client={queryClient}>
        <I18nProvider>
            <TooltipProvider>
                <ErrorBoundary>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                        <AuthSessionProvider>
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/request" element={<RequestPage />} />
                                    <Route path="/track" element={<TrackPage />} />
                                    <Route path="/auth" element={<Auth />} />
                                    <Route path="/about" element={<AboutPage />} />
                                    <Route path="/contact" element={<ContactPage />} />

                                    <Route
                                        path="/dashboard"
                                        element={
                                            <ProtectedRoute requireInternal allowedRoles={INTERNAL_ROLES}>
                                                <DashboardLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route index element={<OverviewPage />} />
                                        <Route
                                            path="requests"
                                            element={
                                                <ProtectedRoute allowedRoles={["owner", "operations_employee"]}>
                                                    <PurchaseRequestsPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="customers"
                                            element={
                                                <ProtectedRoute allowedRoles={["owner", "operations_employee"]}>
                                                    <CustomersPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="deals"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <DealsPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="tracking"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <TrackingPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="accounting"
                                            element={
                                                <ProtectedRoute allowedRoles={ACCOUNTING_ROLES}>
                                                    <AccountingPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="edit-requests"
                                            element={
                                                <ProtectedRoute allowedRoles={ACCOUNTING_ROLES}>
                                                    <EditRequestsPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="audit"
                                            element={
                                                <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
                                                    <AuditPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                        <Route
                                            path="reports"
                                            element={
                                                <ProtectedRoute allowedRoles={["owner", "operations_employee"]}>
                                                    <ReportsPage />
                                                </ProtectedRoute>
                                            }
                                        />
                                    </Route>

                                    <Route
                                        path="/profile"
                                        element={
                                            <ProtectedRoute>
                                                <Profile />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="/admin"
                                        element={
                                            <ProtectedRoute allowedRoles={OWNER_ONLY_ROLES}>
                                                <Admin />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Suspense>
                            <AICommandBar />
                        </AuthSessionProvider>
                    </BrowserRouter>
                </ErrorBoundary>
            </TooltipProvider>
        </I18nProvider>
    </QueryClientProvider>
);

export default App;
