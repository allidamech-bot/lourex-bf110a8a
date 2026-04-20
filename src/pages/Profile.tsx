import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { SharedAccountPanel } from "@/components/account/SharedAccountPanel";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Shield, Crown, Factory, ShoppingBag } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const ROLE_BADGES: Record<string, { label: string; labelAr: string; icon: typeof Crown; color: string }> = {
  admin: { label: "Owner", labelAr: "مالك", icon: Crown, color: "bg-primary/20 text-primary" },
  factory: { label: "Factory", labelAr: "مصنع", icon: Factory, color: "bg-emerald-500/20 text-emerald-400" },
  buyer: { label: "Client", labelAr: "عميل", icon: ShoppingBag, color: "bg-blue-500/20 text-blue-400" },
  user: { label: "User", labelAr: "مستخدم", icon: Shield, color: "bg-secondary text-muted-foreground" },
};

const Profile = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setRoles(roleData?.map(r => r.role) || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl font-bold">
              {lang === "ar" ? "ملفي" : "My"}{" "}
              <span className="text-gradient-gold">{lang === "ar" ? "الشخصي" : "Profile"}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>

            {/* Role badges */}
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {roles.map(role => {
                  const cfg = ROLE_BADGES[role] || ROLE_BADGES.user;
                  const Icon = cfg.icon;
                  return (
                    <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {lang === "ar" ? cfg.labelAr : cfg.label}
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>

          <SharedAccountPanel
            title={lang === "ar" ? "البيانات الشخصية" : "Personal Information"}
            companyTitle={lang === "ar" ? "بيانات الشركة" : "Company Profile"}
            deleteRedirectTo="/"
          />
        </div>
      </main>
    </div>
  );
};

export default Profile;
