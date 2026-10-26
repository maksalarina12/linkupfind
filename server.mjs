import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { resolve } from './engine.mjs';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME_TYPE = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  let file = req.url === '/' ? 'index.html' : req.url.split('?')[0];
  const fp = path.join(PUBLIC_DIR, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!fp.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME_TYPE[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/resolve') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 100_000) req.destroy(); });
    req.on('end', async () => {
      let body;
      try { body = JSON.parse(raw); } catch { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: 'Invalid request body' })); }
      const out = await resolve(body.url || '');
      res.writeHead(out.ok ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  LINKUPFIND berjalan → http://localhost:${PORT}\n`);
});
