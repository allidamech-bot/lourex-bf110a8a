import { forwardRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { AuthStateScreen } from "@/components/auth/AuthStateScreen";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getDefaultRouteForRole } from "@/features/auth/rbac";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import { validatePassword } from "@/lib/validation";

const Auth = forwardRef<HTMLDivElement>((_props, _ref) => {
  const { lang: _lang, t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    profile,
    loading: sessionLoading,
    profileError,
    profileMissing,
  } = useAuthSession();

  useEffect(() => {
    if (sessionLoading || !user || !profile || profile.status !== "active") return;

    const requestedPath = (location.state as { from?: string } | null)?.from;
    const fallbackPath = getDefaultRouteForRole(profile.role);
    const isCustomer = profile.role === "customer";
    const requestedCustomerPortal = requestedPath?.startsWith("/customer-portal");
    const requestedDashboard = requestedPath?.startsWith("/dashboard");
    const targetPath =
      requestedPath &&
      requestedPath !== "/auth" &&
      (!isCustomer || !requestedDashboard) &&
      (isCustomer || !requestedCustomerPortal)
        ? requestedPath
        : fallbackPath;

    navigate(targetPath, { replace: true });
  }, [sessionLoading, user, profile, location.state, navigate]);

  if (!sessionLoading && user && profileError) {
    return (
      <AuthStateScreen
        variant="error"
        title={t("auth.profileLoadTitle")}
        description={t("auth.profileLoadDescription")}
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

  if (!sessionLoading && user && (profileMissing || !profile)) {
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

  const getPasswordError = (value: string) => {
    const validationError = validatePassword(value);
    if (validationError && validationError === "Password must be at least 8 characters long") {
      return t("auth.passwordTooShort");
    }
    return validationError;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
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
        const passwordError = getPasswordError(password);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 bg-stone-950"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.03) 0%, #0c0a09 60%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.02),transparent_40%)] pointer-events-none" />
        {/* Logo */}
        <div className="mb-8 text-center relative z-10">
          <h1 className="mb-1.5 font-serif text-3xl font-bold tracking-wider text-amber-500 uppercase">LOUREX</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
            {isLogin ? t("auth.signInDescription") : t("auth.signUpDescription")}
          </p>
        </div>

        {/* Glass login card */}
        <div className="bg-stone-900/55 backdrop-blur-xl border border-amber-200/10 rounded-[2rem] px-7 py-8 shadow-2xl relative z-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin ? (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    placeholder={t("auth.fullName")}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full px-3 py-3 pl-10 text-sm bg-stone-950/40 border border-amber-200/10 rounded-xl text-stone-100 focus:ring-amber-500/20 outline-none"
                    required
                  />
                </div>
                <div
                  className="rounded-xl px-4 py-3 text-xs leading-6 text-stone-500 font-medium"
                  style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.1)" }}
                >
                  {t("auth.customerSignupNote")}
                </div>
              </>
            ) : null}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3 py-3 pl-10 text-sm bg-stone-950/40 border border-amber-200/10 rounded-xl text-stone-100 focus:ring-amber-500/20 outline-none"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-3 pl-10 text-sm bg-stone-950/40 border border-amber-200/10 rounded-xl text-stone-100 focus:ring-amber-500/20 outline-none"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-xl text-sm font-bold text-stone-950 transition-all disabled:opacity-50 bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 shadow-xl hover:brightness-110"
            >
              {loading ? t("auth.submitting") : isLogin ? t("auth.signIn") : t("auth.signUp")}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button
              onClick={() => setIsLogin((current) => !current)}
              className="block w-full text-xs font-bold uppercase tracking-widest text-stone-500 transition-colors hover:text-amber-200"
            >
              {isLogin ? t("auth.noAccount") : t("auth.alreadyHaveAccount")}
            </button>
            <div className="pt-3 border-t border-amber-200/10">
              <button
                onClick={() => navigate("/request")}
                className="block w-full text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
              >
                {t("auth.needSourcingSupport")}
              </button>
            </div>
          </div>
        </div>

        {/* Role-aware info card */}
        <div
          className="mt-6 rounded-2xl px-5 py-4 text-xs leading-7 text-stone-500 font-medium border border-amber-200/10 bg-stone-900/30 backdrop-blur shadow-lg relative z-10"
        >
          <div className="mb-2 flex items-center gap-2 font-bold text-stone-300 uppercase tracking-widest">
            <Building2 className="h-4 w-4 text-amber-500" />
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
