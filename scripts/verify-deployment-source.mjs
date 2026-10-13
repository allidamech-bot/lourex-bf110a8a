const EXPECTED_REPO_OWNER = "allidamech-bot";
const EXPECTED_REPO_SLUG = "lourex-bf110a8a";
const EXPECTED_PROJECT_ID = "prj_KgRgeJKQKIu2F2ElkrbfEEXDUtA3";
const EXPECTED_SUPABASE_PROJECT_REF = "gxmqchznfolerliorpkz";

const vercelEnvironment = process.env.VERCEL_ENV || "local";
if (vercelEnvironment !== "production") process.exit(0);

const sourceRepoOwner = process.env.VERCEL_GIT_REPO_OWNER || "";
const sourceRepoSlug = process.env.VERCEL_GIT_REPO_SLUG || "";
const projectId = process.env.VERCEL_PROJECT_ID || "";

if (!sourceRepoOwner || !sourceRepoSlug) {
  throw new Error(
    `Refusing production build without Vercel Git source metadata. lou-rex.com must deploy only from ${EXPECTED_REPO_OWNER}/${EXPECTED_REPO_SLUG}.`,
  );
}

if (
  sourceRepoOwner.toLowerCase() !== EXPECTED_REPO_OWNER.toLowerCase() ||
  sourceRepoSlug.toLowerCase() !== EXPECTED_REPO_SLUG.toLowerCase()
) {
  throw new Error(
    `Refusing production build from ${sourceRepoOwner}/${sourceRepoSlug}. lou-rex.com must deploy only from ${EXPECTED_REPO_OWNER}/${EXPECTED_REPO_SLUG}.`,
  );
}

if (projectId && projectId !== EXPECTED_PROJECT_ID) {
  throw new Error(
    `Refusing production build in unexpected Vercel project ${projectId}. lou-rex.com belongs to ${EXPECTED_PROJECT_ID}.`,
  );
}

// Vite replaces VITE_* configuration during compilation. Reject the build before
// it can publish a client pointed at the wrong project (even if its CI is green).
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || "";
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
let actualSupabaseRef = "";
try {
  const url = new URL(supabaseUrl);
  actualSupabaseRef =
    url.protocol === "https:"
      ? url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1] || ""
      : "";
} catch {
  // A missing or invalid URL must fail the production build below.
}

if (actualSupabaseRef !== EXPECTED_SUPABASE_PROJECT_REF || !supabasePublishableKey) {
  throw new Error(
    "Refusing LOUREX production build: Supabase project URL or publishable key is " +
      "missing or does not match the confirmed production database. " +
      "Review the production environment and target schema before deployment.",
  );
}

console.log(
  `LOUREX primary deployment source verified for ${sourceRepoOwner}/${sourceRepoSlug}${projectId ? ` on ${projectId}` : ""}.`,
);
