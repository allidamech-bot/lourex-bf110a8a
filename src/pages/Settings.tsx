import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings as SettingsIcon, Lock, Globe, Bell, LogOut, User } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

const Settings = () => {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      setLoading(false);
    });
  }, [navigate]);

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(lang === "ar" ? "كلمة المرور قصيرة جداً" : "Password too short");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(lang === "ar" ? "كلمات المرور غير متطابقة" : "Passwords don't match");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(lang === "ar" ? "تم تغيير كلمة المرور" : "Password updated");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const Section = ({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h2>
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">
          <SettingsIcon className="w-7 h-7 inline mr-2 text-primary" />
          {lang === "ar" ? "الإعدادات" : "Settings"}
        </h1>

        {/* Account */}
        <Section icon={User} title={lang === "ar" ? "الحساب" : "Account"}>
          <div>
            <Label className="text-muted-foreground text-xs">{lang === "ar" ? "البريد" : "Email"}</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
            {lang === "ar" ? "تعديل الملف الشخصي" : "Edit Profile"}
          </Button>
        </Section>

        {/* Password */}
        <Section icon={Lock} title={lang === "ar" ? "كلمة المرور" : "Password"}>
          <div className="space-y-3">
            <div>
              <Label>{lang === "ar" ? "كلمة المرور الجديدة" : "New Password"}</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label>{lang === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={changePassword} disabled={saving} size="sm">
              {lang === "ar" ? "تحديث" : "Update Password"}
            </Button>
          </div>
        </Section>

        {/* Language */}
        <Section icon={Globe} title={lang === "ar" ? "اللغة" : "Language"}>
          <div className="flex gap-2">
            {(["en", "ar", "tr"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${lang === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {l === "en" ? "English" : l === "ar" ? "العربية" : "Türkçe"}
              </button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title={lang === "ar" ? "الإشعارات" : "Notifications"}>
          <div className="flex items-center justify-between">
            <span className="text-sm">{lang === "ar" ? "إشعارات البريد" : "Email Notifications"}</span>
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{lang === "ar" ? "الإشعارات الفورية" : "Push Notifications"}</span>
            <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
          </div>
        </Section>

        {/* Logout */}
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          {lang === "ar" ? "تسجيل الخروج" : "Sign Out"}
        </Button>
      </main>
    </div>
  );
};

export default Settings;
