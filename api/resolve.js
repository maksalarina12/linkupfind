import { resolve } from '../engine.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'POST only' }));
  }
  const chunks = [];
  let size = 0;
  let broken = false;
  await new Promise((done) => {
    req.on('data', (c) => {
      size += c.length;
      if (size > 100_000) { broken = true; req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', done);
    req.on('error', done);
  });
  if (broken) {
    res.statusCode = 413;
    return res.end(JSON.stringify({ ok: false, error: 'Request body too large' }));
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
  catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Invalid request body' }));
  }
  if (typeof body.url !== 'string' || !body.url.trim()) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'Invalid URL' }));
  }
  const out = await resolve(body.url);
  res.statusCode = out.ok ? 200 : 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(out));
}
