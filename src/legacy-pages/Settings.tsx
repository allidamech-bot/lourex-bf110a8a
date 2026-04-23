import { useEffect, useState, type ReactNode } from "react";
import type { User as SupaUser } from "@supabase/supabase-js";
import { Bell, Globe, Lock, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const Settings = () => {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!currentUser) {
        navigate("/auth");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });
  }, [navigate]);

  const copy = {
    title: lang === "ar" ? "الإعدادات" : "Settings",
    account: lang === "ar" ? "الحساب" : "Account",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email",
    editProfile: lang === "ar" ? "تعديل الملف الشخصي" : "Edit profile",
    password: lang === "ar" ? "كلمة المرور" : "Password",
    newPassword: lang === "ar" ? "كلمة المرور الجديدة" : "New password",
    confirmPassword: lang === "ar" ? "تأكيد كلمة المرور" : "Confirm password",
    updatePassword: lang === "ar" ? "تحديث كلمة المرور" : "Update password",
    passwordTooShort: lang === "ar" ? "كلمة المرور قصيرة جداً" : "Password is too short",
    passwordsDontMatch: lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
    passwordUpdated: lang === "ar" ? "تم تحديث كلمة المرور" : "Password updated",
    language: lang === "ar" ? "اللغة" : "Language",
    notifications: lang === "ar" ? "الإشعارات" : "Notifications",
    emailNotifications: lang === "ar" ? "إشعارات البريد الإلكتروني" : "Email notifications",
    pushNotifications: lang === "ar" ? "الإشعارات الفورية" : "Push notifications",
    signOut: lang === "ar" ? "تسجيل الخروج" : "Sign out",
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(copy.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(copy.passwordsDontMatch);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(copy.passwordUpdated);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: typeof User;
    title: string;
    children: ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl space-y-6 px-4 pb-16 pt-24">
        <h1 className="text-3xl font-bold">
          <SettingsIcon className="me-2 inline h-7 w-7 text-primary" />
          {copy.title}
        </h1>

        <Section icon={User} title={copy.account}>
          <div>
            <Label className="text-xs text-muted-foreground">{copy.email}</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
            {copy.editProfile}
          </Button>
        </Section>

        <Section icon={Lock} title={copy.password}>
          <div className="space-y-3">
            <div>
              <Label>{copy.newPassword}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div>
              <Label>{copy.confirmPassword}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <Button onClick={changePassword} disabled={saving} size="sm">
              {copy.updatePassword}
            </Button>
          </div>
        </Section>

        <Section icon={Globe} title={copy.language}>
          <div className="flex gap-2">
            {[
              { code: "en" as const, label: "English" },
              { code: "ar" as const, label: "العربية" },
            ].map((languageOption) => (
              <button
                key={languageOption.code}
                onClick={() => setLang(languageOption.code)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  lang === languageOption.code
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {languageOption.label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Bell} title={copy.notifications}>
          <div className="flex items-center justify-between">
            <span className="text-sm">{copy.emailNotifications}</span>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{copy.pushNotifications}</span>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
        </Section>

        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="me-2 h-4 w-4" />
          {copy.signOut}
        </Button>
      </main>
    </div>
  );
};

export default Settings;
