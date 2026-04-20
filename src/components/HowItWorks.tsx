import { motion } from "framer-motion";
import { UserPlus, ShieldCheck, Users, Handshake, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const HowItWorks = () => {
  const { lang } = useI18n();

  const steps = [
    {
      icon: UserPlus,
      en: { title: "Sign Up", desc: "Create your business account in minutes" },
      ar: { title: "سجّل حسابك", desc: "أنشئ حساب عملك بسهولة" },
      tr: { title: "Kayıt Olun", desc: "İş hesabınızı dakikalar içinde oluşturun" },
    },
    {
      icon: ShieldCheck,
      en: { title: "Get Verified", desc: "We verify all users for maximum trust" },
      ar: { title: "احصل على التوثيق", desc: "نوثّق جميع المستخدمين لأقصى درجات الثقة" },
      tr: { title: "Doğrulanın", desc: "Maksimum güven için tüm kullanıcıları doğrularız" },
    },
    {
      icon: Users,
      en: { title: "Connect", desc: "Find and connect with suppliers directly" },
      ar: { title: "تواصل", desc: "ابحث وتواصل مع الموردين مباشرة" },
      tr: { title: "Bağlanın", desc: "Tedarikçilerle doğrudan bağlantı kurun" },
    },
    {
      icon: Handshake,
      en: { title: "Negotiate & Order", desc: "Secure deals within the platform" },
      ar: { title: "تفاوض واطلب", desc: "أتمم الصفقات داخل المنصة" },
      tr: { title: "Pazarlık & Sipariş", desc: "Platform içinde güvenli anlaşmalar yapın" },
    },
    {
      icon: Truck,
      en: { title: "Track Shipment", desc: "Follow your shipment step by step" },
      ar: { title: "تتبّع الشحنة", desc: "تابع شحنتك خطوة بخطوة" },
      tr: { title: "Gönderi Takibi", desc: "Gönderinizi adım adım takip edin" },
    },
  ];

  const title = lang === "ar" ? "كيف يعمل LOUREX" : lang === "tr" ? "LOUREX Nasıl Çalışır" : "How LOUREX Works";

  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4">
            {title.split("LOUREX")[0]}
            <span className="text-gradient-gold">LOUREX</span>
            {title.split("LOUREX")[1] || ""}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {steps.map((step, i) => {
            const loc = step[lang as "en" | "ar" | "tr"] || step.en;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 relative z-10">
                  <step.icon className="w-7 h-7 text-primary" />
                  <span className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold mb-2">{loc.title}</h3>
                <p className="text-sm text-muted-foreground">{loc.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
