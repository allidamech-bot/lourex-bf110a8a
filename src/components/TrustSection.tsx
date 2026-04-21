import { motion } from "framer-motion";
import { FileLock2, Globe, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const TrustSection = () => {
  const { lang } = useI18n();

  const trustMetrics = [
    { value: "11", label: lang === "ar" ? "مرحلة لوجستية رسمية" : "official logistics stages" },
    { value: "2", label: lang === "ar" ? "وكلاء تنفيذ أساسيون" : "core execution partners" },
    { value: "1", label: lang === "ar" ? "سجل تشغيلي موحد" : "unified operations record" },
  ];

  const trustPillars = [
    {
      icon: ShieldCheck,
      title: lang === "ar" ? "تحكم تشغيلي واضح" : "Clear operational control",
      description:
        lang === "ar"
          ? "الطلب لا يضيع بين الرسائل والملاحظات، بل يتحول إلى صفقة لها سياق تنفيذ وتتبع ومسؤوليات محددة."
          : "Requests do not disappear into scattered messages. They become deal records with execution context, tracking, and accountable ownership.",
    },
    {
      icon: FileLock2,
      title: lang === "ar" ? "انضباط مالي مقفل" : "Locked financial discipline",
      description:
        lang === "ar"
          ? "القيود تقفل بعد الإنشاء، وأي تعديل يمر عبر طلب رسمي قابل للمراجعة والتوثيق."
          : "Entries lock after creation, and any correction goes through a formal request that can be reviewed and audited.",
    },
    {
      icon: Globe,
      title: lang === "ar" ? "ثقة عميل قابلة للشرح" : "Customer trust that can be explained",
      description:
        lang === "ar"
          ? "العميل يرى أين وصلت شحنته، والفريق يرى أين وصلت الصفقة، والإدارة ترى أثر كل قرار وتشغيل."
          : "Customers see where the shipment stands, teams see where the deal stands, and supervisors see the impact of every action.",
    },
  ];

  return (
    <section className="bg-background py-28">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="rounded-[2.2rem] border border-primary/10 bg-[linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.9))] p-8 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_60px_-38px_rgba(0,0,0,0.8)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
              {lang === "ar" ? "لماذا يثق العملاء في Lourex" : "Why customers trust Lourex"}
            </p>
            <h2 className="mt-5 font-serif text-3xl font-bold md:text-5xl">
              {lang === "ar" ? "الثقة هنا ناتجة عن النظام لا عن الوعود" : "Trust comes from the system, not from promises"}
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              {lang === "ar"
                ? "Lourex تمنح العميل مسارًا يمكن فهمه، وتمنح فريق التشغيل أدوات يمكن الاعتماد عليها، وتمنح الإدارة رؤية قابلة للتدقيق."
                : "Lourex gives customers a flow they can understand, operators tools they can rely on, and management an audit-ready view of the business."}
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {trustMetrics.map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-border/60 bg-secondary/20 p-4 text-center">
                  <div className="font-serif text-4xl font-bold text-gradient-gold">{item.value}</div>
                  <div className="mt-2 text-xs leading-6 text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {trustPillars.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="flex gap-5 rounded-[2rem] border border-primary/10 bg-primary/5 p-6"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
