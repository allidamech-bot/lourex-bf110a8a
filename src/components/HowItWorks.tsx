import { motion } from "framer-motion";
import { Handshake, ShieldCheck, Truck, UserPlus, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type StepContent = {
  title: string;
  desc: string;
};

type Step = {
  icon: typeof UserPlus;
  en: StepContent;
  ar: StepContent;
};

const steps: Step[] = [
  {
    icon: UserPlus,
    en: { title: "Create your account", desc: "Set up your business profile in a few guided steps." },
    ar: { title: "أنشئ حسابك", desc: "ابدأ ملف أعمالك عبر خطوات واضحة وسريعة." },
  },
  {
    icon: ShieldCheck,
    en: { title: "Complete verification", desc: "Our team reviews accounts to keep the network trusted and secure." },
    ar: { title: "أكمل التحقق", desc: "يراجع فريقنا الحسابات للحفاظ على شبكة موثوقة وآمنة." },
  },
  {
    icon: Users,
    en: { title: "Connect with partners", desc: "Match with verified suppliers and start qualified conversations." },
    ar: { title: "تواصل مع الشركاء", desc: "اعثر على موردين موثقين وابدأ تواصلاً فعّالاً معهم." },
  },
  {
    icon: Handshake,
    en: { title: "Review and confirm", desc: "Align on pricing, specifications, and terms with operational clarity." },
    ar: { title: "راجع وأكد", desc: "اتفق على الأسعار والمواصفات والشروط ضمن مسار تشغيلي واضح." },
  },
  {
    icon: Truck,
    en: { title: "Track delivery", desc: "Follow shipment progress from sourcing through final handoff." },
    ar: { title: "تابع الشحنة", desc: "راقب تقدم الشحنة من التوريد وحتى التسليم النهائي." },
  },
];

const HowItWorks = () => {
  const { lang } = useI18n();
  const titleParts =
    lang === "ar"
      ? { before: "كيف تعمل ", brand: "LOUREX", after: "" }
      : { before: "How ", brand: "LOUREX", after: " works" };

  return (
    <section id="how-it-works" className="bg-background py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="font-serif text-3xl font-bold md:text-5xl">
            {titleParts.before}
            <span className="text-gradient-gold">{titleParts.brand}</span>
            {titleParts.after}
          </h2>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="absolute left-[10%] right-[10%] top-12 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />

          {steps.map((step, index) => {
            const content = step[lang];

            return (
              <motion.div
                key={content.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                  <span className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mb-2 font-serif text-lg font-bold">{content.title}</h3>
                <p className="text-sm text-muted-foreground">{content.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
