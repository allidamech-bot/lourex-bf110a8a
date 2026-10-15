import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCommercialQuotePdf } from "@/features/commercial-quotes/services/commercialQuotePdf";
import type { CommercialQuoteDraft } from "@/features/commercial-quotes/services/commercialQuoteDraftService";
import type { CustomerQuotation } from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";

type Quote = CommercialQuoteDraft | CustomerQuotation;
const label = (ar: boolean, arText: string, enText: string) => ar ? arText : enText;
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const grandTotal = (quote: Quote) => {
  if (quote.items.some(i => i.unitPrice === null || !Number.isFinite(Number(i.unitPrice)))) return null;
  return quote.items.map(i => i.quantity * Number(i.unitPrice)).reduce((sum, amount) => sum + amount, 0)
    + quote.shippingCost - quote.discountAmount;
};

/** Downloadable PDF and accessible browser Print/Save as PDF use Arabic-capable rendering. */
export function CommercialQuotationDocument({ quote, lang }: { quote: Quote; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const [pdfError,setPdfError]=useState("");
  const total = grandTotal(quote);
  const issuedDate = quote.issuedAt || quote.approvedAt || null;
  return (
    <>
      <div className="my-4 flex min-w-0 flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md break-words text-xs leading-5 text-stone-400">
          {label(ar,"مستند رسمي قابل للتنزيل والطباعة.","Official quotation available to download or print.")}
        </p>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button type="button" onClick={() => {
            setPdfError("");
            void downloadCommercialQuotePdf(quote,lang).catch(error =>
              setPdfError(error instanceof Error?error.message:"PDF export failed"));
          }} className="min-h-11 w-full justify-center gap-2 rounded-xl bg-amber-400 font-semibold text-stone-950 hover:bg-amber-300 sm:w-auto">
            <Download className="h-4 w-4"/>{label(ar,"تنزيل PDF","Download PDF")}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()} className="min-h-11 w-full justify-center gap-2 rounded-xl border-amber-200/20 bg-stone-900/70 text-stone-100 sm:w-auto">
            <Printer className="h-4 w-4" />{label(ar,"طباعة / حفظ PDF","Print / Save PDF")}
          </Button>
        </div>
      </div>
      {pdfError&&<p role="alert" className="print:hidden text-sm text-destructive">{pdfError}</p>}
      <section className="quote-document-printable min-w-0 overflow-hidden rounded-2xl border border-amber-700/25 bg-white p-4 text-slate-900 shadow-lg sm:p-8" dir={ar ? "rtl" : "ltr"} data-testid="quotation-print-document">
        <header className="flex min-w-0 flex-col gap-5 border-b-2 border-amber-600 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-3xl font-black tracking-widest text-slate-950">LOUREX</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-amber-700">International Trading & Resources</p>
            <h3 className="mt-5 text-xl font-bold">{label(ar,"عرض سعر تجاري","COMMERCIAL QUOTATION")}</h3>
          </div>
          <div className="min-w-0 break-words text-start text-xs leading-6 sm:text-end">
            <p className="font-semibold">{quote.number}</p>
            <p>{label(ar,"رقم طلب العميل","Customer RFQ")}: {quote.requestId.slice(0,8)}</p>
            {issuedDate && <p>{label(ar,"تاريخ الإصدار","Issue date")}: {new Date(issuedDate).toLocaleDateString(ar ? "ar" : "en-GB")}</p>}
            <p>www.lou-rex.com</p>
            <p>lourrex@proton.me</p>
            <p>+90 539 241 1642</p>
            <p>CR: 62800 · Homs, Syria</p>
          </div>
        </header>
        <div className="mt-5 grid gap-3 print:hidden sm:hidden" aria-label={label(ar,"أصناف عرض السعر","Quotation items")}>
          {quote.items.map(i => (
            <article key={i.lineNumber} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{label(ar,"الصنف","Item")} {i.lineNumber}</p>
                  <h4 className="mt-1 break-words text-sm font-bold leading-6 text-slate-900">{i.name}</h4>
                </div>
                <span className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white">{i.quantity} {i.unit}</span>
              </div>
              {i.specifications && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{i.specifications}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500">{label(ar,"سعر الوحدة","Unit price")}</dt>
                  <dd className="mt-1 break-all text-xs font-semibold tabular-nums text-slate-800">{i.unitPrice === null ? "—" : money(Number(i.unitPrice),quote.currency)}</dd>
                </div>
                <div className="min-w-0 text-end">
                  <dt className="text-[11px] text-slate-500">{label(ar,"إجمالي الصنف","Line total")}</dt>
                  <dd className="mt-1 break-all text-xs font-bold tabular-nums text-slate-900">{i.unitPrice === null ? "—" : money(i.quantity * Number(i.unitPrice),quote.currency)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-6 hidden overflow-x-auto sm:block print:block">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead><tr className="bg-slate-900 text-white">
              <th className="px-3 py-3 text-start">#</th>
              <th className="px-3 py-3 text-start">{label(ar,"المنتج والمواصفات","Product / Specifications")}</th>
              <th className="px-3 py-3 text-end">{label(ar,"الكمية","Qty")}</th>
              <th className="px-3 py-3 text-end">{label(ar,"سعر الوحدة","Unit price")}</th>
              <th className="px-3 py-3 text-end">{label(ar,"الإجمالي","Amount")}</th>
            </tr></thead>
            <tbody>{quote.items.map(i => (
              <tr key={i.lineNumber} className="border-b border-slate-200 align-top">
                <td className="px-3 py-3">{i.lineNumber}</td>
                <td className="px-3 py-3"><strong>{i.name}</strong>
                  {i.specifications && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{i.specifications}</p>}
                </td>
                <td className="px-3 py-3 text-end">{i.quantity} {i.unit}</td>
                <td className="px-3 py-3 text-end">{i.unitPrice === null ? "—" : money(Number(i.unitPrice),quote.currency)}</td>
                <td className="px-3 py-3 text-end">{i.unitPrice === null ? "—" : money(i.quantity * Number(i.unitPrice),quote.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="mt-5 ms-auto w-full min-w-0 max-w-sm space-y-2 border-t border-slate-300 pt-3 text-sm">
          <p className="flex justify-between"><span>{label(ar,"الشحن","Shipping")}</span><strong>{money(quote.shippingCost,quote.currency)}</strong></p>
          <p className="flex justify-between"><span>{label(ar,"الخصم","Discount")}</span><strong>{money(quote.discountAmount,quote.currency)}</strong></p>
          <p className="flex flex-wrap justify-between gap-2 border-t-2 border-amber-600 pt-3 text-base font-bold sm:text-lg">
            <span>{label(ar,"الإجمالي","Total")}</span><strong>{total === null ? "—" : money(total,quote.currency)}</strong>
          </p>
        </div>
        <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
          <p><strong>{label(ar,"شروط الدفع","Payment terms")}:</strong> {quote.paymentTerms}</p>
          <p><strong>{label(ar,"شروط التسليم","Delivery terms")}:</strong> {quote.deliveryTerms}</p>
          <p><strong>Incoterm:</strong> {quote.incoterm || "—"}</p>
          <p><strong>{label(ar,"مدة التوريد","Lead time")}:</strong> {quote.leadTime || "—"}</p>
          <p><strong>{label(ar,"صلاحية العرض","Validity")}:</strong> {quote.validityDays} {label(ar,"يوم","days")}</p>
        </div>
        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
          {label(ar,
            "هذا عرض تجاري صادر عن LOUREX. تخضع الأسعار والكميات للشروط التجارية الواردة في المستند، ولا يعد قبوله إثباتًا لدفع المبالغ.",
            "This commercial quotation is issued by LOUREX, subject to the trade terms herein. Acceptance does not constitute evidence of payment.")}
        </footer>
      </section>
      <style>{`@media print {
        @page { size:A4; margin:12mm; }
        body, html { background:white!important; }
        body * { visibility:hidden!important; }
        .quote-document-printable, .quote-document-printable * { visibility:visible!important; }
        .quote-document-printable { position:absolute!important;top:0!important;left:0!important;
          right:0!important;width:100%!important; margin:0!important;padding:10mm!important;
          box-shadow:none!important;border:0!important;background:#fff!important;color:#0f172a!important; }
        .quote-document-printable table { width:100%!important; }
        .quote-document-printable tr { break-inside:avoid; }
        button { display:none!important; }
      }`}</style>
    </>
  );
}
