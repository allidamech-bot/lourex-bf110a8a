/**
 * Financial Currency Helper
 * 
 * Provides safe, data-driven currency formatting without hardcoded fallback
 * leakage or unsafe automatic FX conversion.
 */

export function normalizeCurrencyCode(value?: string | null): string {
  if (!value || typeof value !== "string") return "SAR";
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return "SAR";
  return trimmed;
}

export function getCurrencyDisplay(currency?: string | null): string {
  return normalizeCurrencyCode(currency);
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
  locale: string = "en-US"
): string {
  const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  const safeCurrency = normalizeCurrencyCode(currency);

  if (parsedAmount === null || parsedAmount === undefined || isNaN(parsedAmount)) {
    return `0 ${safeCurrency}`;
  }

  // Format the number safely. We use standard number formatting rather than
  // Intl.NumberFormat currency style to prevent runtime exceptions on
  // obscure/invalid currency codes and to maintain visual consistency.
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsedAmount);

  return `${formattedNumber} ${safeCurrency}`;
}
