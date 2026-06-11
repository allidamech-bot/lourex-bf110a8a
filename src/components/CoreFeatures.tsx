import { motion } from "framer-motion";
import { BarChart3, FileLock2, ScanSearch, ShieldCheck, Truck, Users2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CoreFeatures = () => {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  const features = [
    {
      icon: ScanSearch,
      title: isArabic ? "استقبال طلبات قابل للتنفيذ" : "Execution-ready intake",
      desc: isArabic
        ? "الطلب لا يبقى رسالة مفتوحة. الصور والمواصفات والبيانات تدخل كملف عملية قابل للمراجعة والتحويل."
        : "Requests do not remain open-ended messages. Images, specs, and data become a reviewable operational file.",
      proof: isArabic ? "صور + مواصفات + حالة مراجعة" : "Images + specs + review status",
    },
    {
      icon: Users2,
      title: isArabic ? "مسؤوليات حسب الدور" : "Role-based responsibility",
      desc: isArabic
        ? "المالك، العمليات، الشريك التركي، الشريك السعودي، والعميل يعملون من مساحات مختلفة لا من نفس الشاشة."
        : "Owner, operations, Turkish partner, Saudi partner, and customer work from separate responsibility surfaces.",
      proof: isArabic ? "صلاحيات ومسارات منفصلة" : "Separate permissions and flows",
    },
    {
      icon: Truck,
      title: isArabic ? "تتبع مرتبط بالعملية" : "Operation-linked tracking",
      desc: isArabic
        ? "التتبع ليس رقم شحنة فقط؛ هو جزء من الصفقة ومرتبط بالمرحلة والمسؤول والطرف المتابع."
        : "Tracking is not just a shipment number; it is tied to the deal, stage, owner, and visible party.",
      proof: isArabic ? "11 مرحلة رسمية" : "11 official stages",
    },
    {
      icon: FileLock2,
      title: isArabic ? "محاسبة لا تقبل العبث" : "Tamper-resistant accounting",
      desc: isArabic
        ? "القيود المالية تُقفل بعد الإنشاء، وأي تعديل يتحول إلى طلب رسمي قابل للمراجعة."
        : "Financial entries lock after creation, and every correction becomes a formal reviewable request.",
      proof: isArabic ? "قيد مقفل + طلب تعديل" : "Locked entry + edit request",
    },
    {
      icon: ShieldCheck,
      title: isArabic ? "سجل تدقيق فعلي" : "Real audit memory",
      desc: isArabic
        ? "القرارات والحالات والتعديلات لا تختفي داخل محادثات؛ تبقى كسجل تشغيلي يمكن الرجوع إليه."
        : "Decisions, statuses, and corrections do not disappear into chats; they remain in an operational audit record.",
      proof: isArabic ? "سجل أحداث وقرارات" : "Events and decision trail",
    },
    {
      icon: BarChart3,
      title: isArabic ? "تقارير تفهم الصفقة" : "Deal-aware reporting",
      desc: isArabic
        ? "التقارير لا تعرض أرقاماً عامة فقط، بل تربط العميل والصفقة والشريك والحالة التشغيلية."
        : "Reporting does not show generic numbers only; it connects customer, deal, partner, and operational status.",
      proof: isArabic ? "منصة + عميل + صفقة" : "Platform + customer + deal",
    },
  ];

  return (
    <section className="relative overflow-hidden border-y border-stone-200/10 bg-[linear-gradient(180deg,rgba(12,10,9,1),rgba(28,25,23,0.88),rgba(12,10,9,1))] py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(214,160,74,0.08),transparent_30%),radial-gradient(circle_at_76%_78%,rgba(245,245,244,0.035),transparent_24%)]" />
      <div className="container relative mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"
        >
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
              {isArabic ? "قدرات تشغيلية" : "Operational capabilities"}
            </p>
            <h2 className="font-serif text-3xl font-bold text-stone-100 md:text-5xl">
              {isArabic ? "ما يجعل Lourex نظام تشغيل، لا واجهة عرض" : "What makes Lourex an operating system, not a showcase"}
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-stone-300">
            {isArabic
              ? "القيمة ليست في شكل البطاقات، بل في ربط الطلبات والصفقات والشحن والمحاسبة والتدقيق داخل دورة واحدة يمكن إدارتها ومراجعتها."
              : "The value is not the cards themselves; it is the connection between requests, deals, shipping, accounting, and audit inside one manageable cycle."}
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="group flex min-h-[18rem] flex-col justify-between rounded-[1.75rem] border border-stone-200/10 bg-stone-950/45 p-6 shadow-xl shadow-stone-950/25 transition hover:-translate-y-1 hover:border-amber-300/20 hover:bg-stone-900/65"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-300">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-stone-200/10 bg-stone-950/65 px-3 py-1 text-xs text-stone-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-2xl font-semibold text-stone-100 group-hover:text-amber-100">{feature.title}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{feature.desc}</p>
              </div>
              <p className="mt-6 inline-flex w-fit rounded-full bg-amber-300/10 px-3 py-1.5 text-xs text-amber-100">
                {feature.proof}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreFeatures;
