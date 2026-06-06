export type CurrencyCode = 'USD' | 'SAR' | 'TRY';

export interface MonetaryValue {
  amountInCents: number;
  currency: CurrencyCode;
}

export interface ExchangeRateMap {
  baseCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
}
