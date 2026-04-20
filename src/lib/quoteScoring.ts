/**
 * Smart Quote Scoring Engine
 * ---------------------------
 * Pure, deterministic scoring for quotes on an RFQ. No AI, no randomness.
 * All scores are normalized 0–100. Final score uses these weights:
 *   price 40 | reliability 25 | lead time 20 | response speed 10 | moq 5
 *
 * Safe with incomplete data: missing fields fall back to neutral defaults
 * (50) so a quote is never disqualified for missing one signal.
 */

export interface ScoringQuote {
  id: string;
  factory_id: string;
  price_per_unit: number | null;
  total_price: number | null;
  currency: string;
  moq: number | null;
  lead_time: string | null;
  status: string;
  created_at: string;
}

export interface ScoringFactory {
  id: string;
  name?: string | null;
  reliability_score?: number | null; // expected 0–100 or 0–5
  is_verified?: boolean | null;
}

export interface ScoringRfq {
  quantity: number;
  created_at: string;
}

export interface QuoteScore {
  quote_id: string;
  final_score: number;
  price_score: number;
  reliability_score: number;
  lead_time_score: number;
  moq_score: number;
  response_speed_score: number;
  recommendation_reason: string[];
}

export const WEIGHTS = {
  price: 0.40,
  reliability: 0.25,
  lead_time: 0.20,
  response_speed: 0.10,
  moq: 0.05,
} as const;

const NEUTRAL = 50;

/** Parse "15 days", "2 weeks", "3-4 weeks" → average days. Falls back to null. */
export function parseLeadTimeDays(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  const nums = s.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (s.includes("week")) return avg * 7;
  if (s.includes("month")) return avg * 30;
  if (s.includes("hour")) return avg / 24;
  return avg; // assume days
}

/** Normalize reliability whether stored as 0–5 or 0–100. */
function normalizeReliability(raw: number | null | undefined): number {
  if (raw == null || isNaN(raw)) return NEUTRAL;
  if (raw <= 5) return Math.max(0, Math.min(100, (raw / 5) * 100));
  return Math.max(0, Math.min(100, raw));
}

/** Lower-is-better normalization across a numeric set → 0–100. */
function normalizeLowerBetter(value: number | null, all: (number | null)[]): number {
  const valid = all.filter((v): v is number => v != null && isFinite(v) && v > 0);
  if (value == null || !isFinite(value) || value <= 0 || valid.length === 0) return NEUTRAL;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return 100;
  return Math.round(((max - value) / (max - min)) * 100);
}

export function scoreQuotes(
  quotes: ScoringQuote[],
  factoriesById: Record<string, ScoringFactory>,
  rfq: ScoringRfq,
): QuoteScore[] {
  if (!quotes.length) return [];

  const totals = quotes.map((q) => q.total_price ?? null);
  const leadDays = quotes.map((q) => parseLeadTimeDays(q.lead_time));
  const submissionTimes = quotes.map((q) => new Date(q.created_at).getTime());
  const earliest = Math.min(...submissionTimes);
  const latest = Math.max(...submissionTimes);

  return quotes.map((q, idx) => {
    const factory = factoriesById[q.factory_id];

    // 1. Price (lower better, normalized vs other quotes)
    const price_score = normalizeLowerBetter(q.total_price, totals);

    // 2. Reliability (factory data, neutral fallback)
    const reliability_score = normalizeReliability(factory?.reliability_score);

    // 3. Lead time (lower better)
    const lead_time_score = normalizeLowerBetter(leadDays[idx], leadDays);

    // 4. MOQ flexibility — closer to or below buyer quantity scores higher
    const moq_score = (() => {
      if (q.moq == null || rfq.quantity <= 0) return NEUTRAL;
      if (q.moq <= rfq.quantity) return 100;
      const ratio = rfq.quantity / q.moq; // 0–1
      return Math.round(Math.max(0, Math.min(100, ratio * 100)));
    })();

    // 5. Response speed — earliest submission scores best
    const response_speed_score = (() => {
      if (latest === earliest) return 100;
      const t = submissionTimes[idx];
      return Math.round(((latest - t) / (latest - earliest)) * 100);
    })();

    const final_score = Math.round(
      price_score * WEIGHTS.price +
        reliability_score * WEIGHTS.reliability +
        lead_time_score * WEIGHTS.lead_time +
        response_speed_score * WEIGHTS.response_speed +
        moq_score * WEIGHTS.moq,
    );

    // Build human-readable reasons (top contributing factors)
    const reasons: { label: string; score: number }[] = [
      { label: "Best price-performance balance", score: price_score },
      { label: "Strong supplier reliability", score: reliability_score },
      { label: "Faster delivery than most offers", score: lead_time_score },
      { label: "Flexible minimum order quantity", score: moq_score },
      { label: "Quick supplier response", score: response_speed_score },
    ];
    const recommendation_reason = reasons
      .filter((r) => r.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.label);

    if (recommendation_reason.length === 0) {
      recommendation_reason.push("Balanced offer across price, reliability, and delivery");
    }

    return {
      quote_id: q.id,
      final_score,
      price_score,
      reliability_score,
      lead_time_score,
      moq_score,
      response_speed_score,
      recommendation_reason,
    };
  });
}

/** Pick the best quote (highest final_score, ties broken by lower price). */
export function pickBestQuote(
  scores: QuoteScore[],
  quotes: ScoringQuote[],
): QuoteScore | null {
  if (!scores.length) return null;
  const byId = Object.fromEntries(quotes.map((q) => [q.id, q]));
  return [...scores].sort((a, b) => {
    if (b.final_score !== a.final_score) return b.final_score - a.final_score;
    const pa = byId[a.quote_id]?.total_price ?? Infinity;
    const pb = byId[b.quote_id]?.total_price ?? Infinity;
    return pa - pb;
  })[0];
}
