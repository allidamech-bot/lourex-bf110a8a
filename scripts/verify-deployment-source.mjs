const EXPECTED_REPO_OWNER='allidamech-bot';
const EXPECTED_REPO_SLUG='lourex-bf110a8a';
const EXPECTED_PROJECT_ID='prj_KgRgeJKQKIu2F2ElkrbfEEXDUtA3';

const vercelEnvironment=process.env.VERCEL_ENV||'local';
if(vercelEnvironment!=='production')process.exit(0);

const sourceRepoOwner=process.env.VERCEL_GIT_REPO_OWNER||'';
const sourceRepoSlug=process.env.VERCEL_GIT_REPO_SLUG||'';
const projectId=process.env.VERCEL_PROJECT_ID||'';

if(!sourceRepoOwner||!sourceRepoSlug){
  throw new Error(`Refusing production build without Vercel Git source metadata. lou-rex.com must deploy only from ${EXPECTED_REPO_OWNER}/${EXPECTED_REPO_SLUG}.`);
}

if(sourceRepoOwner.toLowerCase()!==EXPECTED_REPO_OWNER.toLowerCase()||sourceRepoSlug.toLowerCase()!==EXPECTED_REPO_SLUG.toLowerCase()){
  throw new Error(`Refusing production build from ${sourceRepoOwner}/${sourceRepoSlug}. lou-rex.com must deploy only from ${EXPECTED_REPO_OWNER}/${EXPECTED_REPO_SLUG}.`);
}

if(projectId&&projectId!==EXPECTED_PROJECT_ID){
  throw new Error(`Refusing production build in unexpected Vercel project ${projectId}. lou-rex.com belongs to ${EXPECTED_PROJECT_ID}.`);
}

console.log(`LOUREX primary deployment source verified for ${sourceRepoOwner}/${sourceRepoSlug}${projectId?` on ${projectId}`:''}.`);
