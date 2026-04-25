import { forwardRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthStateScreen } from "@/components/auth/AuthStateScreen";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getDefaultRouteForRole } from "@/features/auth/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";

const Auth = forwardRef<HTMLDivElement>((_props, _ref) => {
  const { lang, t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: sessionLoading } = useAuthSession();

  useEffect(() => {
    if (sessionLoading || !user || !profile || profile.status !== "active") return;

    const requestedPath = (location.state as { from?: string } | null)?.from;
    const fallbackPath = getDefaultRouteForRole(profile.role);
    const targetPath =
      requestedPath &&
      requestedPath !== "/auth" &&
      (profile.role !== "customer" || !requestedPath.startsWith("/dashboard"))
        ? requestedPath
        : fallbackPath;

    navigate(targetPath, { replace: true });
  }, [sessionLoading, user, profile, location.state, navigate]);

  if (!sessionLoading && user && !profile) {
    return (
      <AuthStateScreen
        variant="missing"
        title={t("auth.missingTitle")}
        description={t("auth.missingDescription")}
        primaryAction={{ label: t("auth.backHome"), to: "/" }}
        secondaryAction={{
          label: t("auth.signOut"),
          onClick: () => {
            void supabase.auth.signOut();
          },
        }}
      />
    );
  }

  if (!sessionLoading && user && profile && profile.status !== "active") {
    return (
      <AuthStateScreen
        variant="inactive"
        title={t("auth.inactiveTitle")}
        description={t("auth.inactiveDescription")}
        primaryAction={{ label: t("auth.backHome"), to: "/" }}
        secondaryAction={{
          label: t("auth.signOut"),
          onClick: () => {
            void supabase.auth.signOut();
          },
        }}
      />
    );
  }

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      return t("auth.passwordTooShort");
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // Check for missing Supabase config
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        throw new Error("CONFIG_ERROR");
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        trackEvent("login_success", { flow: "auth", mode: "password" });
        toast.success(t("auth.signInSuccess"));
      } else {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              requested_role: "customer",
            },
          },
        });

        if (error) throw error;

        trackEvent("signup_success", { flow: "auth", requestedRole: "customer" });
        toast.success(t("auth.signUpSuccess"));
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      logOperationalError(isLogin ? "login_failure" : "signup_failure", error, {
        flow: "auth",
        hasEmail: Boolean(email.trim()),
      });
      if (isLogin) {
        trackEvent("login_failure", {
          flow: "auth",
          reason: error?.status || error?.message || "unknown",
        });
      } else {
        trackEvent("signup_failure", {
          flow: "auth",
          reason: error?.status || error?.message || "unknown",
        });
      }
      const fallbackMessage =
        error?.message === "CONFIG_ERROR"
          ? t("auth.authError")
          : isLogin
            ? t("auth.invalidCredentials")
            : error?.message || t("auth.authError");

      toast.error(fallbackMessage);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-3xl font-bold tracking-wider text-gradient-gold">LOUREX</h1>
          <p className="text-muted-foreground">
            {isLogin ? t("auth.signInDescription") : t("auth.signUpDescription")}
          </p>
        </div>

        <div className="glass-card rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin ? (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("auth.fullName")}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="border-border bg-secondary pl-10"
                    required
                  />
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/8 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  {t("auth.customerSignupNote")}
                </div>
              </>
            ) : null}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" placeholder={t("auth.email")} value={email} onChange={(event) => setEmail(event.target.value)} className="border-border bg-secondary pl-10" required />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-border bg-secondary pl-10"
                required
                minLength={8}
              />
            </div>

            <Button variant="gold" className="h-11 w-full" disabled={loading}>
              {loading ? t("auth.submitting") : isLogin ? t("auth.signIn") : t("auth.signUp")}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <button onClick={() => setIsLogin((current) => !current)} className="block w-full text-sm text-muted-foreground transition-colors hover:text-primary">
              {isLogin ? t("auth.noAccount") : t("auth.alreadyHaveAccount")}
            </button>
            <div className="border-t border-border/50 pt-3">
              <button onClick={() => navigate("/request")} className="block w-full text-sm font-medium text-primary transition-colors hover:text-primary/80">
                {t("auth.needSourcingSupport")}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card/75 px-5 py-4 text-sm leading-7 text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            {t("auth.roleAwareTitle")}
          </div>
          {t("auth.roleAwareDescription")}
        </div>
      </motion.div>
    </div>
  );
});

Auth.displayName = "Auth";

export default Auth;
