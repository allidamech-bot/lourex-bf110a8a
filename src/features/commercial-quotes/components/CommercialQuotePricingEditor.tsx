import { useMemo, useState } from "react";
import { Calculator, Check, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveCommercialQuotePricing,
  type CommercialQuoteDraft,
  type CommercialQuotePricingInput,
} from "@/features/commercial-quotes/services/commercialQuoteDraftService";

type Props = {
  quote: CommercialQuoteDraft;
  lang: "ar" | "en";
  onSaved: (next: CommercialQuoteDraft) => void;
};

const toFour = (raw: string): bigint | null => {
  if (!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,4})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
};
const toTwo = (raw: string): bigint | null => {
  if (!/^(?:0|[1-9][0-9]{0,10})(?:\.[0-9]{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};
const fmtCents = (cents: bigint) => `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
export const quotePricingPreview = (
  quote: CommercialQuoteDraft,
  draft: CommercialQuotePricingInput,
): { subtotal: string; total: string } | null => {
  if (draft.lines.length !== quote.items.length || !quote.items.length) return null;
  const amounts = new Map(draft.lines.map(x => [x.itemId, x.unitPrice.trim()]));
  let subtotal = 0n;
  for (const item of quote.items) {
    const text = amounts.get(item.id);
    if (text === undefined || !text) return null;
    const cents4 = toFour(text);
    if (cents4 === null) return null;
    subtotal += cents4 * BigInt(item.quantity);
  }
  const freight = toTwo(draft.shippingCost.trim());
  const discount = toTwo(draft.discountAmount.trim());
  if (freight === null || discount === null) return null;
  const totalFour = subtotal + (freight - discount) * 100n;
  if (totalFour < 0n) return null;
  return {
    subtotal: fmtCents((subtotal + 50n) / 100n),
    total: fmtCents((totalFour + 50n) / 100n),
  };
};

export function CommercialQuotePricingEditor({ quote, lang, onSaved }: Props) {
  const ar = lang === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<CommercialQuotePricingInput>(() => ({
    currency: quote.currency,
    paymentTerms: quote.paymentTerms,
    deliveryTerms: quote.deliveryTerms,
    incoterm: quote.incoterm,
    leadTime: quote.leadTime,
    validityDays: quote.validityDays,
    shippingCost: String(quote.shippingCost),
    discountAmount: String(quote.discountAmount),
    internalNotes: quote.internalNotes,
    lines: quote.items.map(x => ({ itemId: x.id, unitPrice: x.unitPrice === null ? "" : String(x.unitPrice) })),
  }));
  const preview = useMemo(() => quotePricingPreview(quote, draft), [quote, draft]);
  const setField = <K extends keyof CommercialQuotePricingInput>(key: K, value: CommercialQuotePricingInput[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const updated = await saveCommercialQuotePricing(quote, draft);
      onSaved(updated);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save quotation");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section data-testid="commercial-quote-pricing-editor" className="mt-5 space-y-5 rounded-2xl border border-primary/20 bg-background/50 p-4 sm:p-5" aria-label={ar ? "تسعير مسودة عرض السعر" : "Price quotation draft"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-foreground"><Calculator className="h-5 w-5 text-primary" />{ar ? "التسعير والشروط التجارية" : "Pricing & trade terms"}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{ar ? "مسودة داخلية. الأسعار سرية ولا تُرسل للعميل قبل المراجعة والاعتماد." : "Private internal draft. Prices are never sent until review and approval."}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-2 py-1 text-xs text-primary"><LockKeyhole className="h-3 w-3" />{ar ? "داخلي" : "Internal"}</span>
      </div>
      <div className="space-y-3">
        {quote.items.map(item => {
          const current = draft.lines.find(line => line.itemId === item.id);
          return <div key={item.id} className="grid gap-3 rounded-xl border border-border/70 bg-card/70 p-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">#{item.lineNumber} {item.name}</p>
              <p className="text-xs text-muted-foreground">{ar ? "الكمية" : "Quantity"}: {item.quantity.toLocaleString()} {item.unit}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`price-${item.id}`} className="text-xs">{ar ? "سعر الوحدة" : "Unit price"}</Label>
              <Input id={`price-${item.id}`} inputMode="decimal" placeholder="0.0000" value={current?.unitPrice || ""} disabled={busy}
                onChange={event => setField("lines", draft.lines.map(x => x.itemId === item.id ? { ...x, unitPrice: event.target.value } : x))}
                className="bg-background/80" />
            </div>
          </div>;
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="quote-currency">{ar ? "العملة" : "Currency"}</Label>
          <select id="quote-currency" value={draft.currency} disabled={busy} onChange={e => setField("currency", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
            {["USD","EUR","TRY","SAR","AED"].map(currency => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="quote-incoterm">Incoterm</Label>
          <Input id="quote-incoterm" maxLength={120} value={draft.incoterm} disabled={busy} onChange={e => setField("incoterm",e.target.value)} placeholder="CIF / FOB / EXW" /></div>
        <div className="space-y-1.5"><Label htmlFor="quote-shipping">{ar ? "تكلفة الشحن" : "Shipping cost"}</Label>
          <Input id="quote-shipping" inputMode="decimal" value={draft.shippingCost} disabled={busy} onChange={e => setField("shippingCost",e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="quote-discount">{ar ? "الخصم الإجمالي" : "Total discount"}</Label>
          <Input id="quote-discount" inputMode="decimal" value={draft.discountAmount} disabled={busy} onChange={e => setField("discountAmount",e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="quote-validity">{ar ? "مدة صلاحية العرض (بالأيام)" : "Validity (days)"}</Label>
          <Input id="quote-validity" type="number" min={1} max={365} value={draft.validityDays} disabled={busy}
            onChange={e => setField("validityDays", Number(e.target.value))} /></div>
        <div className="space-y-1.5"><Label htmlFor="quote-lead-time">{ar ? "مدة التوريد" : "Lead time"}</Label>
          <Input id="quote-lead-time" maxLength={240} value={draft.leadTime} disabled={busy}
            onChange={e => setField("leadTime",e.target.value)} placeholder={ar ? "مثال: 4–6 أسابيع" : "e.g. 4–6 weeks"} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="quote-payment">{ar ? "شروط الدفع" : "Payment terms"}</Label>
          <Textarea id="quote-payment" maxLength={2000} rows={2} value={draft.paymentTerms} disabled={busy}
            onChange={e => setField("paymentTerms",e.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="quote-delivery">{ar ? "شروط التسليم" : "Delivery terms"}</Label>
          <Textarea id="quote-delivery" maxLength={2000} rows={2} value={draft.deliveryTerms} disabled={busy}
            onChange={e => setField("deliveryTerms",e.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="quote-notes">{ar ? "ملاحظات داخلية" : "Internal notes"}</Label>
          <Textarea id="quote-notes" maxLength={2000} rows={2} value={draft.internalNotes} disabled={busy}
            onChange={e => setField("internalNotes",e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card p-4">
        <div className="text-sm">
          {preview ? <>
            <p className="text-muted-foreground">{ar ? "المجموع الفرعي" : "Subtotal"}: <strong className="text-foreground">{preview.subtotal} {draft.currency}</strong></p>
            <p className="mt-1 font-bold text-primary">{ar ? "الإجمالي بعد الشحن والخصم" : "Grand total"}: {preview.total} {draft.currency}</p>
          </> : <p className="text-muted-foreground">{ar ? "الإجمالي غير متاح حتى إدخال أسعار جميع البنود بشكل صحيح." : "Totals are unavailable until every line is priced correctly."}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{ar ? "حساب مبدئي؛ قاعدة البيانات تتحقق من الإجمالي عند الحفظ." : "Preview only. The database verifies totals on save."}</p>
        </div>
        <Button type="button" disabled={busy} onClick={() => void save()} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? (ar ? "جارٍ حفظ التسعير..." : "Saving prices...") : (ar ? "حفظ مسودة التسعير" : "Save pricing draft")}
        </Button>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {saved ? <p role="status" className="text-sm text-primary">{ar ? "تم حفظ المسودة داخليًا. لم يُرسل أي عرض للعميل." : "Internal draft saved. No customer quotation was sent."}</p> : null}
    </section>
  );
}
