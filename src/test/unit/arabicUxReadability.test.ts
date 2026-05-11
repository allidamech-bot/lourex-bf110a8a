import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveHelpContent } from "@/features/help-center/services/helpContentResolver";

const srcRoot = join(process.cwd(), "src");
const sourceExtensions = new Set([".ts", ".tsx", ".css", ".md"]);
const mojibakeMarkers = [
  [0x00d8],
  [0x00d9],
  [0x00db],
  [0x00c3],
  [0x00c2],
  [0xfffd],
  [0x0637, 0x00a7],
  [0x0638, 0x201e],
  [0x0638, 0x2026],
  [0x0638, 0x0679],
  [0x0638, 0x2020],
  [0x0637, 0xb1],
  [0x0637, 0xa9],
].map((codes) => codes.map((code) => String.fromCharCode(code)).join(""));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return sourceExtensions.has(path.slice(path.lastIndexOf("."))) ? [path] : [];
  });

describe("Arabic UX readability safeguards", () => {
  it("keeps source text free of Arabic mojibake markers", () => {
    const offenders = walk(srcRoot).flatMap((path) => {
      const content = readFileSync(path, "utf8");
      return mojibakeMarkers.some((marker) => content.includes(marker)) ? [path.replace(process.cwd(), "")] : [];
    });

    expect(offenders).toEqual([]);
  });

  it("resolves critical Arabic help content for admin, partner, and customer flows", () => {
    expect(resolveHelpContent({ pageKey: "accounting", language: "ar", role: "owner" }).topics.length).toBeGreaterThan(3);
    expect(resolveHelpContent({ pageKey: "partner_settlements", language: "ar", role: "turkey_partner" }).summary).toContain("التسوية");
    expect(resolveHelpContent({ pageKey: "customer_tracking", language: "ar", role: "customer" }).summary).toContain("التتبع");
    expect(resolveHelpContent({ pageKey: "purchase_requests", language: "ar", role: "operations_employee" }).topics.some((topic) => topic.id === "payment")).toBe(true);
  });

  it("defines readable layout primitives with safe wrapping classes", () => {
    const primitives = readFileSync(join(srcRoot, "components", "readable", "ReadableCards.tsx"), "utf8");

    expect(primitives).toContain("minmax(min(100%,10rem),1fr)");
    expect(primitives).toContain("tracking-normal");
    expect(primitives).toContain("[word-break:normal]");
    expect(primitives).not.toContain("break-all");
  });
});
