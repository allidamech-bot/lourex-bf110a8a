import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { DomainResult } from "@/domain/operations/types";
import {
  createDomainError,
  failure,
  normalizeBoolean,
  normalizeNumber,
  normalizeOptionalText,
  normalizeText,
  success,
} from "@/domain/shared/utils";

type RfqRow = Tables<"rfqs">;
type QuoteRow = Tables<"quotes">;
type FactorySummaryRow = Pick<
  Tables<"factories">,
  "id" | "name" | "location" | "is_verified" | "reliability_score"
>;

export type RfqSummary = {
  id: string;
  title: string;
  rfqNumber: string;
  status: string;
  category: string | null;
  quantity: number;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  targetCountry: string | null;
  timeline: string | null;
  visibility: string;
  notes: string | null;
  createdAt: string;
};

export type RfqFactorySummary = {
  id: string;
  name: string;
  location: string | null;
  isVerified: boolean;
  reliabilityScore: number;
};

export type RfqQuote = {
  id: string;
  factoryId: string;
  pricePerUnit: number;
  totalPrice: number;
  currency: string;
  moq: number;
  leadTime: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export type RfqDetailData = {
  rfq: RfqSummary;
  quotes: RfqQuote[];
  factories: Record<string, RfqFactorySummary>;
};

const normalizeRfq = (rfq: RfqRow): RfqSummary => ({
  id: rfq.id,
  title: normalizeText(rfq.title || rfq.product_name || rfq.rfq_number),
  rfqNumber: normalizeText(rfq.rfq_number),
  status: normalizeText(rfq.status) || "open",
  category: normalizeOptionalText(rfq.category),
  quantity: normalizeNumber(rfq.quantity),
  budgetMin: rfq.budget_min,
  budgetMax: rfq.budget_max,
  currency: normalizeText(rfq.currency) || "USD",
  targetCountry: normalizeOptionalText(rfq.target_country),
  timeline: normalizeOptionalText(rfq.timeline),
  visibility: normalizeText(rfq.visibility) || "private",
  notes: normalizeOptionalText(rfq.notes),
  createdAt: rfq.created_at,
});

const normalizeQuote = (quote: QuoteRow): RfqQuote => ({
  id: quote.id,
  factoryId: quote.factory_id,
  pricePerUnit: normalizeNumber(quote.price_per_unit),
  totalPrice: normalizeNumber(quote.total_price),
  currency: normalizeText(quote.currency) || "USD",
  moq: normalizeNumber(quote.moq),
  leadTime: normalizeOptionalText(quote.lead_time),
  notes: normalizeOptionalText(quote.notes),
  status: normalizeText(quote.status) || "pending",
  createdAt: quote.created_at,
});

const normalizeFactory = (factory: FactorySummaryRow): RfqFactorySummary => ({
  id: factory.id,
  name: normalizeText(factory.name),
  location: normalizeOptionalText(factory.location),
  isVerified: normalizeBoolean(factory.is_verified),
  reliabilityScore: normalizeNumber(factory.reliability_score),
});

export const fetchRfqDetail = async (rfqId: string): Promise<DomainResult<RfqDetailData>> => {
  const normalizedRfqId = normalizeText(rfqId);
  if (!normalizedRfqId) {
    return failure("A valid RFQ id is required.");
  }

  try {
    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .select("*")
      .eq("id", normalizedRfqId)
      .maybeSingle();

    if (rfqError) {
      throw rfqError;
    }

    if (!rfq) {
      return failure("RFQ not found.");
    }

    const { data: quotes, error: quotesError } = await supabase
      .from("quotes")
      .select("*")
      .eq("rfq_id", normalizedRfqId)
      .order("price_per_unit");

    if (quotesError) {
      throw quotesError;
    }

    const normalizedQuotes = (quotes ?? []).map(normalizeQuote);
    const factoryIds = Array.from(new Set(normalizedQuotes.map((quote) => quote.factoryId)));
    let factoriesMap: Record<string, RfqFactorySummary> = {};

    if (factoryIds.length > 0) {
      const { data: factories, error: factoriesError } = await supabase
        .from("factories")
        .select("id, name, location, is_verified, reliability_score")
        .in("id", factoryIds);

      if (factoriesError) {
        throw factoriesError;
      }

      factoriesMap = Object.fromEntries(
        (factories ?? []).map((factory) => {
          const normalizedFactory = normalizeFactory(factory);
          return [normalizedFactory.id, normalizedFactory];
        }),
      );
    }

    return success({
      rfq: normalizeRfq(rfq),
      quotes: normalizedQuotes,
      factories: factoriesMap,
    });
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to load the RFQ details."),
    };
  }
};

export const acceptQuote = async (quoteId: string): Promise<DomainResult<string>> => {
  const normalizedQuoteId = normalizeText(quoteId);
  if (!normalizedQuoteId) {
    return failure("A valid quote id is required.");
  }

  try {
    const { data, error } = await supabase.rpc("accept_quote", { p_quote_id: normalizedQuoteId });

    if (error || !data) {
      return {
        data: null,
        error: createDomainError(error, "Unable to accept the quote."),
      };
    }

    return success(normalizeText(data));
  } catch (error) {
    return {
      data: null,
      error: createDomainError(error, "Unable to accept the quote."),
    };
  }
};
