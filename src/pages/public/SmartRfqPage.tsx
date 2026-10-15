import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PackagePlus, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { RequestContactGate } from "@/features/purchase-requests/components/RequestContactGate";
import { useI18n } from "@/lib/i18n";
import { fetchCatalogProductById, fetchCatalogProducts } from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";
import {
  clearSmartRfqDraft,
  MAX_SMART_RFQ_ITEMS,
  readSmartRfqDraft,
  saveSmartRfqDraft,
  submitSmartRfq,
  type SmartRfqDraftItem,
  type SmartRfqSubmission,
} from "@/features/smart-rfq/smartRfqService";

const newCustomItem = (): SmartRfqDraftItem => ({
  key: "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
  catalogProductId: null,
  productName: "",
  quantity: "1",
  unit: "",
  specifications: "",
});

export default function SmartRfqPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { user, profile, loading: authLoading } = useAuthSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const addCatalogId = params.get("add");
  const [items, setItems] = useState<SmartRfqDraftItem[]>(readSmartRfqDraft);
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [destination, setDestination] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<SmartRfqSubmission | null>(null);

  const label = (ar: string, en: string) => isAr ? ar : en;
  useEffect(() => { saveSmartRfqDraft(items); }, [items]);
  useEffect(() => {
    let live = true;
    fetchCatalogProducts().then(data => { if (live) setCatalog(data); })
      .catch(() => { if (live) setError(label("تعذّر تحميل الكتالوج. حاول تحديث الصفحة.", "Catalog could not be loaded. Refresh the page.")); })
      .finally(() => { if (live) setCatalogLoading(false); });
    return () => { live = false; };
  // Only load the catalog once; language doesn't change the underlying records.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!addCatalogId) return;
    let active = true;
    fetchCatalogProductById(addCatalogId)
      .then(product => {
        if (!active) return;
        if (!product) {
          setError(label("هذا المنتج غير متاح في الكتالوج المنشور.", "This product is not available in the published catalog."));
        } else {
          setItems(current => {
            if (current.some(item => item.catalogProductId === product.id)) return current;
            if (current.length >= MAX_SMART_RFQ_ITEMS) {
              setError(label("وصلت إلى الحد الأقصى: 20 منتجًا.", "The maximum is 20 products."));
              return current;
            }
            return [...current, {
              key: product.id,
              catalogProductId: product.id,
              productName: isAr ? product.nameAr : product.nameEn,
              quantity: "1",
              unit: product.unit || "",
              specifications: "",
            }];
          });
        }
        navigate("/smart-rfq", { replace: true });
      })
      .catch(() => {
        if (active) setError(label("تعذرت إضافة المنتج.", "Unable to add the product."));
      });
    return () => { active = false; };
  // Intentionally binds this link action to the URL identifier only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCatalogId, navigate]);

  const catalogMap = useMemo(() => new Map(catalog.map(product => [product.id, product])), [catalog]);
  const grandTotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), [items]);
  const update = (key: string, patch: Partial<SmartRfqDraftItem>) =>
    setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item));

  const handleSubmit = async () => {
    if (busy) return;
    setError("");
    if (!user || profile?.role !== "customer" || profile.status !== "active") {
      setError(label("يجب تسجيل الدخول بحساب عميل نشط.", "Sign in with an active customer account."));
      return;
    }
    if (items.length === 0) {
      setError(label("أضف منتجًا واحدًا على الأقل.", "Add at least one product."));
      return;
    }
    if (!destination.trim()) {
      setError(label("اكتب بلد أو مدينة التسليم.", "Enter the delivery country or city."));
      return;
    }
    setBusy(true);
    try {
      const result = await submitSmartRfq(items, destination, shippingMethod, deliveryNotes, deliveryAddress, {
        id: user.id,
        name: profile.fullName || user.email || "",
      });
      setSubmission(result);
      setItems([]);
      clearSmartRfqDraft();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : label("تعذر إرسال الطلب.", "Unable to submit the request."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lourex-public min-h-screen bg-background text-foreground">
      <SEO
        title={label("Smart RFQ | لوريكس", "Smart RFQ | LOUREX")}
        description={label("اجمع عدة منتجات في طلب عرض سعر واحد من لوريكس بدون أسعار منشورة.", "Combine multiple products into a single sourcing quotation request with LOUREX.")}
        url="https://www.lou-rex.com/smart-rfq"
      />
      <SiteHeader />
      <main className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[430px] bg-[radial-gradient(ellipse_at_18%_0%,rgba(171,53,49,0.12),transparent_46%),radial-gradient(ellipse_at_85%_5%,rgba(36,79,154,0.17),transparent_48%),linear-gradient(180deg,rgba(189,149,86,0.06),transparent)]" />
        <div className="container mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
          <nav className="mb-8 flex items-center gap-3 text-sm text-muted-foreground" aria-label={label("مسار الصفحة", "Breadcrumb")}>
            <Link className="hover:text-primary" to="/products">{label("الكتالوج", "Catalog")}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Smart RFQ</span>
          </nav>
          <header className="mb-10 max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#c6a36f]">LOUREX / THE LIVING TRADE / SMART RFQ</p>
            <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">
              {label("منتجات متعددة. طلب توريد واحد.", "Multiple products. One intelligent sourcing brief.")}
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              {label("اختر من الكتالوج أو أضف منتجًا خاصًا، وحدد كمية ومواصفات كل صنف ووجهة التسليم. لا توجد أسعار منشورة؛ فريقنا يجهّز العرض حسب طلبك.",
                "Choose catalog products or add a custom item. Set each quantity, specification and destination. No public prices: our team prepares a tailored quotation.")}
            </p>
          </header>

          {submission ? (
            <section className="rounded-[2rem] border border-[#c6a36f]/40 bg-card px-6 py-12 text-center shadow-2xl sm:px-10" role="status">
              <CheckCircle2 className="mx-auto h-16 w-16 text-[#c6a36f]" />
              <h2 className="mt-5 font-serif text-3xl font-bold">{label("تم استلام طلبك بنجاح", "Your RFQ has been submitted")}</h2>
              <p className="mt-4 text-muted-foreground">{label("تم حفظ جميع الأصناف في طلب واحد. سيُراجع فريق LOUREX التفاصيل.", "All product lines were saved under one request. The LOUREX team will review your brief.")}</p>
              <p className="mt-5 font-mono text-xl font-semibold" dir="ltr">{submission.requestNumber}</p>
              <p className="mt-2 text-sm text-muted-foreground" dir="ltr">{submission.trackingCode}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button asChild><Link to={"/customer-portal/requests?request=" + encodeURIComponent(submission.requestId)}>{label("عرض طلبي", "View my request")}</Link></Button>
                <Button variant="outline" asChild><Link to="/products">{label("تصفح الكتالوج", "Browse catalog")}</Link></Button>
              </div>
            </section>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(290px,0.43fr)]">
              <section className="space-y-5" aria-labelledby="rfq-items-heading">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#c6a36f]">01 / PRODUCTS</p>
                    <h2 id="rfq-items-heading" className="mt-1 font-serif text-2xl font-bold">{label("أصناف الطلب", "Request lines")} <span className="text-primary">({items.length}/20)</span></h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild><Link to="/products"><PackagePlus className="me-2 h-4 w-4" />{label("الكتالوج", "Catalog")}</Link></Button>
                    <Button type="button" disabled={items.length >= MAX_SMART_RFQ_ITEMS} onClick={() => setItems(current => [...current, newCustomItem()])}>
                      <Plus className="me-2 h-4 w-4" />{label("منتج غير موجود", "Custom product")}
                    </Button>
                  </div>
                </div>

                {catalogLoading && <p className="text-sm text-muted-foreground"><Loader2 className="me-2 inline h-4 w-4 animate-spin" />{label("تحميل بيانات المنتجات…", "Loading products…")}</p>}

                {items.length === 0 ? (
                  <div className="rounded-[1.7rem] border border-dashed border-primary/30 bg-card/70 px-6 py-14 text-center">
                    <PackagePlus className="mx-auto mb-4 h-10 w-10 text-[#c6a36f]" />
                    <p className="font-semibold">{label("سلة طلب عرض السعر فارغة", "Your RFQ basket is empty")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{label("أضف منتجًا من الكتالوج أو أنشئ صنفًا خاصًا.", "Add a catalog product or specify a custom item.")}</p>
                    <Button asChild className="mt-5"><Link to="/products">{label("استكشف المنتجات", "Explore products")}</Link></Button>
                  </div>
                ) : items.map((item, index) => {
                  const product = item.catalogProductId ? catalogMap.get(item.catalogProductId) : null;
                  return (
                    <article key={item.key} className="overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-4">
                          {product?.images[0]?.url ? <img src={product.images[0].url} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-border/60 bg-secondary object-contain" /> : null}
                          <div className="min-w-0">
                            <p className="mb-1 text-xs font-bold tracking-widest text-[#c6a36f]">{label("الصنف", "ITEM")} {String(index + 1).padStart(2, "0")}</p>
                            <h3 className="break-words text-lg font-semibold">{product ? (isAr ? product.nameAr : product.nameEn) : label("منتج حسب الطلب", "Custom sourcing product")}</h3>
                            {product?.moq ? <p className="mt-1 text-xs text-muted-foreground">{label("الحد الأدنى المعلن: ", "Published MOQ: ")}{product.moq}</p> : null}
                            {item.catalogProductId && !product && !catalogLoading && <p className="mt-1 text-xs text-destructive">{label("المنتج قد يكون غير متاح. احذفه ثم أضفه من جديد.", "This product may no longer be available. Remove it and choose another.")}</p>}
                          </div>
                        </div>
                        <Button aria-label={label("حذف الصنف", "Remove item")} variant="ghost" size="icon" onClick={() => setItems(current => current.filter(x => x.key !== item.key))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {!item.catalogProductId && (
                        <div className="mb-4">
                          <Label htmlFor={"rfq-name-" + item.key}>{label("اسم المنتج", "Product name")} *</Label>
                          <Input id={"rfq-name-" + item.key} value={item.productName} maxLength={240}
                            onChange={e => update(item.key, { productName: e.target.value })} className="mt-2"
                            placeholder={label("مثال: زيت دوار الشمس المكرر", "Example: Refined sunflower oil")} />
                        </div>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={"rfq-qty-" + item.key}>{label("الكمية", "Quantity")} *</Label>
                          <Input id={"rfq-qty-" + item.key} type="number" min="1" max="100000000" step="1" inputMode="numeric" dir="ltr"
                            value={item.quantity} onChange={e => update(item.key, { quantity: e.target.value })} className="mt-2" />
                        </div>
                        <div>
                          <Label htmlFor={"rfq-unit-" + item.key}>{label("الوحدة", "Unit")}</Label>
                          <Input id={"rfq-unit-" + item.key} value={item.unit} maxLength={80}
                            readOnly={Boolean(item.catalogProductId)}
                            onChange={e => update(item.key, { unit: e.target.value })} className="mt-2"
                            placeholder={label("كرتون، حاوية، طن…", "Cartons, containers, tonnes…")} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor={"rfq-spec-" + item.key}>{label("مواصفات هذا الصنف", "Item-specific specifications")}</Label>
                          <Textarea id={"rfq-spec-" + item.key} value={item.specifications} maxLength={2000} rows={3}
                            onChange={e => update(item.key, { specifications: e.target.value })} className="mt-2"
                            placeholder={label("التعبئة، العلامة، المواصفات، المتطلبات الخاصة…", "Packaging, branding, grades and custom requirements…")} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <aside className="space-y-5 lg:sticky lg:top-24">
                <section className="rounded-[1.7rem] border border-[#c6a36f]/35 bg-card/95 p-5 shadow-lg sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#c6a36f]">02 / SOURCING BRIEF</p>
                  <h2 className="mt-2 font-serif text-2xl font-bold">{label("وجهة الطلب", "Delivery brief")}</h2>
                  <div className="mt-5 space-y-4">
                    <div><Label htmlFor="rfq-destination">{label("الوجهة / البلد", "Destination / country")} *</Label>
                      <Input id="rfq-destination" value={destination} maxLength={240} className="mt-2"
                        onChange={e => setDestination(e.target.value)} placeholder={label("مثال: جدة، السعودية", "e.g. Jeddah, Saudi Arabia")} /></div>
                    <div><Label htmlFor="rfq-shipping">{label("طريقة الشحن المفضلة", "Preferred shipping")}</Label>
                      <select id="rfq-shipping" className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={shippingMethod} onChange={e => setShippingMethod(e.target.value)}>
                        <option value="">{label("غير محددة", "Not specified")}</option>
                        <option value="sea">{label("بحري", "Sea freight")}</option>
                        <option value="air">{label("جوي", "Air freight")}</option>
                        <option value="land">{label("بري", "Land transport")}</option>
                        <option value="other">{label("أخرى", "Other")}</option>
                      </select></div>
                    <div><Label htmlFor="rfq-address">{label("عنوان التسليم (اختياري)", "Delivery address (optional)")}</Label>
                      <Input id="rfq-address" value={deliveryAddress} maxLength={500} className="mt-2" onChange={e => setDeliveryAddress(e.target.value)} /></div>
                    <div><Label htmlFor="rfq-notes">{label("ملاحظات عامة للطلب", "General RFQ notes")}</Label>
                      <Textarea id="rfq-notes" value={deliveryNotes} rows={4} maxLength={3000} className="mt-2"
                        onChange={e => setDeliveryNotes(e.target.value)} placeholder={label("شرط التسليم، موعد الطلب، الشهادات المطلوبة…", "Incoterms, lead time, required certificates…")} /></div>
                  </div>
                  <div className="mt-6 rounded-xl border border-border/70 bg-secondary/40 p-4 text-sm">
                    <div className="flex items-center justify-between"><span>{label("عدد الأصناف", "Product lines")}</span><strong>{items.length}</strong></div>
                    <div className="mt-2 flex items-center justify-between"><span>{label("مجموع الوحدات", "Total units (mixed)")}</span><strong>{grandTotal.toLocaleString()}</strong></div>
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">{label("الكميات قد تكون بوحدات مختلفة؛ تُعالج كل وحدة بشكل منفصل في العرض.", "Different units are handled separately in your quotation.")}</p>
                  </div>
                  <div className="mt-5 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#c6a36f]" />
                    <span>{label("لن تُنشر أسعار، وسيُرسل الطلب لفريق LOUREX فقط.", "No public pricing; your request is shared only with the authorized LOUREX team.")}</span>
                  </div>
                </section>
                <RequestContactGate lang={lang}>
                  <div className="rounded-[1.7rem] border border-border/70 bg-card p-5">
                    {error && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
                    {!authLoading && !user && <Button asChild variant="outline" className="mb-4 w-full"><Link to="/auth">{label("تسجيل الدخول أولًا", "Sign in first")}</Link></Button>}
                    <Button className="w-full" size="lg" disabled={busy || authLoading || !user || profile?.role !== "customer" || items.length === 0}
                      onClick={() => { void handleSubmit(); }}>
                      {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
                      {busy ? label("جاري إرسال الطلب…", "Submitting request…") : label("إرسال طلب عرض السعر", "Submit Smart RFQ")}
                    </Button>
                  </div>
                </RequestContactGate>
              </aside>
            </div>
          )}
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            <Link to="/products" className="hover:text-primary">{label("العودة إلى الكتالوج", "Back to catalog")}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
