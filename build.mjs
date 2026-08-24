import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const unzip = (value) => gunzipSync(Buffer.from(String(value).trim(), 'base64')).toString('utf8');
const text = (path) => readFile(path, 'utf8');

const [core64, ui64, packAraw, packBraw] = await Promise.all([
  text('core.js.b64'),
  text('ui.js.b64'),
  text('pack-a.json'),
  text('pack-b.json'),
]);

const packA = JSON.parse(packAraw);
const packB = JSON.parse(packBraw);

const javascript = [
  unzip(core64),
  unzip(ui64),
  unzip(packB['templates.js.b64']),
  unzip(packB['pages.js.b64']),
  unzip(packB['editor.js.b64']),
  unzip(packA['app.js.b64']),
].join('\n');

const css = [
  unzip(packA['app1.css.b64']),
  unzip(packA['app2.css.b64']),
].join('\n');

await mkdir('dist', { recursive: true });
await writeFile('dist/app.bundle.js', javascript);
await writeFile('dist/app.bundle.css', css);
await writeFile('dist/index.html', await text('index.html'));
await writeFile('dist/manifest.webmanifest', JSON.stringify({
  name: 'LOUREX Invoice',
  short_name: 'LOUREX',
  start_url: './',
  display: 'standalone',
  background_color: '#f7f4ee',
  theme_color: '#0b1d2d'
}, null, 2));

console.log(`Built LOUREX Invoice: ${javascript.length} JS bytes, ${css.length} CSS bytes`);
