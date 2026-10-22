import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const checked = new Set();
async function check(reference, parent = 'index.html') {
  if (!reference || /^(?:https?:|data:|blob:|#|mailto:|tel:)/.test(reference)) return;
  const file = path.resolve(root, path.dirname(parent), reference.split(/[?#]/)[0]);
  assert.ok(file.startsWith(root + path.sep), 'file stays inside the site');
  assert.ok((await stat(file)).isFile(), `file exists: ${reference}`);
  checked.add(path.relative(root, file));
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) await check(match[1]);
for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const source of match[1].split(',')) await check(source.trim().split(/\s+/)[0]);
}
for (const directory of ['styles', 'assets']) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:css|js)$/.test(entry.name)) continue;
    const parent = `${directory}/${entry.name}`;
    const source = await readFile(path.join(root, parent), 'utf8');
    for (const match of source.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) await check(match[1], parent);
  }
}
const context = { window: {} };
vm.runInNewContext(await readFile(path.join(root, 'content/projects.js'), 'utf8'), context);
const videos = context.window.MOVING_IMAGE_PORTFOLIO.projects;
const photographs = context.window.BROCHURE_PHOTOGRAPHY_PORTFOLIO.projects;
assert.equal(videos.length, 12);
assert.equal(photographs.length, 7);
assert.ok(!videos.some(project => project.key === 'national-museum-annals-2025'));
async function checkProjectValues(value) {
  if (typeof value === 'string' && value.startsWith('assets/')) await check(value);
  else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) await checkProjectValues(child);
  }
}
await checkProjectValues(context.window);
const runtime = await readFile(path.join(root, 'scripts/site.js'), 'utf8');
for (const match of runtime.matchAll(/["'`](assets\/[^"'`\s]+)["'`]/g)) {
  if (!match[1].includes('${')) await check(match[1]);
}
for (const match of runtime.matchAll(/import\(["']([^"']+)["']\)/g)) await check(match[1], 'scripts/site.js');
const manifest = JSON.parse(await readFile(path.join(root, 'icons/site.webmanifest'), 'utf8'));
for (const icon of manifest.icons) await check(icon.src, 'icons/site.webmanifest');
if (process.argv[2]) {
  const base = new URL(process.argv[2]);
  for (const file of checked) {
    const response = await fetch(new URL(file, base), { method: 'HEAD' });
    assert.equal(response.status, 200, `server serves ${file}`);
  }
}
console.log(`PASS: ${videos.length} films, ${photographs.length} photography projects and ${checked.size} local resource paths`);
