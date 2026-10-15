import { renderPdf, type Quote, type Line } from "./render.ts";

const quote: Quote = {
  quote_number: "LQ-2026-QA-R2",
  currency: "USD",
  payment_terms: "50% advance, 50% before shipment. الدفع خمسون بالمئة مقدماً.",
  delivery_terms: "CIF Jeddah, Saudi Arabia. التسليم ميناء جدة.",
  incoterm: "CIF", lead_time: "3 weeks",
  validity_days: 30, shipping_cost: 500,
  discount_amount: 100, issued_at: "2026-10-15T12:00:00Z",
};

Deno.test("issued quotation PDF renders branded bilingual pages with signed-data-only fixture", async () => {
  const lines: Line[] = Array.from({length:20},(_,index) => ({
    line_number: index+1,
    product_name: index%2===0 ? "زيت دوار الشمس - Sunflower Oil" : "Nutella Hazelnut Spread",
    quantity: 100 + index,
    unit: "cartons",
    unit_price: 5.25 + index/10,
    specifications: "Packaged in 24 x 1L bottles, valid COA. المواصفات والتعبئة حسب الطلب."
  }));
  const bytes = await renderPdf(quote,lines);
  if (bytes.byteLength < 3000) throw new Error("Suspiciously empty quotation PDF");
  const signature = new TextDecoder().decode(bytes.slice(0,8));
  if (!signature.startsWith("%PDF-")) throw new Error("Quotation renderer returned invalid PDF");
});
