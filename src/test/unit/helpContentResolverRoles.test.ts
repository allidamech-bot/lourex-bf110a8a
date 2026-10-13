import { describe, expect, it } from "vitest";
import { audienceFromRole } from "@/features/help-center/services/helpContentResolver";

describe("canonical LOUREX partner help roles", () => {
  it("routes both partner roles to partner guidance", () => {
    expect(audienceFromRole("turkish_partner")).toBe("partner");
    expect(audienceFromRole("saudi_partner")).toBe("partner");
  });

  it("does not misclassify owner and customer audiences", () => {
    expect(audienceFromRole("owner")).toBe("admin");
    expect(audienceFromRole("customer")).toBe("customer");
  });
});
