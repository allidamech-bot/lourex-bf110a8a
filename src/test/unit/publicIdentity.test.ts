import { describe, expect, it } from "vitest";
import { publicContactInfo } from "@/lib/contactInfo";
import aeoContent from "@/lib/aeo-content.json";
describe("public identity claims", () => {
  it("does not publish an unconfirmed registration or physical address", () => {
    expect(publicContactInfo).not.toHaveProperty("commercialRegistration");
    expect(publicContactInfo).not.toHaveProperty("location");
    expect(publicContactInfo.websiteUrl).toBe("https://www.lou-rex.com");
  });
  it("describes the platform and requires a confirmed contracting party", () => {
    expect(aeoContent.pages.about.focusEn).toContain("sourcing coordination platform");
    expect(aeoContent.pages.about.focusEn).toContain("contracting party");
  });
});
