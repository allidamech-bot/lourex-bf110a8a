import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Crown, Factory, Globe, ShoppingBag, User } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";

type Role = "owner" | "factory" | "client";

type LocalizedCopy = Record<Lang, string>;

type WelcomeRole = {
  id: Role;
  icon: typeof Crown;
  label: LocalizedCopy;
  desc: LocalizedCopy;
  path: string;
};

const languageOptions: Array<{ code: Lang; label: string; native: string }> = [
  { code: "en", label: "English", native: "English" },
  { code: "ar", label: "العربية", native: "العربية" },
];

const roles: WelcomeRole[] = [
  {
    id: "owner",
    icon: Crown,
    label: { en: "Owner / General Manager", ar: "المالك / المدير العام" },
    desc: {
      en: "Access platform oversight, operations visibility, and reporting.",
      ar: "الوصول إلى الإشراف العام على المنصة ومتابعة العمليات والتقارير.",
    },
    path: "/auth",
  },
  {
    id: "factory",
    icon: Factory,
    label: { en: "Factory / Supplier", ar: "المصنع / المورد" },
    desc: {
      en: "Manage production coordination, requests, and operational follow-up.",
      ar: "إدارة التنسيق الإنتاجي والطلبات والمتابعة التشغيلية.",
    },
    path: "/factory-signup",
  },
  {
    id: "client",
    icon: ShoppingBag,
    label: { en: "Client / Importer", ar: "العميل / المستورد" },
    desc: {
      en: "Submit sourcing requests and track progress with confidence.",
      ar: "أرسل طلبات التوريد وتابع سير العمل بثقة.",
    },
    path: "/auth",
  },
];

const Welcome = () => {
  const [step, setStep] = useState<"language" | "role">("language");
  const { lang, setLang, dir } = useI18n();
  const navigate = useNavigate();

  const heroTagline =
    lang === "ar"
      ? "بوابتك المباشرة إلى المصانع التركية"
      : "Your direct gateway to Turkish factories";

  const languageTitle = lang === "ar" ? "اختر اللغة" : "Select language";
  const languageSubtitle =
    lang === "ar" ? "اختر اللغة المناسبة للمتابعة" : "Choose your preferred language to continue";
  const roleTitle = lang === "ar" ? "من أنت؟" : "Who are you?";
  const roleSubtitle =
    lang === "ar" ? "اختر دورك للمتابعة" : "Select your role to continue";
  const changeLanguageLabel = lang === "ar" ? "تغيير اللغة" : "Change language";
  const skipLabel = lang === "ar" ? "تخطي وتصفح الموقع" : "Skip and browse the site";

  const handleLanguageSelect = (code: Lang) => {
    setLang(code);
    setStep("role");
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center overflow-hidden bg-background px-4"
      dir={dir}
    >
      <div className="pointer-events-none fixed left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[150px]" />

      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="mb-3 font-serif text-4xl font-bold tracking-widest text-gradient-gold md:text-5xl">
            LOUREX
          </h1>
          <p className="text-sm tracking-wide text-muted-foreground">{heroTagline}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "language" ? (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card rounded-2xl p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold">{languageTitle}</h2>
                    <p className="text-xs text-muted-foreground">{languageSubtitle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {languageOptions.map((languageOption) => (
                    <motion.button
                      key={languageOption.code}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLanguageSelect(languageOption.code)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                        lang === languageOption.code
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 bg-card text-foreground hover:border-primary/30"
                      }`}
                    >
                      <div className="text-start">
                        <span className="block text-base font-semibold">{languageOption.label}</span>
                        <span className="text-xs text-muted-foreground">{languageOption.native}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card rounded-2xl p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold">{roleTitle}</h2>
                    <p className="text-xs text-muted-foreground">{roleSubtitle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {roles.map((role) => (
                    <motion.button
                      key={role.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(role.path)}
                      className="group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/40"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <role.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 text-start">
                        <p className="font-semibold text-foreground">{role.label[lang]}</p>
                        <p className="text-xs text-muted-foreground">{role.desc[lang]}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setStep("language")}
                  className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {changeLanguageLabel}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            {skipLabel}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
