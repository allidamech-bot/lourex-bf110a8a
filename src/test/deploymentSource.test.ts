import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const run = (overrides: Record<string, string>) =>
  spawnSync(process.execPath, ["scripts/verify-deployment-source.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "production",
      VERCEL_GIT_REPO_OWNER: "allidamech-bot",
      VERCEL_GIT_REPO_SLUG: "lourex-bf110a8a",
      VERCEL_PROJECT_ID: "prj_KgRgeJKQKIu2F2ElkrbfEEXDUtA3",
      ...overrides,
    },
  });

describe("production deployment source guard", () => {
  it("accepts the canonical lou-rex.com repository and project", () => {
    const result = run({});
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/deployment source verified/i);
  });

  it("rejects the INVOICE repository", () => {
    const result = run({ VERCEL_GIT_REPO_SLUG: "INVOICE" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/must deploy only from allidamech-bot\/lourex-bf110a8a/i);
  });

  it("rejects production builds without Vercel Git metadata", () => {
    const result = run({ VERCEL_GIT_REPO_OWNER: "", VERCEL_GIT_REPO_SLUG: "" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/without Vercel Git source metadata/i);
  });

  it("rejects an unexpected Vercel project", () => {
    const result = run({ VERCEL_PROJECT_ID: "prj_wrong_project" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unexpected Vercel project/i);
  });
});
