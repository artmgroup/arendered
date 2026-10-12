import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const checked = new Set();
async function check(reference, parent = 'index.html') {
  if (!reference || /^(?:https?:|data:|#|mailto:|tel:)/.test(reference)) return;
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
const css = await readFile(path.join(root, 'styles/site.css'), 'utf8');
for (const match of css.matchAll(/url\("([^"]+)"\)/g)) await check(match[1], 'styles/site.css');
const context = { window: {} };
vm.runInNewContext(await readFile(path.join(root, 'content/projects.js'), 'utf8'), context);
assert.equal(context.window.ARENDERED_PROJECTS.length, 6);
for (const project of context.window.ARENDERED_PROJECTS) {
  for (const image of [project.cover, ...project.images]) {
    await check(image.src);
    if (image.srcset) for (const source of image.srcset.split(',')) await check(source.trim().split(/\s+/)[0]);
  }
}
const manifest = JSON.parse(await readFile(path.join(root, 'icons/site.webmanifest'), 'utf8'));
for (const icon of manifest.icons) await check(icon.src, 'icons/site.webmanifest');
if (process.argv[2]) {
  const base = new URL(process.argv[2]);
  for (const file of checked) {
    const response = await fetch(new URL(file, base));
    assert.equal(response.status, 200, `server serves ${file}`);
    await response.arrayBuffer();
  }
}
console.log(`PASS: 6 projects and ${checked.size} local resource paths`);
