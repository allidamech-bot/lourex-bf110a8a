import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartRfqItems } from "@/features/smart-rfq/SmartRfqItems";
import { CommercialQuotationDocument } from "@/features/commercial-quotes/components/CommercialQuotationDocument";
import { fetchSmartRfqItems } from "@/features/smart-rfq/smartRfqService";
import type { CustomerQuotation } from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";

vi.mock("@/features/smart-rfq/smartRfqService", () => ({ fetchSmartRfqItems: vi.fn() }));
vi.mock("@/features/commercial-quotes/services/commercialQuotePdf", () => ({ downloadCommercialQuotePdf: vi.fn() }));

const requestId = "00000000-0000-4000-8000-000000000301";
const mockItems = [
  { id: "line-1", productName: "زيت دوار الشمس", quantity: 150, unit: "كرتونة",
    specifications: "عبوة 1 لتر", moqSnapshot: "100 cartons", packagingSnapshot: "12 bottles",
    originSnapshot: "Türkiye", imageUrlSnapshot: "", productSlug: "sunflower-oil" },
  { id: "line-2", productName: "بسكويت", quantity: 200, unit: "box",
    specifications: "", moqSnapshot: "", packagingSnapshot: "", originSnapshot: "",
    imageUrlSnapshot: "", productSlug: "" },
];
const issuedQuote: CustomerQuotation = {
  id: "00000000-0000-4000-8000-000000000101", number: "LQ-2026-TEST", requestId,
  versionNo: 1, status: "issued", currency: "USD", approvedAt: null, issuedAt: "2026-10-15",
  respondedAt: null, responseNote: "", paymentTerms: "50% deposit", deliveryTerms: "FOB",
  incoterm: "FOB", leadTime: "4 weeks", validityDays: 30, shippingCost: 25, discountAmount: 0,
  items: [{ lineNumber: 1, name: "Premium biscuits", quantity: 100, unit: "cartons",
    specifications: "Export cartons", moq: "100", packaging: "12 units", origin: "Türkiye", unitPrice: 12 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchSmartRfqItems).mockResolvedValue(mockItems);
});
afterEach(cleanup);

describe("Customer mobile quotation presentation", () => {
  it("shows RFQ products as readable cards with quantity and snapshots in Arabic", async () => {
    render(<MemoryRouter><SmartRfqItems requestId={requestId} requestNumber="RFQ-TEST-001" lang="ar" /></MemoryRouter>);
    const list = await screen.findByRole("region", { name: "أصناف طلب عرض السعر" });
    expect(within(list).getByText("المنتجات المطلوبة")).toBeInTheDocument();
    expect(within(list).getByText("زيت دوار الشمس")).toBeInTheDocument();
    expect(within(list).getByText("بسكويت")).toBeInTheDocument();
    expect(within(list).getByText("الكمية المطلوبة", { exact: true })).toBeInTheDocument();
    expect(within(list).getByText("الحد الأدنى وقت الطلب")).toBeInTheDocument();
    expect(within(list).getByText("عبوة 1 لتر")).toBeInTheDocument();
    expect(within(list).getAllByRole("article")).toHaveLength(2);
  });

  it("preserves the legacy request screen without loading RFQ data", () => {
    render(<MemoryRouter><SmartRfqItems requestId={requestId} requestNumber="PR-TEST" lang="en" /></MemoryRouter>);
    expect(fetchSmartRfqItems).not.toHaveBeenCalled();
    expect(screen.queryByText("Requested products")).not.toBeInTheDocument();
  });

  it("displays an explicit load error rather than an empty product card", async () => {
    vi.mocked(fetchSmartRfqItems).mockRejectedValueOnce(new Error("Network offline"));
    render(<MemoryRouter><SmartRfqItems requestId={requestId} requestNumber="RFQ-TEST" lang="en" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to display RFQ line items"));
  });

  it("renders the mobile item card and retains the printable formal table", () => {
    render(<CommercialQuotationDocument quote={issuedQuote} lang="ar" />);
    const mobile = screen.getByLabelText("أصناف عرض السعر");
    expect(within(mobile).getByText("Premium biscuits")).toBeInTheDocument();
    expect(within(mobile).getByText("سعر الوحدة")).toBeInTheDocument();
    expect(mobile).toHaveClass("sm:hidden");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تنزيل PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "طباعة / حفظ PDF" })).toBeInTheDocument();
  });
});
