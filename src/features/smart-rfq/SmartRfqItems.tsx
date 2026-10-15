import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { fetchSmartRfqItems, type SmartRfqStoredItem } from "@/features/smart-rfq/smartRfqService";

/** Shows item snapshots attached to the canonical request; old one-line requests render normally. */
export function SmartRfqItems({ requestId, lang }: { requestId: string; lang: "ar" | "en" }) {
  const [items, setItems] = useState<SmartRfqStoredItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let alive = true;
    setItems([]);
    setLoadError(false);
    fetchSmartRfqItems(requestId)
      .then(rows => { if (alive) setItems(rows); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [requestId]);
  if (loadError || items.length === 0) return null;
  const ar = lang === "ar";
  return (
    <section className="min-w-0 rounded-[1.4rem] border border-amber-600/25 bg-card/75 p-4 sm:p-6" aria-label={ar ? "بنود طلب عرض السعر" : "Quotation request lines"}>
      <header className="mb-5 flex items-center gap-3">
        <span className="rounded-xl border border-amber-600/25 bg-amber-600/10 p-2 text-amber-500"><PackageCheck className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-bold tracking-widest text-amber-500">LOUREX / SMART RFQ</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{ar ? "أصناف طلب عرض السعر" : "Quotation line items"} ({items.length})</h3>
        </div>
      </header>
      <div className="space-y-3">
        {items.map((item, index) => (
          <article key={item.id} className="flex min-w-0 gap-4 rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4">
            {item.imageUrlSnapshot && /^https?:\/\//i.test(item.imageUrlSnapshot) ? (
              <img src={item.imageUrlSnapshot} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-card object-contain" loading="lazy" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">#{index + 1}</p>
              <p className="break-words font-semibold text-foreground">
                {item.productSlug ? <Link className="hover:text-primary" to={"/products/" + encodeURIComponent(item.productSlug)}>{item.productName}</Link> : item.productName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{ar ? "الكمية" : "Quantity"}: <strong className="text-foreground">{item.quantity.toLocaleString()}</strong> {item.unit}</p>
              {item.moqSnapshot && <p className="mt-1 text-xs text-muted-foreground">{ar ? "الحد الأدنى وقت الطلب" : "MOQ at submission"}: {item.moqSnapshot}</p>}
              {item.packagingSnapshot && <p className="mt-1 text-xs text-muted-foreground">{ar ? "التعبئة" : "Packaging"}: {item.packagingSnapshot}</p>}
              {item.originSnapshot && <p className="mt-1 text-xs text-muted-foreground">{ar ? "المنشأ" : "Origin"}: {item.originSnapshot}</p>}
              {item.specifications && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">{item.specifications}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
