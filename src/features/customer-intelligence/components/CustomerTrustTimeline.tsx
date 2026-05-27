import { CheckCircle2, Circle, Clock, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getShipmentStageCopy } from "@/lib/shipmentStages";
import type { TrackingUpdateRecord } from "@/types/lourex";

interface CustomerTrustTimelineProps {
  updates: TrackingUpdateRecord[];
}

export const CustomerTrustTimeline = ({ updates }: CustomerTrustTimelineProps) => {
  const { lang, locale } = useI18n();

  if (!updates.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-800 p-8 text-center">
        <p className="text-sm text-stone-500">
          {lang === "ar" ? "لا توجد تحديثات متاحة بعد." : "No updates available yet."}
        </p>
      </div>
    );
  }

  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedUpdates.map((update, index) => {
        const stageCopy = getShipmentStageCopy(update.stageCode, lang);
        const isLatest = index === 0;

        return (
          <div key={update.id} className="relative flex gap-4">
            {index !== sortedUpdates.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-stone-800" />
            )}

            <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              isLatest ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "bg-stone-900 border border-stone-700"
            }`}>
              {isLatest ? (
                <CheckCircle2 className="h-4 w-4 text-stone-950" />
              ) : (
                <Circle className="h-2 w-2 text-stone-500 fill-current" />
              )}
            </div>

            <div className={`flex-1 rounded-2xl border p-4 transition-all ${
              isLatest ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-stone-800 bg-stone-900/40"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className={`text-sm font-bold uppercase tracking-wider ${
                  isLatest ? "text-amber-200" : "text-stone-300"
                }`}>
                  {stageCopy.label}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-500 uppercase tracking-widest">
                  <Clock className="h-3 w-3" />
                  {new Date(update.occurredAt).toLocaleString(locale)}
                </div>
              </div>

              <p className="text-sm leading-7 text-stone-400">
                {update.customerNote || update.note}
              </p>

              {(update.updatedBy || update.updatedByRole) && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-stone-600 uppercase tracking-widest font-bold">
                  <User className="h-3 w-3" />
                  <span>
                    {update.updatedByRole ? `${update.updatedByRole}` : update.updatedBy}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
