import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, PackageCheck } from "lucide-react";
import { fetchSmartRfqItems, type SmartRfqStoredItem } from "@/features/smart-rfq/smartRfqService";

/** Customer-safe snapshots: display submitted values, never infer live catalogue prices. */
export function SmartRfqItems({ requestId, requestNumber, lang }: { requestId: string; requestNumber?: string; lang: "ar" | "en" }) {
  const [result, setResult] = useState<{ requestId: string; items: SmartRfqStoredItem[]; error: boolean } | null>(null);
  const isSmartRfq = Boolean(requestNumber?.startsWith("RFQ-"));
  const ar = lang === "ar";

  useEffect(() => {
    let active = true;
    setResult(null);
    if (isSmartRfq) {
      void fetchSmartRfqItems(requestId)
        .then(items => { if (active) setResult({ requestId, items, error: false }); })
        .catch(() => { if (active) setResult({ requestId, items: [], error: true }); });
    }
    return () => { active = false; };
  }, [requestId, isSmartRfq]);

  if (!isSmartRfq) return null;
  if (!result || result.requestId !== requestId) {
    return <p role="status" className="rounded-2xl border border-amber-200/10 bg-stone-900/60 p-4 text-sm text-stone-300">
      {ar ? "جارٍ تحميل أصناف الطلب…" : "Loading requested products…"}
    </p>;
  }
  if (result.error || result.items.length === 0) {
    return <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
      {ar ? "تعذّر تحميل أصناف طلب عرض السعر. الطلب محفوظ، لكن يجب مراجعة تفاصيله مع فريق LOUREX." : "Unable to display RFQ line items. The request is saved; verify its details with LOUREX."}
    </p>;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-amber-200/15 bg-gradient-to-b from-stone-900/90 to-stone-950/90 p-4 sm:p-6" aria-label={ar ? "أصناف طلب عرض السعر" : "Quotation request lines"} dir={ar ? "rtl" : "ltr"}>
      <header className="mb-5 flex min-w-0 items-center gap-3 border-b border-amber-200/10 pb-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
          <PackageCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400">LOUREX / SMART RFQ</p>
          <h3 className="mt-1 break-words text-lg font-bold leading-6 text-stone-50">
            {ar ? "المنتجات المطلوبة" : "Requested products"}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold tabular-nums text-amber-200">
          {result.items.length.toLocaleString(ar ? "ar" : "en")}
        </span>
      </header>

      <div className="grid min-w-0 gap-3">
        {result.items.map((item, index) => (
          <article key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-stone-800/50 p-3.5 sm:p-5">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              {item.imageUrlSnapshot && /^https?:\/\//i.test(item.imageUrlSnapshot) ? (
                <img src={item.imageUrlSnapshot} alt={item.productName} className="h-16 w-16 shrink-0 rounded-xl border border-white/10 bg-white object-contain p-1 sm:h-20 sm:w-20" loading="lazy" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-stone-900 font-mono text-sm font-semibold text-amber-200" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-medium text-stone-400">{ar ? "المنتج" : "Product"} {index + 1}</p>
                <h4 className="break-words text-base font-bold leading-6 text-stone-100">
                  {item.productSlug ? (
                    <Link className="inline-flex max-w-full items-center gap-1 break-words text-stone-100 underline-offset-4 hover:text-amber-300 hover:underline" to={"/products/" + encodeURIComponent(item.productSlug)}>
                      {item.productName}<ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                    </Link>
                  ) : item.productName}
                </h4>
                <p className="mt-2 inline-flex max-w-full flex-wrap items-baseline gap-1.5 rounded-lg border border-amber-400/15 bg-amber-500/10 px-3 py-1.5 text-sm text-stone-200">
                  <span className="text-xs text-stone-300">{ar ? "الكمية المطلوبة" : "Requested quantity"}</span>
                  <strong className="font-semibold tabular-nums text-amber-100">{item.quantity.toLocaleString(ar ? "ar" : "en")}</strong>
                  <span className="break-words text-xs">{item.unit}</span>
                </p>
              </div>
            </div>
            {(item.moqSnapshot || item.packagingSnapshot || item.originSnapshot) && (
              <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-white/10 pt-3 min-[390px]:grid-cols-2">
                {item.moqSnapshot && (
                  <div className="min-w-0 rounded-lg bg-stone-950/50 px-3 py-2">
                    <dt className="text-[11px] text-stone-400">{ar ? "الحد الأدنى وقت الطلب" : "MOQ at request"}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-stone-200">{item.moqSnapshot}</dd>
                  </div>
                )}
                {item.packagingSnapshot && (
                  <div className="min-w-0 rounded-lg bg-stone-950/50 px-3 py-2">
                    <dt className="text-[11px] text-stone-400">{ar ? "التعبئة" : "Packaging"}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-stone-200">{item.packagingSnapshot}</dd>
                  </div>
                )}
                {item.originSnapshot && (
                  <div className="min-w-0 rounded-lg bg-stone-950/50 px-3 py-2">
                    <dt className="text-[11px] text-stone-400">{ar ? "المنشأ" : "Origin"}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-stone-200">{item.originSnapshot}</dd>
                  </div>
                )}
              </dl>
            )}
            {item.specifications && (
              <div className="mt-3 rounded-xl border border-white/10 bg-stone-950/40 px-3 py-3">
                <p className="mb-1 text-[11px] font-semibold text-stone-400">{ar ? "المواصفات" : "Specifications"}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-stone-200">{item.specifications}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
