import { CreditCard, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface FinancialVisibilityLayerProps {
  paidAmount: number;
  remainingAmount: number;
  totalAmount: number;
  currency: string;
  paymentProofStatus?: "pending" | "accepted" | "rejected" | null;
  completionState?: string;
}

export const FinancialVisibilityLayer = ({
  paidAmount,
  remainingAmount,
  totalAmount,
  currency,
  paymentProofStatus,
  completionState,
}: FinancialVisibilityLayerProps) => {
  const { lang, locale } = useI18n();

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
      style: "currency",
      currency: currency || "SAR",
    }).format(amount);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-4">
          <div className="flex items-center gap-2 text-stone-500 mb-2">
            <Wallet className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{lang === "ar" ? "الإجمالي" : "Total Amount"}</span>
          </div>
          <p className="text-lg font-bold text-stone-100">{formatMoney(totalAmount)}</p>
        </div>

        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-4">
          <div className="flex items-center gap-2 text-stone-500 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{lang === "ar" ? "المدفوع" : "Paid Amount"}</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{formatMoney(paidAmount)}</p>
        </div>

        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-4">
          <div className="flex items-center gap-2 text-stone-500 mb-2">
            <CreditCard className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{lang === "ar" ? "المتبقي" : "Remaining"}</span>
          </div>
          <p className="text-lg font-bold text-amber-200">{formatMoney(remainingAmount)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-stone-200 uppercase tracking-wide">
                {lang === "ar" ? "حالة الدفع" : "Payment Visibility"}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {lang === "ar" ? "رؤية حصرية لبياناتك المالية المسجلة." : "Exclusive view of your recorded financial data."}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {paymentProofStatus && (
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                paymentProofStatus === "accepted" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
                paymentProofStatus === "rejected" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" :
                "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}>
                {lang === "ar" ? `إثبات: ${paymentProofStatus}` : `Proof: ${paymentProofStatus}`}
              </span>
            )}

            {completionState && (
              <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-700 bg-stone-800 text-stone-400">
                {completionState}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
