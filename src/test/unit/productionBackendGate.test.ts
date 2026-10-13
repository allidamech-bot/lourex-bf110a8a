import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const executeProductionGate = (url?: string, publishableKey?: string) => {
  const env = {
    ...process.env,
    VERCEL_ENV: "production",
    VERCEL_GIT_REPO_OWNER: "allidamech-bot",
    VERCEL_GIT_REPO_SLUG: "lourex-bf110a8a",
    VERCEL_PROJECT_ID: "prj_KgRgeJKQKIu2F2ElkrbfEEXDUtA3",
    VITE_SUPABASE_URL: url ?? "",
    VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey ?? "",
  };
  return spawnSync(process.execPath, ["scripts/verify-deployment-source.mjs"], {
    env,
    encoding: "utf8",
  });
};

describe("LOUREX production backend guard", () => {
  it("accepts the confirmed database with a publishable key", () => {
    const result = executeProductionGate("https://gxmqchznfolerliorpkz.supabase.co", "test-only-key");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("LOUREX primary deployment source verified");
  });

  it("rejects the still deployed legacy Supabase project", () => {
    const result = executeProductionGate("https://qezrzwoiyhbjrrxnrqra.supabase.co", "test-only-key");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Refusing LOUREX production build: Supabase project URL");
  });

  it("rejects missing backend settings and invalid URL schemes", () => {
    expect(executeProductionGate(undefined, "test-only-key").status).not.toBe(0);
    expect(executeProductionGate("http://gxmqchznfolerliorpkz.supabase.co", "test-only-key").status).not.toBe(0);
    expect(executeProductionGate("https://gxmqchznfolerliorpkz.supabase.co").status).not.toBe(0);
  });

  it("pins the source and local Supabase config to one verified project", () => {
    const client = readFileSync("src/integrations/supabase/client.ts", "utf8");
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(client).toContain('EXPECTED_SUPABASE_PROJECT_REF = "gxmqchznfolerliorpkz"');
    expect(config).toContain('project_id = "gxmqchznfolerliorpkz"');
  });
});
