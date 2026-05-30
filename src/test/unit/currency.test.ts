import { describe, it, expect } from "vitest";
import { formatMoney, normalizeCurrencyCode, getCurrencyDisplay } from "../../lib/currency";

describe("currency helper", () => {
  it("formats common currencies correctly", () => {
    expect(formatMoney(1000, "SAR")).toBe("1,000 SAR");
    expect(formatMoney(1000, "USD")).toBe("1,000 USD");
    expect(formatMoney(1000, "EUR")).toBe("1,000 EUR");
    expect(formatMoney(1000, "TRY")).toBe("1,000 TRY");
  });

  it("handles null/undefined amounts safely", () => {
    expect(formatMoney(null, "USD")).toBe("0 USD");
    expect(formatMoney(undefined, "EUR")).toBe("0 EUR");
    expect(formatMoney(NaN, "TRY")).toBe("0 TRY");
  });

  it("handles missing currency by falling back to SAR", () => {
    expect(formatMoney(1500)).toBe("1,500 SAR");
    expect(formatMoney(1500, null)).toBe("1,500 SAR");
    expect(formatMoney(1500, "")).toBe("1,500 SAR");
    expect(formatMoney(1500, "  ")).toBe("1,500 SAR");
  });

  it("handles invalid or custom currency codes without throwing", () => {
    expect(formatMoney(1000, "XYZ")).toBe("1,000 XYZ");
    expect(formatMoney(1000, "unknown-code")).toBe("1,000 UNKNOWN-CODE");
  });

  it("normalizes currency display", () => {
    expect(getCurrencyDisplay("usd")).toBe("USD");
    expect(normalizeCurrencyCode("eur ")).toBe("EUR");
    expect(getCurrencyDisplay(null)).toBe("SAR");
  });
});
