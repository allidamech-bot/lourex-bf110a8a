import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { CommercialQuoteActions } from "@/features/commercial-quotes/components/CommercialQuoteActions";
import type { CommercialQuoteDraft } from "@/features/commercial-quotes/services/commercialQuoteDraftService";
import {
  emailIssuedCommercialQuote, updateQuotationState,
} from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";

vi.mock("@/features/commercial-quotes/services/commercialQuoteLifecycleService", () => ({
  emailIssuedCommercialQuote: vi.fn(), updateQuotationState: vi.fn(),
}));
vi.mock("@/features/commercial-quotes/components/CommercialQuotationDocument", () => ({
  CommercialQuotationDocument: () => <div data-testid="quote-pdf" />,
}));

const mockQuote: CommercialQuoteDraft = {
  id: "00000000-0000-4000-8000-000000000101",
  number: "LQ-2026-TEST",
  versionNo: 1,
  requestId: "00000000-0000-4000-8000-000000000301",
  customerId: "00000000-0000-4000-8000-000000000201",
  createdAt: "2026-10-15", currency: "USD",
  status: "approved", approvedAt: "2026-10-15", issuedAt: null, customerResponseNote: "",
  paymentTerms: "50% deposit", deliveryTerms: "FOB", incoterm: "FOB",
  leadTime: "4 weeks", validityDays: 30, shippingCost: 0, discountAmount: 0, internalNotes: "",
  items: [{ id: "a", lineNumber: 1, name: "Product", quantity: 10, unit: "box",
    specifications: "", moq: "", packaging: "", origin: "", unitPrice: 20 }],
};
const issuedQuote = { ...mockQuote, status: "issued", issuedAt: "2026-10-15" } as CommercialQuoteDraft;

function Screen() {
  const [quote, setQuote] = useState<CommercialQuoteDraft>(mockQuote);
  return <CommercialQuoteActions quote={quote} canApprove lang="en" onUpdate={setQuote} />;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  vi.mocked(updateQuotationState).mockResolvedValue(issuedQuote);
  vi.mocked(emailIssuedCommercialQuote).mockResolvedValue({ sent: true });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Commercial quotation issue and email lifecycle", () => {
  it("publishes to the customer before emailing and confirms the provider acknowledgement", async () => {
    const steps: string[] = [];
    vi.mocked(updateQuotationState).mockImplementation(async () => { steps.push("issue"); return issuedQuote; });
    vi.mocked(emailIssuedCommercialQuote).mockImplementation(async () => { steps.push("email"); return { sent: true }; });
    render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: /Issue to customer/ }));
    await waitFor(() => expect(steps).toEqual(["issue", "email"]));
    expect(emailIssuedCommercialQuote).toHaveBeenCalledWith(issuedQuote);
    expect(await screen.findByText(/Email provider accepted the send request/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Email quotation notification/ })).toBeInTheDocument();
  });

  it("preserves the issued quote when email fails and offers a safe email-only retry", async () => {
    vi.mocked(emailIssuedCommercialQuote).mockRejectedValueOnce(new Error("Provider unreachable"));
    render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: /Issue to customer/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/quotation is visible to the customer, but email sending failed/i);
    expect(screen.getByRole("button", { name: /Email quotation notification/ })).toBeInTheDocument();
    expect(updateQuotationState).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Email quotation notification/ }));
    await waitFor(() => expect(emailIssuedCommercialQuote).toHaveBeenCalledTimes(2));
    expect(updateQuotationState).toHaveBeenCalledTimes(1);
  });

  it("explains provider credential rejection without leaking secrets or reissuing a quote", async () => {
    const authError = Object.assign(new Error("Resend authentication failed"), { code: "EMAIL_PROVIDER_AUTH_FAILED" });
    vi.mocked(emailIssuedCommercialQuote).mockRejectedValueOnce(authError);
    render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: /Issue to customer/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Resend rejected the configured sending credentials/i);
    expect(screen.getByRole("alert")).toHaveTextContent("RESEND_API_KEY");
    expect(updateQuotationState).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Email quotation notification/ })).toBeInTheDocument();
  });

  it("never emails a quote that failed its server-side issuance", async () => {
    vi.mocked(updateQuotationState).mockRejectedValue(new Error("Owner authorization denied"));
    render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: /Issue to customer/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Owner authorization denied");
    expect(emailIssuedCommercialQuote).not.toHaveBeenCalled();
  });
});
