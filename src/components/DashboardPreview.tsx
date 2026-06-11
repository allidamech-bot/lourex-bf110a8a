import { motion } from "framer-motion";
import { Activity, ClipboardList, LockKeyhole, Receipt, Route, ShieldCheck, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const DashboardPreview = () => {
  const { lang, t } = useI18n();
  const isArabic = lang === "ar";

  const queues = [
    {
      label: isArabic ? "طلبات تحتاج مراجعة" : "Requests need review",
      value: isArabic ? "ملف طلب + صور + مواصفات" : "Request file + images + specs",
      icon: ClipboardList,
    },
    {
      label: isArabic ? "صفقات قيد التنفيذ" : "Deals in execution",
      value: isArabic ? "مسؤوليات الشركاء محددة" : "Partner responsibilities assigned",
      icon: Users2,
    },
    {
      label: isArabic ? "شحنات في المسار" : "Shipments on path",
      value: isArabic ? "مرحلة حالية ومسؤول تالي" : "Current stage and next owner",
      icon: Route,
    },
  ];

  const commandRows = [
    {
      label: isArabic ? "طلب شراء" : "Purchase request",
      status: isArabic ? "جاهز للتحويل" : "Ready to convert",
      owner: isArabic ? "فريق العمليات" : "Operations team",
    },
    {
      label: isArabic ? "صفقة تشغيلية" : "Operational deal",
      status: isArabic ? "قيد التوريد" : "Sourcing active",
      owner: isArabic ? "الشريك التركي" : "Turkish partner",
    },
    {
      label: isArabic ? "تخليص الوجهة" : "Destination clearance",
      status: isArabic ? "يتطلب تحديث" : "Update required",
      owner: isArabic ? "الشريك السعودي" : "Saudi partner",
    },
  ];

  const auditItems = [
    isArabic ? "قيد مالي مقفل" : "Locked financial entry",
    isArabic ? "طلب تعديل رسمي" : "Formal edit request",
    isArabic ? "أثر تدقيقي محفوظ" : "Audit trail preserved",
  ];

  return (
    <section className="relative overflow-hidden bg-stone-950 py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(214,160,74,0.10),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(245,245,244,0.04),transparent_28%)]" />
      <div className="container relative mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end"
        >
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
              {isArabic ? "غرفة العمليات" : "Operations room"}
            </p>
            <h2 className="font-serif text-3xl font-bold text-stone-100 md:text-5xl">
              {isArabic ? "لوحة قرار مبنية حول الصفقة، لا حول الأرقام فقط" : "A decision room built around the deal, not just numbers"}
            </h2>
          </div>
          <p className="max-w-3xl leading-8 text-stone-300">
            {isArabic
              ? "داخل Lourex لا ترى بطاقات منفصلة؛ ترى حالة الطلب، مسؤولية الشريك، مرحلة الشحنة، القيد المالي، والأثر التدقيقي في سياق واحد قابل للتنفيذ."
              : "Inside Lourex you do not see isolated cards; request state, partner ownership, shipment stage, financial lock, and audit memory stay in one executable context."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[2.25rem] border border-stone-200/10 bg-stone-900/55 p-4 shadow-2xl shadow-stone-950/40 md:p-6"
        >
          <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
            <aside className="rounded-[1.75rem] border border-stone-200/10 bg-stone-950/50 p-5">
              <div className="flex items-center justify-between gap-4 border-b border-stone-200/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                    {t("commandCenter.commandContext")}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">
                    {isArabic ? "مركز تشغيل Lourex" : "Lourex command center"}
                  </h3>
                </div>
                <Activity className="h-6 w-6 text-amber-300" />
              </div>

              <div className="mt-5 grid gap-3">
                {queues.map((item, index) => (
                  <div key={item.label} className="rounded-2xl border border-stone-200/10 bg-stone-900/65 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-100">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-400">{item.value}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-800">
                      <div className="h-full rounded-full bg-amber-300/70" style={{ width: `${72 - index * 12}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-stone-200/10 bg-stone-950/45 p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-amber-300/90">
                      {isArabic ? "سلسلة التنفيذ" : "Execution chain"}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-100">
                      Request → Deal → Tracking → Finance → Audit
                    </h3>
                  </div>
                  <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-100">
                    {isArabic ? "سياق واحد" : "One context"}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {commandRows.map((row, index) => (
                    <div key={row.label} className="rounded-2xl border border-stone-200/10 bg-stone-900/55 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-xs font-bold text-stone-950">
                          {index + 1}
                        </span>
                        <span className="rounded-full bg-stone-950/70 px-2.5 py-1 text-[11px] text-stone-300">
                          {row.owner}
                        </span>
                      </div>
                      <p className="font-serif text-lg font-semibold text-stone-100">{row.label}</p>
                      <p className="mt-2 text-sm leading-6 text-stone-400">{row.status}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1.75rem] border border-stone-200/10 bg-stone-950/45 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-serif text-xl font-semibold text-stone-100">
                        {isArabic ? "المالية تحت السيطرة" : "Finance under control"}
                      </p>
                      <p className="text-sm text-stone-400">
                        {isArabic ? "لا تعديل مباشر بعد القفل" : "No direct edits after lock"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-2xl border border-stone-200/10 bg-stone-900/55 p-4 text-sm text-stone-300">
                    <LockKeyhole className="h-4 w-4 text-amber-300" />
                    {isArabic ? "كل تصحيح يمر بطلب تعديل قابل للمراجعة." : "Every correction moves through a reviewable edit request."}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-stone-200/10 bg-stone-950/45 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <p className="font-serif text-xl font-semibold text-stone-100">
                      {isArabic ? "ذاكرة تدقيق لا تختفي" : "Audit memory that does not disappear"}
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {auditItems.map((item) => (
                      <span key={item} className="rounded-full border border-stone-200/10 bg-stone-900/60 px-3 py-1.5 text-xs text-stone-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button variant="default" className="bg-amber-300 text-stone-950 hover:bg-amber-200" asChild>
              <Link to="/dashboard">{isArabic ? "فتح غرفة العمليات" : "Open operations room"}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
