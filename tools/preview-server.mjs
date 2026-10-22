import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.otf': 'font/otf', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.sog': 'application/octet-stream', '.splat': 'application/octet-stream', '.spz': 'application/octet-stream', '.ply': 'application/octet-stream', '.rad': 'application/octet-stream', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filename = path.resolve(root, relative);
    const extension = path.extname(relative).toLowerCase();
    const allowed = filename.startsWith(root) && (['index.html', 'favicon.ico'].includes(relative) || /^(?:scripts|styles|content|fonts|icons|animations|images|assets)\//.test(relative) && Object.hasOwn(types, extension));
    if (!allowed) { response.writeHead(404); response.end('Not found'); return; }
    const info = await stat(filename);
    if (!info.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    const headers = { 'Content-Type': types[extension], 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    let start = 0;
    let end = info.size - 1;
    let status = 200;
    if (request.headers.range) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
      start = range ? Number(range[1]) : -1;
      end = range?.[2] ? Math.min(Number(range[2]), end) : end;
      if (start < 0 || start > end || start >= info.size) {
        response.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
        response.end();
        return;
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    response.writeHead(status, headers);
    if (request.method === 'HEAD' || !info.size) { response.end(); return; }
    const stream = createReadStream(filename, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`ARENDERED: http://127.0.0.1:${port}`));
