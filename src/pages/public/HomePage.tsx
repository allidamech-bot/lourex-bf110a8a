import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Settings, 
  PackageCheck, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  LayoutDashboard 
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t, lang } = useI18n();
  const isRtl = lang === "ar";

  return (
    <div className="min-h-screen bg-background selection:bg-gold/30 selection:text-gold-light" dir={isRtl ? "rtl" : "ltr"}>
      <SEO title="Lourex | إدارة الاستيراد والوساطة" description="من طلب الشراء إلى التسليم النهائي — تحكم كامل بكل خطوة." />
      
      <SiteHeader />

      {/* 🚀 HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0B1220]">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/90 via-[#0B1220]/70 to-[#0B1220] z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_60%)] z-10" />
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&auto=format&fit=crop" 
            alt="Logistics Port" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
        </div>

        {/* Accent Lines */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gold/40 to-transparent z-20" />
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent z-20" />

        <div className="container relative z-20 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-4xl"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.2]">
              إدارة الاستيراد والوساطة… <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-soft drop-shadow-[0_0_15px_rgba(212,166,58,0.3)]">
                بمنظومة واحدة ذكية.
              </span>
            </h1>
            
            <p className="mt-8 text-xl md:text-2xl text-slate-300 font-medium">
              من طلب الشراء إلى التسليم النهائي — تحكم كامل بكل خطوة.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/dashboard"
                className="group flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-gold px-8 text-lg font-bold text-background shadow-[0_0_20px_rgba(212,166,58,0.3)] transition-all hover:bg-gold-light hover:shadow-[0_0_30px_rgba(212,166,58,0.5)] hover:-translate-y-1"
              >
                <span>ابدأ الآن</span>
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/#how-it-works"
                className="group flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-8 text-lg font-bold text-white backdrop-blur-md transition-all hover:border-gold/30 hover:bg-white/[0.08] hover:text-gold-light"
              >
                <span>استكشف النظام</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 📦 SECTION: HOW IT WORKS */}
      <section id="how-it-works" className="relative py-32 bg-[#0F1A2E] border-t border-white/[0.03]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white">كيف يعمل النظام</h2>
            <div className="mt-6 mx-auto h-1 w-20 rounded-full bg-gradient-to-r from-gold/10 via-gold to-gold/10" />
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {[
              { icon: ShoppingCart, title: "إنشاء طلب شراء", desc: "أدخل تفاصيل طلبك بخطوات بسيطة وواضحة" },
              { icon: Settings, title: "متابعة التنفيذ", desc: "تتبع حالة الطلب من التوريد حتى الشحن" },
              { icon: PackageCheck, title: "التسليم النهائي", desc: "استلم شحنتك مع تقارير مالية شاملة" }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="group relative rounded-3xl border border-white/[0.06] bg-[#16243A] p-10 text-center transition-all hover:-translate-y-2 hover:border-gold/30 hover:shadow-[0_20px_40px_-15px_rgba(212,166,58,0.15)]"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0B1220] border border-white/[0.08] text-gold shadow-[inset_0_0_20px_rgba(212,166,58,0.1)] group-hover:scale-110 transition-transform duration-500">
                  <step.icon className="h-10 w-10" />
                </div>
                <h3 className="mt-8 text-2xl font-bold text-white">{step.title}</h3>
                <p className="mt-4 text-slate-400">{step.desc}</p>
                
                {/* Connector line for desktop */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-20 -left-4 w-8 h-[2px] bg-white/[0.05] z-0" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 💎 SECTION: WHY LOUREX */}
      <section className="relative py-32 bg-[#0B1220]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                لماذا تختار <span className="text-gold">Lourex</span>؟
              </h2>
              <div className="mt-12 space-y-6">
                {[
                  "نظام وسيط احترافي",
                  "متابعة دقيقة لكل مرحلة",
                  "انضباط مالي كامل",
                  "سجل أعمال موثوق"
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-5 p-4 rounded-2xl border border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold text-slate-200">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gold/20 blur-[100px] rounded-full" />
              <img 
                src="https://images.unsplash.com/photo-1554774853-719586f82d77?q=80&w=2070&auto=format&fit=crop" 
                alt="Professional Business" 
                className="relative rounded-[2.5rem] border border-white/10 shadow-2xl object-cover h-[500px] w-full mix-blend-luminosity opacity-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 📊 SECTION: DASHBOARD PREVIEW */}
      <section className="relative py-32 bg-[#0F1A2E] overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white">لوحة تحكم واحدة لكل عملياتك</h2>
            <p className="mt-6 text-lg text-slate-400">واجهة مستخدم مصممة لتوفر لك أعلى معايير السهولة والتحكم.</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-6xl"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-gold/30 blur-2xl opacity-50 rounded-[3rem]" />
            <div className="relative rounded-[2.5rem] border border-white/[0.1] bg-[#16243A] p-2 md:p-4 shadow-2xl">
              <div className="rounded-[2rem] overflow-hidden border border-white/[0.05] bg-[#0B1220] aspect-[16/9] relative flex items-center justify-center">
                <LayoutDashboard className="h-32 w-32 text-white/[0.05]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                  <span className="px-6 py-3 rounded-full bg-gold text-background font-bold text-lg shadow-[0_0_30px_rgba(212,166,58,0.4)]">
                    نظرة حية على لوحة القيادة
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 📞 SECTION: CONTACT */}
      <section id="contact" className="relative py-32 bg-[#0B1220]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white">تواصل معنا</h2>
            <p className="mt-6 text-lg text-slate-400">نحن هنا لدعمك في كل خطوة.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Phone, title: "رقم الهاتف", value: "+966 50 000 0000", action: "اتصل بنا", href: "tel:+966500000000" },
              { icon: Mail, title: "البريد الإلكتروني", value: "info@lourex.com", action: "أرسل رسالة", href: "mailto:info@lourex.com" },
              { icon: MapPin, title: "الموقع", value: "الرياض، المملكة العربية السعودية", action: "عرض الخريطة", href: "#" }
            ].map((contact, idx) => (
              <div key={idx} className="group rounded-3xl border border-white/[0.06] bg-[#16243A] p-8 text-center transition-all hover:bg-white/[0.03] hover:border-gold/30">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10 text-gold mb-6 group-hover:scale-110 transition-transform">
                  <contact.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white">{contact.title}</h3>
                <p className="mt-2 text-slate-300 font-medium">{contact.value}</p>
                <a 
                  href={contact.href}
                  className="mt-8 inline-flex h-10 items-center justify-center rounded-xl bg-white/[0.05] px-6 text-sm font-bold text-gold transition-colors hover:bg-gold/15"
                >
                  {contact.action}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🔥 CTA SECTION */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gold" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white drop-shadow-xl">
            ابدأ إدارة عملياتك باحتراف اليوم
          </h2>
          <div className="mt-12">
            <Link
              to="/dashboard"
              className="inline-flex h-16 items-center justify-center rounded-2xl bg-background px-12 text-xl font-bold text-gold shadow-2xl transition-all hover:scale-105 hover:bg-white hover:text-gold-dark"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
