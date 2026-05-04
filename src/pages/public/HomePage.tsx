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
    <div className="min-h-screen bg-[#0B1220] selection:bg-blue-500/30 selection:text-blue-200" dir={isRtl ? "rtl" : "ltr"}>
      <SEO title="Lourex | إدارة الاستيراد والوساطة" description="من طلب الشراء إلى التسليم النهائي — تحكم كامل بكل خطوة." />
      
      <SiteHeader />

      {/* 🚀 HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0B1220]">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/95 via-[#0B1220]/80 to-[#0B1220] z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15)_0%,transparent_60%)] z-10" />
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&auto=format&fit=crop" 
            alt="Logistics Port" 
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
        </div>

        {/* Accent Lines */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent z-20" />
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent z-20" />

        <div className="container relative z-20 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-4xl"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#F8FAFC] tracking-tight leading-[1.2]">
              إدارة الاستيراد والوساطة… <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 drop-shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                بمنظومة واحدة ذكية.
              </span>
            </h1>
            
            <p className="mt-8 text-xl md:text-2xl text-[#94A3B8] font-medium">
              من طلب الشراء إلى التسليم النهائي — تحكم كامل بكل خطوة.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/dashboard"
                className="group relative flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 text-lg font-bold text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_0_35px_rgba(37,99,235,0.6)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">ابدأ الآن</span>
                <ArrowLeft className="relative z-10 h-5 w-5 transition-transform group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/#how-it-works"
                className="group flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-2xl border border-[#1E293B] bg-[#121A2B]/80 px-8 text-lg font-bold text-[#F8FAFC] backdrop-blur-md transition-all hover:border-blue-500/50 hover:bg-[#1E293B] hover:text-blue-400"
              >
                <span>استكشف النظام</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 📦 SECTION: HOW IT WORKS */}
      <section id="how-it-works" className="relative py-32 bg-[#0B1220] border-t border-[#1E293B]/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-[#F8FAFC]">كيف يعمل النظام</h2>
            <div className="mt-6 mx-auto h-1 w-20 rounded-full bg-gradient-to-r from-blue-500/10 via-blue-500 to-blue-500/10" />
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
                className="group relative rounded-3xl border border-[#1E293B] bg-[#121A2B] p-10 text-center transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.2)]"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0B1220] border border-[#1E293B] text-blue-500 shadow-[inset_0_0_20px_rgba(37,99,235,0.1)] group-hover:scale-110 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all duration-500">
                  <step.icon className="h-10 w-10" />
                </div>
                <h3 className="mt-8 text-2xl font-bold text-[#F8FAFC]">{step.title}</h3>
                <p className="mt-4 text-[#94A3B8]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 💎 SECTION: WHY LOUREX */}
      <section className="relative py-32 bg-[#0F172A]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#1E293B] to-transparent" />
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#F8FAFC] leading-tight">
                لماذا تختار <span className="text-blue-500">Lourex</span>؟
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
                    className="flex items-center gap-5 p-4 rounded-2xl border border-[#1E293B] bg-[#121A2B] hover:border-blue-500/30 hover:bg-[#1E293B]/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold text-[#F8FAFC]">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full" />
              <img 
                src="https://images.unsplash.com/photo-1554774853-719586f82d77?q=80&w=2070&auto=format&fit=crop" 
                alt="Professional Business" 
                className="relative rounded-[2.5rem] border border-[#1E293B] shadow-[0_0_50px_rgba(37,99,235,0.15)] object-cover h-[500px] w-full mix-blend-luminosity opacity-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 📊 SECTION: DASHBOARD PREVIEW */}
      <section className="relative py-32 bg-[#0B1220] overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#F8FAFC]">لوحة تحكم واحدة لكل عملياتك</h2>
            <p className="mt-6 text-lg text-[#94A3B8]">واجهة مستخدم مصممة لتوفر لك أعلى معايير السهولة والتحكم.</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-6xl"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/40 to-blue-400/40 blur-3xl opacity-50 rounded-[3rem]" />
            <div className="relative rounded-[2.5rem] border border-[#1E293B] bg-[#121A2B] p-2 md:p-4 shadow-2xl">
              <div className="rounded-[2rem] overflow-hidden border border-[#1E293B] bg-[#0B1220] aspect-[16/9] relative flex items-center justify-center group">
                <LayoutDashboard className="h-32 w-32 text-blue-500/10 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-blue-400/30 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                    نظرة حية على لوحة القيادة
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 📞 SECTION: CONTACT */}
      <section id="contact" className="relative py-32 bg-[#0F172A]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#1E293B] to-transparent" />
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-[#F8FAFC]">تواصل معنا</h2>
            <p className="mt-6 text-lg text-[#94A3B8]">نحن هنا لدعمك في كل خطوة.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Phone, title: "رقم الهاتف", value: "+966 50 000 0000", action: "اتصل بنا", href: "tel:+966500000000" },
              { icon: Mail, title: "البريد الإلكتروني", value: "info@lourex.com", action: "أرسل رسالة", href: "mailto:info@lourex.com" },
              { icon: MapPin, title: "الموقع", value: "الرياض، المملكة العربية السعودية", action: "عرض الخريطة", href: "#" }
            ].map((contact, idx) => (
              <div key={idx} className="group rounded-3xl border border-[#1E293B] bg-[#121A2B] p-8 text-center transition-all hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-[0_15px_30px_-10px_rgba(37,99,235,0.15)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0B1220] border border-[#1E293B] text-blue-500 mb-6 group-hover:scale-110 group-hover:border-blue-500/30 transition-all duration-300">
                  <contact.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">{contact.title}</h3>
                <p className="mt-2 text-[#94A3B8] font-medium">{contact.value}</p>
                <a 
                  href={contact.href}
                  className="mt-8 inline-flex h-10 items-center justify-center rounded-xl bg-[#1E293B] px-6 text-sm font-bold text-[#F8FAFC] transition-colors hover:bg-blue-600 hover:text-white"
                >
                  {contact.action}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🔥 CTA SECTION */}
      <section className="relative py-40 overflow-hidden bg-[#0B1220]">
        <div className="absolute inset-0 bg-blue-600/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.2)_0%,transparent_70%)]" />
        
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-[#F8FAFC] tracking-tight">
            ابدأ إدارة عملياتك باحتراف اليوم
          </h2>
          <div className="mt-12 flex justify-center">
            <Link
              to="/dashboard"
              className="group relative inline-flex h-16 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 px-12 text-xl font-bold text-white shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <span className="relative z-10">ابدأ الآن</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
