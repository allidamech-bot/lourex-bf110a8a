import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const origin = "https://www.lou-rex.com";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[ch]);

export function renderAeoHtml(template, kind, content) {
  const page = content.pages[kind];
  if (!page || !/^\/[a-z-]+$/.test(page.path)) throw new Error("Invalid AEO route");
  const url = origin + page.path;
  const title = page.h1En.toLowerCase().includes("lourex") ? page.h1En : page.h1En + " | LOUREX";
  const description = page.introEn;
  const replaceOnce = (input, pattern, replacement) => {
    if (!pattern.test(input)) throw new Error("Missing template marker: " + pattern);
    return input.replace(pattern, () => replacement);
  };
  let html = replaceOnce(template, /<title>[\s\S]*?<\/title>/, "<title>" + escapeHtml(title) + "</title>");
  html = replaceOnce(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '<link rel="canonical" href="' + url + '" />');
  for (const [attr, name, value] of [
    ["name", "description", description], ["property", "og:title", title],
    ["property", "og:description", description], ["property", "og:url", url],
    ["name", "twitter:title", title], ["name", "twitter:description", description],
  ]) {
    const pattern = new RegExp('<meta\\s+' + attr + '="' + name + '"\\s+content="[^"]*"\\s*/?>');
    html = replaceOnce(html, pattern, '<meta ' + attr + '="' + name + '" content="' + escapeHtml(value) + '" />');
  }
  const links = content.relatedLinks.map(link => {
    if (!/^\/[a-z-]+$/.test(link.to)) throw new Error("Invalid internal link");
    return '<a class="rounded-full border border-primary/20 px-4 py-2 text-sm" href="' + link.to + '">' + escapeHtml(link.en) + '</a>';
  }).join("");
  const body = '<div id="root"><div class="lourex-public lourex-aeo min-h-screen bg-background text-foreground">' +
    '<header class="container mx-auto px-4 py-6"><a href="/"><img src="/lourex-official.jpeg" alt="LOUREX" width="72" height="72"></a></header>' +
    '<main class="container mx-auto px-4 py-14 md:px-8 md:py-20"><div class="max-w-4xl">' +
    '<p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">LOUREX / TRADE &amp; RESOURCES</p>' +
    '<h1 class="mt-5 font-serif text-4xl font-bold text-foreground md:text-6xl">' + escapeHtml(page.h1En) + '</h1>' +
    '<p class="mt-6 text-lg leading-9 text-foreground">' + escapeHtml(description) + '</p>' +
    (kind === "about" ? "" : '<p class="mt-5 text-base leading-8 text-muted-foreground">' + escapeHtml(content.enDefinition) + '</p>') +
    '</div><section class="mt-10 grid gap-4 md:grid-cols-2"><div class="rounded-[1.5rem] border border-primary/20 bg-card p-6">' +
    '<h2 class="font-serif text-2xl font-semibold text-foreground">How LOUREX works</h2><p class="mt-4 text-sm leading-7 text-muted-foreground">' + escapeHtml(page.focusEn) + '</p></div>' +
    '<div class="rounded-[1.5rem] border border-primary/20 bg-card p-6"><h2 class="font-serif text-2xl font-semibold text-foreground">Sourcing focus</h2>' +
    '<p class="mt-4 text-sm leading-7 text-muted-foreground">' + escapeHtml(content.enFocus) + '</p></div></section>' +
    '<section class="mt-10 rounded-[1.5rem] border border-border/70 bg-secondary/65 p-6"><h2 class="font-serif text-2xl font-semibold">Related public pages</h2>' +
    '<nav class="mt-5 flex flex-wrap gap-2" aria-label="Related public pages">' + links + '</nav></section></main></div></div>';
  return replaceOnce(html, /<div id="root"><div class="lrx-boot"[^>]*>[\s\S]*?<\/div><\/div>/, body);
}

export async function generateAeoPages(dist = "dist", source = "src/lib/aeo-content.json") {
  const template = await readFile(join(dist, "index.html"), "utf8");
  const content = JSON.parse(await readFile(source, "utf8"));
  const routes = new Set();
  for (const [kind, page] of Object.entries(content.pages)) {
    if (!/^\/[a-z-]+$/.test(page.path) || routes.has(page.path)) throw new Error("Invalid or duplicate AEO route");
    routes.add(page.path);
    const rendered = renderAeoHtml(template, kind, content);
    const folder = join(dist, page.path.slice(1));
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "index.html"), rendered);
  }
  console.log("Generated " + routes.size + " static public AEO pages from shared content");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generateAeoPages();
}
