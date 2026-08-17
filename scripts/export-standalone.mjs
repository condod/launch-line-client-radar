import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const distDir = join(root, 'dist');
const htmlPath = join(distDir, 'index.html');
const outputPath = join(root, 'standalone.html');

const html = await readFile(htmlPath, 'utf8');

async function inlineStyles(markup) {
  const stylesheetRegex = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
  let next = markup;
  for (const match of [...markup.matchAll(stylesheetRegex)]) {
    const href = match[1].replace(/^\.\//, '');
    const cssPath = join(distDir, href);
    const css = await readFile(cssPath, 'utf8');
    next = next.replace(match[0], () => `<style>\n${css}\n</style>`);
  }
  return next;
}

async function inlineScripts(markup) {
  const scriptRegex = /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g;
  let next = markup;
  for (const match of [...markup.matchAll(scriptRegex)]) {
    const src = match[1].replace(/^\.\//, '');
    const jsPath = join(distDir, src);
    const js = await readFile(jsPath, 'utf8');
    if (/^\s*(import|export)\s/m.test(js)) {
      throw new Error(`Standalone export found an ESM import/export in ${src}.`);
    }
    next = next.replace(match[0], '');
    next = next.replace('</body>', () => `  <script>\n${js}\n</script>\n  </body>`);
  }
  return next;
}

async function inlineBrandAsset(markup) {
  const filename = 'launch-line-digital.png';
  const image = await readFile(join(distDir, filename));
  const dataUrl = `data:image/png;base64,${image.toString('base64')}`;
  const withoutExternalFavicon = markup.replace(/\s*<link rel="icon"[^>]*launch-line-digital\.png[^>]*>\s*/g, '\n');
  return withoutExternalFavicon.split(`./${filename}`).join(dataUrl);
}

let standalone = await inlineStyles(html);
standalone = await inlineScripts(standalone);
standalone = await inlineBrandAsset(standalone);
standalone = standalone
  .replace(/\s*<link rel="manifest"[^>]*>\s*/g, '\n')
  .replace(/crossorigin/g, '')
  .replace('</head>', '  <meta name="x-standalone-export" content="inline-css-js" />\n  </head>');

await writeFile(outputPath, standalone, 'utf8');
console.log(`Wrote ${outputPath}`);
