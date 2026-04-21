import { motion } from "framer-motion";
import { Activity, BarChart3, ClipboardList, Receipt, Route, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const DashboardPreview = () => {
  const { lang } = useI18n();

  const panels = [
    {
      icon: ClipboardList,
      label: lang === "ar" ? "طلبات المراجعة" : "Review inbox",
      value: lang === "ar" ? "فرز الطلبات وتحديد الجاهز للتحويل" : "Review requests and mark conversion-ready files",
      color: "text-sky-400",
    },
    {
      icon: Route,
      label: lang === "ar" ? "غرفة الصفقات" : "Deals center",
      value: lang === "ar" ? "ربط الطلب بالعميل والشحنة والمحاسبة" : "Connect the request with customer, shipment, and accounting context",
      color: "text-primary",
    },
    {
      icon: Activity,
      label: lang === "ar" ? "سياق التتبع" : "Tracking context",
      value: lang === "ar" ? "متابعة المرحلة الحالية والمسؤول التالي" : "See the current stage and the next responsible party",
      color: "text-emerald-400",
    },
    {
      icon: Receipt,
      label: lang === "ar" ? "المحاسبة المقفلة" : "Locked accounting",
      value: lang === "ar" ? "قيود عامة أو مرتبطة بالصفقات مع طلب تعديل رسمي" : "Global and deal-linked entries with formal edit requests",
      color: "text-amber-300",
    },
    {
      icon: ShieldCheck,
      label: lang === "ar" ? "الأثر التدقيقي" : "Audit trace",
      value: lang === "ar" ? "من فعل ماذا وعلى أي كيان ومتى" : "Who did what, on which object, and when",
      color: "text-rose-300",
    },
    {
      icon: BarChart3,
      label: lang === "ar" ? "التقارير" : "Reports",
      value: lang === "ar" ? "قراءة تشغيلية على مستوى المنصة والعميل والصفقة" : "Operational reporting at platform, customer, and deal level",
      color: "text-violet-300",
    },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            {lang === "ar" ? "غرفة العمليات" : "Operations Room"}
          </p>
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "هذه ليست لوحة إدارة تقليدية" : "This is not a generic admin dashboard"}
          </h2>
          <p className="mx-auto max-w-3xl leading-8 text-muted-foreground">
            {lang === "ar"
              ? "داخل Lourex تعمل الصفقة كمركز تشغيل حقيقي: يبدأ القرار من الطلب، ويمتد إلى التتبع والمحاسبة والتدقيق والتقارير ضمن بيئة واحدة."
              : "Inside Lourex, the deal becomes the center of execution. Decisions move from request review into tracking, accounting, audit, and reporting within one controlled workspace."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[2.3rem] border border-primary/10 bg-[linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.9))] p-6 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.24)] dark:shadow-[0_28px_70px_-40px_rgba(0,0,0,0.8)] md:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-border/60 bg-secondary/20 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {lang === "ar" ? "سياق القيادة" : "Command Context"}
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold">Lourex Operating System</p>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
              Request → Deal → Tracking → Accounting → Audit
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {panels.map((panel) => (
              <div key={panel.label} className="rounded-[1.6rem] border border-border/50 bg-background/60 p-5">
                <panel.icon className={`h-8 w-8 ${panel.color}`} />
                <h4 className="mt-4 font-serif text-xl font-semibold">{panel.label}</h4>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{panel.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button variant="gold" asChild>
              <Link to="/dashboard">{lang === "ar" ? "فتح غرفة العمليات" : "Open operations room"}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
