import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, User, Building2, Factory, ShoppingBag, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, Lang } from "@/lib/i18n";

type Role = "owner" | "factory" | "client";

const Welcome = () => {
  const [step, setStep] = useState<"language" | "role">("language");
  const { lang, setLang, dir } = useI18n();
  const navigate = useNavigate();

  const languages: { code: Lang; label: string; native: string }[] = [
    { code: "en", label: "English", native: "English" },
    { code: "ar", label: "العربية", native: "Arabic" },
    { code: "tr", label: "Türkçe", native: "Turkish" },
  ];

  const roles: { id: Role; icon: typeof Crown; label: Record<Lang, string>; desc: Record<Lang, string>; path: string }[] = [
    {
      id: "owner",
      icon: Crown,
      label: { en: "Owner / Admin", ar: "مالك / مدير", tr: "Sahip / Yönetici" },
      desc: { en: "Full platform control & analytics", ar: "تحكم كامل بالمنصة والتحليلات", tr: "Tam platform kontrolü ve analitik" },
      path: "/auth",
    },
    {
      id: "factory",
      icon: Factory,
      label: { en: "Factory / Supplier", ar: "مصنع / مورد", tr: "Fabrika / Tedarikçi" },
      desc: { en: "Manage production, staff & orders", ar: "إدارة الإنتاج والموظفين والطلبات", tr: "Üretim, personel ve siparişleri yönetin" },
      path: "/factory-signup",
    },
    {
      id: "client",
      icon: ShoppingBag,
      label: { en: "Client / Importer", ar: "عميل / مستورد", tr: "Müşteri / İthalatçı" },
      desc: { en: "Source products & track shipments", ar: "ابحث عن منتجات وتتبع الشحنات", tr: "Ürün tedarik edin ve gönderi takip edin" },
      path: "/auth",
    },
  ];

  const handleLanguageSelect = (code: Lang) => {
    setLang(code);
    setStep("role");
  };

  const handleRoleSelect = (role: typeof roles[0]) => {
    navigate(role.path);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden" dir={dir}>
      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gradient-gold tracking-widest mb-3">
            LOUREX
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide">
            {lang === "ar" ? "بوابتك المباشرة إلى المصانع التركية" : lang === "tr" ? "Türk Fabrikalarına Doğrudan Kapınız" : "Your Direct Gateway to Turkish Factories"}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "language" && (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold">Select Language</h2>
                    <p className="text-xs text-muted-foreground">اختر لغتك · Dilinizi seçin</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {languages.map((l) => (
                    <motion.button
                      key={l.code}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLanguageSelect(l.code)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                        lang === l.code
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 bg-card hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <span className="text-base font-semibold">{l.label}</span>
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === "role" && (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold">
                      {lang === "ar" ? "من أنت؟" : lang === "tr" ? "Siz kimsiniz?" : "Who are you?"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "اختر دورك للمتابعة" : lang === "tr" ? "Devam etmek için rolünüzü seçin" : "Select your role to continue"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {roles.map((role) => (
                    <motion.button
                      key={role.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRoleSelect(role)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all duration-200 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <role.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-start flex-1">
                        <p className="font-semibold text-foreground">{role.label[lang]}</p>
                        <p className="text-xs text-muted-foreground">{role.desc[lang]}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setStep("language")}
                  className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center"
                >
                  {lang === "ar" ? "← تغيير اللغة" : lang === "tr" ? "← Dili Değiştir" : "← Change Language"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip to homepage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {lang === "ar" ? "تخطي وتصفح الموقع" : lang === "tr" ? "Atlayın ve siteye göz atın" : "Skip & browse the site"}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
