import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/components/ErrorBoundary";
import { resolveProductionFallback } from "@/components/production/productionFallbackResolver";

const srcRoot = join(process.cwd(), "src");
const sourceExtensions = new Set([".ts", ".tsx", ".css", ".md"]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return sourceExtensions.has(path.slice(path.lastIndexOf("."))) ? [path] : [];
  });

const ThrowingSection = () => {
  throw new Error("boom");
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("production hardening safeguards", () => {
  it("keeps the old external Supabase project reference out of source", () => {
    const oldProjectRef = "legacy-lourex-supabase-project-ref";
    const offenders = walk(srcRoot).filter((path) => readFileSync(path, "utf8").includes(oldProjectRef));
    expect(offenders).toEqual([]);
  });

  it("resolves production fallback copy for runtime and backend failures", () => {
    expect(resolveProductionFallback("backend", "en").title).toBe("Backend unavailable");
    expect(resolveProductionFallback("aiService", "ar").body).toContain("توصيات الذكاء");
    expect(resolveProductionFallback("runtimeEmpty", "en").body).toContain("runtime events");
  });

  it("renders error boundary fallback instead of crashing a heavy section", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary fallback={<div>Section fallback</div>}>
        <ThrowingSection />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Section fallback")).toBeInTheDocument();
  });
});
