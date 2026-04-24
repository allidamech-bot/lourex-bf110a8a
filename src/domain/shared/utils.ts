import type { DomainError, DomainResult } from "@/domain/operations/types";

export const createDomainError = (error: unknown, fallback: string): DomainError => ({
  message: error instanceof Error && error.message ? error.message : fallback,
  cause: error,
});

export const success = <T>(data: T): DomainResult<T> => ({
  data,
  error: null,
});

export const failure = <T = never>(message: string, cause?: unknown): DomainResult<T> => ({
  data: null,
  error: {
    message,
    ...(typeof cause !== "undefined" ? { cause } : {}),
  },
});

export const normalizeArabicDigits = (value: string | null | undefined) =>
    (value ?? "")
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export const normalizeText = (value: string | null | undefined) =>
    normalizeArabicDigits(value).trim();

export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

export const normalizeNumber = (
    value: number | string | null | undefined,
    fallback = 0,
) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  if (typeof value === "string") {
    const normalized = normalizeArabicDigits(value)
        .replace(/,/g, ".")
        .replace(/[^\d.-]/g, "");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const normalizeInteger = (
    value: number | string | null | undefined,
    fallback = 0,
) => {
  const normalized = normalizeNumber(value, fallback);
  return Number.isInteger(normalized) ? normalized : fallback;
};

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
  return normalized.length > 0 ? success(normalized) : failure(message);
};