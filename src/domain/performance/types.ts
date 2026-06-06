import type { CurrencyCode, MonetaryValue } from "@/domain/currency/types";

export interface CacheMetadata {
  cacheKey: string;
  cachedAt: Date;
  ttlInSeconds: number;
  isStale: boolean;
}

export interface CachedBalancePayload {
  entityId: string;
  balances: Record<CurrencyCode, MonetaryValue>;
  lastUpdated: Date;
}

export interface CacheEntry<T> {
  metadata: CacheMetadata;
  payload: T;
}
