import { describe, expect, it } from "vitest";
import { conversionKind, measurementPath, measurementSource, safeMeasurementLocation } from "@/lib/searchMeasurement";
describe("public search measurement",()=>{
  it("classifies known search/AI sources without sending arbitrary UTM or referrer strings",()=>{
    expect(measurementSource("?utm_source=chatgpt.com","")).toBe("chatgpt.com");
    expect(measurementSource("?utm_source=person%40example.com","https://www.google.com.tr/search?q=private")).toBe("google");
    expect(measurementSource("?utm_source=person%40example.com","https://unknown.example/secret")).toBe("unattributed");
  });
  it("excludes private and tracking paths and redacts product slugs",()=>{
    for(const path of ["/dashboard","/customer-portal/requests","/track","/auth","/admin","/profile","/privacy"])expect(measurementPath(path)).toBeNull();
    expect(measurementPath("/ar/turkish-products")).toBe("/ar/turkish-products");
    expect(safeMeasurementLocation("/products/private-slug","chatgpt.com")).toBe("https://www.lou-rex.com/products/detail?utm_source=chatgpt.com");
    expect(safeMeasurementLocation("/request","customer@example.com")).toBe("https://www.lou-rex.com/request");
  });
  it("only maps successful public conversions, never operational identifiers",()=>{
    expect(conversionKind("purchase_request_submitted")).toBe("purchase_request");
    expect(conversionKind("smart_rfq_submitted")).toBe("smart_rfq");
    expect(conversionKind("contact_submitted")).toBe("contact");
    expect(conversionKind("purchase_request_updated")).toBeNull();
  });
});
