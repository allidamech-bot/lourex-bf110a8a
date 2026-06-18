import { PackageCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { SupplierPackingListSummary } from "@/domain/logistics/supplierPackingLists";

interface SupplierPackingListSummaryCardProps {
  packingList: SupplierPackingListSummary | null;
  loading?: boolean;
}

export const SupplierPackingListSummaryCard = ({
   packingList,
   loading = false,
 }: SupplierPackingListSummaryCardProps) => {
   const { t } = useI18n();

  if (loading) {
    return (
      <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-4 w-4 bg-stone-700 rounded" />
          <div className="h-5 w-32 bg-stone-700 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-12 bg-stone-700 rounded" />
          <div className="h-12 bg-stone-700 rounded" />
          <div className="h-12 bg-stone-700 rounded" />
        </div>
      </div>
    );
  }

  if (!packingList) {
    return (
      <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <PackageCheck className="h-4 w-4 text-stone-500" />
          <p className="font-medium text-stone-100">{t("supplierPacking.title")}</p>
        </div>
        <p className="text-sm text-stone-500">
          {t("supplierPacking.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-emerald-500/10 bg-stone-900/50 p-4">
      <div className="flex items-center gap-3 mb-4">
        <PackageCheck className="h-4 w-4 text-emerald-400" />
        <p className="font-medium text-stone-100">{t("supplierPacking.title")}</p>
      </div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
         <div className="rounded-lg border border-emerald-500/10 bg-stone-950/60 p-3">
           <p className="text-[10px] uppercase tracking-widest text-stone-600">
             {t("supplierPacking.cbm")}
           </p>
           <p className="mt-1 font-mono text-sm text-emerald-300">
             {packingList.totalCbm.toFixed(2)}
           </p>
         </div>
         <div className="rounded-lg border border-amber-500/10 bg-stone-950/60 p-3">
           <p className="text-[10px] uppercase tracking-widest text-stone-600">
             {t("supplierPacking.kg")}
           </p>
           <p className="mt-1 font-mono text-sm text-amber-300">
             {packingList.totalWeightKg.toFixed(2)}
           </p>
         </div>
         <div className="rounded-lg border border-stone-700/10 bg-stone-950/60 p-3">
           <p className="text-[10px] uppercase tracking-widest text-stone-600">
             {t("supplierPacking.status")}
           </p>
           <p className="mt-1 font-mono text-sm text-stone-300">
             {packingList.status}
           </p>
         </div>
       </div>

<div className="border-t border-amber-200/10 pt-3">
         <div className="flex items-center justify-between text-xs">
           <span className="text-stone-600 min-w-0">
             {t("supplierPacking.submittedBy")}:{" "}
             <span className="text-stone-400 break-words">{packingList.submittedByRole}</span>
           </span>
<span className="text-stone-600">
              {packingList.createdAt
                ? new Date(packingList.createdAt).toLocaleDateString(undefined)
                : "—"}
            </span>
         </div>
       </div>
    </div>
  );
};