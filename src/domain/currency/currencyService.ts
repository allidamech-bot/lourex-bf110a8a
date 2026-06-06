import type { CurrencyCode, MonetaryValue } from "./types";

/**
 * Ensures a value is securely rounded to the nearest integer cent
 * to avoid floating-point math errors.
 */
export const toCents = (amount: number): number => {
  return Math.floor(amount);
};

/**
 * Converts a MonetaryValue from one currency to another using the provided rate.
 * Uses integer math (Math.floor) to prevent precision drift.
 */
export const convertCurrency = (
  value: MonetaryValue,
  targetCurrency: CurrencyCode,
  rate: number
): MonetaryValue => {
  if (value.currency === targetCurrency) {
    return value;
  }
  
  // Example: 1000 cents (10 USD) * 3.75 SAR/USD = 3750 cents SAR
  const convertedAmount = toCents(value.amountInCents * rate);
  
  return {
    amountInCents: convertedAmount,
    currency: targetCurrency,
  };
};

/**
 * Safely adds two MonetaryValues together.
 * Throws an error if currencies do not match, preventing mixed-currency addition.
 */
export const addMonetaryValues = (a: MonetaryValue, b: MonetaryValue): MonetaryValue => {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add mismatched currencies: ${a.currency} and ${b.currency}`);
  }
  return {
    amountInCents: a.amountInCents + b.amountInCents,
    currency: a.currency,
  };
};

/**
 * Safely subtracts MonetaryValue b from a.
 * Throws an error if currencies do not match.
 */
export const subtractMonetaryValues = (a: MonetaryValue, b: MonetaryValue): MonetaryValue => {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract mismatched currencies: ${a.currency} and ${b.currency}`);
  }
  return {
    amountInCents: a.amountInCents - b.amountInCents,
    currency: a.currency,
  };
};

/**
 * Parses a standard decimal number into a safe integer MonetaryValue.
 * e.g. 10.50 -> 1050 cents
 */
export const createMonetaryValue = (decimalAmount: number, currency: CurrencyCode): MonetaryValue => {
  return {
    amountInCents: toCents(decimalAmount * 100),
    currency,
  };
};

/**
 * Formats a MonetaryValue back into a decimal number for display.
 * e.g. 1050 cents -> 10.50
 */
export const toDecimalAmount = (value: MonetaryValue): number => {
  return value.amountInCents / 100;
};
