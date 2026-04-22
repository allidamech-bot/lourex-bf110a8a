import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthStateScreen } from "@/components/auth/AuthStateScreen";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getRoleDisplayName } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";
import {
  canAccessRole,
  getDefaultRouteForRole,
  isInternalRole,
  type LourexRole,
} from "@/features/auth/rbac";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: LourexRole[];
  requireInternal?: boolean;
  redirectToDefault?: boolean;
};

const LoadingState = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm font-medium tracking-wide text-muted-foreground">LOUREX</span>
    </div>
  </div>
);

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireInternal = false,
  redirectToDefault = false,
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, profile, loading, signOut } = useAuthSession();
  const { t } = useI18n();

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <AuthStateScreen
        variant="missing"
        title={t("auth.missingTitle")}
        description={t("auth.missingDescription")}
        primaryAction={{ label: t("auth.backToAuth"), to: "/auth" }}
        secondaryAction={{ label: t("auth.signOut"), onClick: () => void signOut() }}
      />
    );
  }

  if (profile.status !== "active") {
    return (
      <AuthStateScreen
        variant="inactive"
        title={t("auth.inactiveTitle")}
        description={t("auth.inactiveDescription")}
        primaryAction={{ label: t("auth.backHome"), to: "/" }}
        secondaryAction={{ label: t("auth.signOut"), onClick: () => void signOut() }}
      />
    );
  }

  if (requireInternal && !isInternalRole(profile.role)) {
    if (redirectToDefault) {
      return <Navigate to={getDefaultRouteForRole(profile.role)} replace />;
    }

    return (
      <AuthStateScreen
        variant="forbidden"
        title={t("auth.internalOnlyTitle")}
        description={t("auth.internalOnlyDescription")}
        primaryAction={{ label: t("auth.customerPortal"), to: getDefaultRouteForRole(profile.role) }}
        secondaryAction={{ label: t("auth.signOut"), onClick: () => void signOut() }}
      />
    );
  }

  if (!canAccessRole(profile.role, allowedRoles)) {
    if (redirectToDefault) {
      return <Navigate to={getDefaultRouteForRole(profile.role)} replace />;
    }

    return (
      <AuthStateScreen
        variant="forbidden"
        title={t("auth.forbiddenTitle")}
        description={t("auth.forbiddenDescription", { role: getRoleDisplayName(profile.role, t) })}
        primaryAction={{ label: t("auth.myArea"), to: getDefaultRouteForRole(profile.role) }}
        secondaryAction={{ label: t("auth.signOut"), onClick: () => void signOut() }}
      />
    );
  }

  return <>{children}</>;
};
