import type { DomainError, DomainResult } from "@/domain/operations/types";

export const createDomainError = (error: unknown, fallback: string): DomainError => ({
  message: error instanceof Error && error.message ? error.message : fallback,
  cause: error,
});

export const success = <T,>(data: T): DomainResult<T> => ({ data, error: null });

export const failure = <T,>(message: string, cause?: unknown): DomainResult<T> => ({
  data: null,
  error: {
    message,
    ...(typeof cause !== "undefined" ? { cause } : {}),
  },
});

export const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

export const normalizeNumber = (value: number | null | undefined, fallback = 0) =>
  Number.isFinite(value) ? Number(value) : fallback;

export const normalizeInteger = (value: number | null | undefined, fallback = 0) =>
  Number.isInteger(value) ? Number(value) : fallback;

export const normalizeBoolean = (value: boolean | null | undefined) => Boolean(value);

export const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value) => value.length > 0),
    ),
  );

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));

export const isValidPhone = (value: string) =>
  /^[0-9+\-()/\s]{7,20}$/.test(normalizeText(value));

export const requireNonEmpty = (value: string, message: string) => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? success(normalized) : failure<string>(message);
};

