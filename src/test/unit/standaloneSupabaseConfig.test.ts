import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(name, "utf8");
const legacyRef = ["qezr", "zwoi", "yhbj", "rrxn", "rqra"].join("");

describe("standalone LOUREX Supabase configuration", () => {
  it("pins source and Supabase CLI to the same independent project", () => {
    const client = read("src/integrations/supabase/client.ts");
    const config = read("supabase/config.toml");
    const example = read(".env.example");

    expect(client).toContain('EXPECTED_SUPABASE_PROJECT_REF = "gxmqchznfolerliorpkz"');
    expect(config).toContain('project_id = "gxmqchznfolerliorpkz"');
    expect(example).toContain("https://gxmqchznfolerliorpkz.supabase.co");
    expect(example).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(example).not.toContain("VITE_SUPABASE_ANON_KEY");
    expect(client).not.toContain(legacyRef);
    expect(config).not.toContain(legacyRef);
  });

  it("rejects mistaken backend in production at build time", () => {
    const gate = read("scripts/verify-deployment-source.mjs");
    expect(gate).toContain('EXPECTED_SUPABASE_PROJECT_REF = "gxmqchznfolerliorpkz"');
    expect(gate).toContain("VITE_SUPABASE_URL");
    expect(gate).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(gate).toContain("throw new Error(");
  });

  it("does not depend on the retired hosted AI gateway", () => {
    const fn = read("supabase/functions/lourex-ai-chat/index.ts");
    const env = read(".env.example");
    expect(fn).toContain('Deno.env.get("AI_API_KEY")');
    expect(fn).toContain('Deno.env.get("AI_CHAT_COMPLETIONS_URL")');
    expect(fn).toContain('Deno.env.get("AI_MODEL")');
    expect(fn).toContain('providerUrl.protocol !== "https:"');
    expect(fn).not.toContain("ai.gateway." + "lovable.dev");
    expect(fn).not.toContain("LOVABLE_API_KEY");
    expect(env).not.toContain("LOVABLE_API_KEY");
  });
});
