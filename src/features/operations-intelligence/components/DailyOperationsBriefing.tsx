import { BookOpen, StickyNote, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";

interface BriefingStats {
  activeShipments: number;
  delayedOps: number;
  pendingReviews: number;
  settlementAlerts: number;
}

interface DailyOperationsBriefingProps {
  stats: BriefingStats;
  executiveNotes?: string[];
  executiveNotesAr?: string[];
}

export const DailyOperationsBriefing = ({
  stats,
  executiveNotes = [
    "Increase partner follow-ups for Turkey shipments.",
    "Monitor customs clearance for SAR-based deliveries.",
    "Ensure all financial entries are locked by end of week."
  ],
  executiveNotesAr = [
    "زيادة المتابعة مع الشركاء لشحنات تركيا.",
    "مراقبة التخليص الجمركي للتسليمات داخل السعودية.",
    "التأكد من قفل جميع القيود المالية بنهاية الأسبوع."
  ],
}: DailyOperationsBriefingProps) => {
  const { lang, locale } = useI18n();

  return (
    <BentoCard className="space-y-6 border-amber-200/10 bg-stone-900/50 shadow-2xl h-full">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <h3 className="font-serif text-xl font-bold text-stone-100">
            {lang === "ar" ? "الموجز التشغيلي اليومي" : "Daily Operations Briefing"}
          </h3>
        </div>
        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
          {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-amber-500/15 bg-amber-500/5 p-5">
        <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest mb-4">
          {lang === "ar" ? "ملخص اليوم" : "Today's Summary"}
        </p>
        <ul className="space-y-3">
          {[
            { label: lang === "ar" ? "شحنات نشطة" : "active shipments", val: stats.activeShipments },
            { label: lang === "ar" ? "عمليات متأخرة" : "delayed operations", val: stats.delayedOps },
            { label: lang === "ar" ? "طلبات بانتظار المراجعة" : "requests awaiting review", val: stats.pendingReviews },
            { label: lang === "ar" ? "تنبيهات تسوية" : "settlements requiring attention", val: stats.settlementAlerts },
          ].map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-stone-300 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{item.val} {item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="h-4 w-4 text-stone-400" />
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
            {lang === "ar" ? "ملاحظات تنفيذية" : "Executive Notes"}
          </p>
        </div>
        <div className="space-y-3">
          {(lang === "ar" ? executiveNotesAr : executiveNotes).map((note, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-xl bg-stone-950/30 p-3 border border-stone-800/50">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-stone-600 mt-0.5" />
              <p className="text-xs leading-5 text-stone-400 font-medium">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </BentoCard>
  );
};
