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

const Auth = forwardRef<HTMLDivElement>((_props, _ref) => {
  const { lang } = useI18n();
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
        title={lang === "ar" ? "لا يوجد ملف Lourex للحساب" : "No Lourex profile found"}
        description={
          lang === "ar"
            ? "تم تسجيل الدخول لكن الحساب لا يملك ملفًا تشغيليًا صالحًا داخل Lourex. يجب إصلاح ذلك قبل المتابعة."
            : "Authentication succeeded, but this account has no valid Lourex application profile yet. That must be fixed before you continue."
        }
        primaryAction={{ label: lang === "ar" ? "العودة للرئيسية" : "Back to home", to: "/" }}
        secondaryAction={{
          label: lang === "ar" ? "تسجيل الخروج" : "Sign out",
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
        title={lang === "ar" ? "الحساب غير نشط" : "Account is inactive"}
        description={
          lang === "ar"
            ? "تم التحقق من بيانات الدخول لكن الحساب غير مفعل حاليًا. راجع إدارة Lourex لتفعيل الدور أو تحديث الحالة."
            : "Your credentials are valid, but this account is not active right now. Please contact Lourex administration to activate or update it."
        }
        primaryAction={{ label: lang === "ar" ? "العودة للرئيسية" : "Back to home", to: "/" }}
        secondaryAction={{
          label: lang === "ar" ? "تسجيل الخروج" : "Sign out",
          onClick: () => {
            void supabase.auth.signOut();
          },
        }}
      />
    );
  }

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      return lang === "ar" ? "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل." : "Password must be at least 8 characters.";
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        toast.success(lang === "ar" ? "تم تسجيل الدخول بنجاح." : "Signed in successfully.");
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

        toast.success(
          lang === "ar"
            ? "تم إنشاء حساب العميل. تحقق من بريدك لتأكيد الحساب ثم سجل الدخول."
            : "Customer account created. Check your email to confirm the account, then sign in.",
        );
        setIsLogin(true);
        setPassword("");
      }
    } catch (error: any) {
      toast.error(error.message || (lang === "ar" ? "تعذر إكمال عملية المصادقة حاليًا." : "Authentication could not be completed right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-3xl font-bold tracking-wider text-gradient-gold">LOUREX</h1>
          <p className="text-muted-foreground">
            {isLogin
              ? lang === "ar"
                ? "سجل الدخول إلى مساحة Lourex المناسبة لدورك التشغيلي."
                : "Sign in to the Lourex workspace that matches your operational role."
              : lang === "ar"
                ? "إنشاء حساب عميل فقط. الحسابات الداخلية والشركاء يتم إنشاؤها من الإدارة."
                : "Create a customer account only. Internal and partner accounts are created by administration."}
          </p>
        </div>

        <div className="glass-card rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin ? (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={lang === "ar" ? "الاسم الكامل" : "Full name"}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="border-border bg-secondary pl-10"
                    required
                  />
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/8 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  {lang === "ar"
                    ? "هذا التسجيل مخصص للعملاء فقط. أدوار المالك والشريك التركي والشريك السعودي وموظفي العمليات لا يتم إنشاؤها ذاتيًا من الواجهة العامة."
                    : "This sign-up path is for customers only. Owner, Turkish partner, Saudi partner, and operations roles are not self-assigned from the public interface."}
                </div>
              </>
            ) : null}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="border-border bg-secondary pl-10" required />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder={lang === "ar" ? "كلمة المرور" : "Password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-border bg-secondary pl-10"
                required
                minLength={8}
              />
            </div>

            <Button variant="gold" className="h-11 w-full" disabled={loading}>
              {loading
                ? lang === "ar"
                  ? "يرجى الانتظار..."
                  : "Please wait..."
                : isLogin
                  ? lang === "ar"
                    ? "تسجيل الدخول"
                    : "Sign in"
                  : lang === "ar"
                    ? "إنشاء حساب عميل"
                    : "Create customer account"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <button onClick={() => setIsLogin((current) => !current)} className="block w-full text-sm text-muted-foreground transition-colors hover:text-primary">
              {isLogin
                ? lang === "ar"
                  ? "ليس لديك حساب عميل؟ أنشئ حسابًا"
                  : "Don't have a customer account? Sign up"
                : lang === "ar"
                  ? "لديك حساب بالفعل؟ سجل الدخول"
                  : "Already have an account? Sign in"}
            </button>
            <div className="border-t border-border/50 pt-3">
              <button onClick={() => navigate("/request")} className="block w-full text-sm font-medium text-primary transition-colors hover:text-primary/80">
                {lang === "ar" ? "تحتاج دعم توريد؟ ابدأ طلب شراء" : "Need sourcing support? Start a purchase request"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card/75 px-5 py-4 text-sm leading-7 text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            {lang === "ar" ? "وصول Lourex حسب الدور" : "Role-aware Lourex access"}
          </div>
          {lang === "ar"
            ? "بعد تسجيل الدخول، يقرأ Lourex ملفك، ويتحقق من دورك وحالة الحساب، ثم يوجهك تلقائيًا إلى المساحة الصحيحة."
            : "After login, Lourex reads your profile, validates your role and account status, then routes you automatically to the correct workspace."}
        </div>
      </motion.div>
    </div>
  );
});

Auth.displayName = "Auth";

export default Auth;
