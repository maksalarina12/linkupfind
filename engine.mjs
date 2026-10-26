// LINKUPFIND resolver engine (shared: local server + Vercel function)
// pure fetch logic, zero dependencies

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const REFERRER = 'https://www.google.com/';

const MEDIA_RE =
  /\.(mp4|mkv|webm|avi|mov|flv|wmv|ts|m3u8|mp3|m4a|aac|ogg|wav|flac|zip|rar|7z|pdf|epub|apk|exe|iso)(\?|#|$)/i;

const IFRAME_RE = /<iframe[^>]+src=["']([^"']+)["']/gi;
const EMBED_RE = /(?:href|src|data-url|data-src|data-href|data-page|action|formaction|poster|cite)=["']([^"']+)["']/gi;
const META_REFRESH_RE = /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["']?(\d+)\s*;\s*url=([^"'>]+)/gi;
const JS_LOCATION_RE =
  /(?:window\.|document\.)?location(?:\.href|\.replace\()?\s*[=(]\s*["']([^"';]+)["']|window\.open\(\s*["']([^"']+)["']/gi;

const MAX_FETCH_BUDGET = 14;
const MAX_MINUTES = 90000;

function rawUrl(raw) {
  raw = raw.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return normUrl(raw);
}

function normUrl(raw, base) {
  try {
    const u = new URL(raw.trim(), base);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.protocol === 'http:' && u.hostname === 'localhost') return u.toString();
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function isSameHost(a, b) {
  try {
    return new URL(a).hostname === new URL(b).hostname;
  } catch {
    return false;
  }
}

function isAdNoise(u) {
  try {
    const h = new URL(u).hostname;
    if (/doubleclick|adservice|googleads|googlesyndication|facebook\.com|analytics|scorecardresearch|criteo|taboola|outbrain/i.test(h)) return true;
    return /\/(favicon|logo|sprite|assets|static|images|img)(\/|\.)/i.test(new URL(u).pathname) && !MEDIA_RE.test(new URL(u).pathname.split('/').pop() || '');
  } catch {
    return true;
  }
}

async function fetchPage(url, { head = false, timeout = MAX_MINUTES } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: head ? 'HEAD' : 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': UA,
        Referer: REFERRER,
        Accept: head ? '*/*' : 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      },
      signal: AbortSignal.timeout(timeout),
    });
    let body = null;
    if (!head) {
      body = await res.text();
      if (body.length > 3_000_000) body = body.slice(0, 3_000_000);
    }
    return { res, body, started, ms: Date.now() - started, error: null };
  } catch (e) {
    return { res: null, body: null, started, ms: Date.now() - started, error: e.message || String(e) };
  }
}

function decodeMaybe(v) {
  if (!v) return null;
  let out = v.trim();
  for (let i = 0; i < 3; i++) {
    try {
      const dec = decodeURIComponent(out);
      if (dec === out) break;
      out = dec;
    } catch {
      break;
    }
  }
  return out;
}

function extractLinks(html, baseUrl) {
  const found = { media: [], candidates: [], iframes: [], metaRefresh: [], jsRedirects: [] };
  const push = (arr, raw, kind) => {
    const dec = decodeMaybe(raw);
    if (!dec || /^\d+\s*;/.test(dec)) return;
    const urls = [dec];
    // param-like redirects: portal.php?url=...&go=http%3A%2F%2F...
    const qs = dec ? [...dec.matchAll(/[?&](?:url|u|go|link|target|r|dest|destination|redirect|to|site)=(https?%3A[^&"']+)/gi)] : [];
    for (const q of qs) {
      const inner = decodeMaybe(decodeURIComponent(q[1]));
      if (inner) urls.push(inner);
    }
    for (const u of urls) {
      const abs = normUrl(u, baseUrl);
      if (!abs || isAdNoise(abs)) continue;
      if (abs.startsWith('data:')) continue;
      // resource bukan halaman: css/js/font & gambar tidak layak jadi step / media
      if (/\.(css|js|mjs|json|woff2?|ttf|otf|svg|jpe?g|png|gif|webp|ico)(\?|#|$)/i.test(abs)) continue;
      arr.push({ u: abs, kind });
    }
  };

  let m;
  EMBED_RE.lastIndex = 0;
  while ((m = EMBED_RE.exec(html))) push(found.media, m[1], 'attribute');
  const PLAIN_MEDIA_RE = /["'(](https?:\/\/[^"'()\s]+?\.(?:mp4|mkv|webm|avi|mov|flv|wmv|ts|m3u8|mp3|m4a|aac|ogg|wav|flac|zip|rar|7z|pdf|epub|apk|exe|iso)[^"'()\s]*)["')]/gi;
  while ((m = PLAIN_MEDIA_RE.exec(html))) push(found.media, m[1], 'plain-src');
  IFRAME_RE.lastIndex = 0;
  while ((m = IFRAME_RE.exec(html))) {
    const abs = normUrl(m[1], baseUrl);
    if (abs) found.iframes.push(abs);
  }
  META_REFRESH_RE.lastIndex = 0;
  while ((m = META_REFRESH_RE.exec(html))) {
    const abs = normUrl(m[2], baseUrl);
    if (abs) found.metaRefresh.push({ u: abs, delay: +m[1] });
  }
  JS_LOCATION_RE.lastIndex = 0;
  while ((m = JS_LOCATION_RE.exec(html))) {
    const abs = normUrl(m[1] || m[2], baseUrl);
    if (abs) found.jsRedirects.push(abs);
  }

  const seen = new Set();
  const uniq = (list) => list.filter((x) => (seen.has(x.u) ? false : (seen.add(x.u), true)));
  found.media = uniq(found.media.concat(found.iframes.map((u) => ({ u, kind: 'iframe' }))));
  found.candidates = uniq([
    ...found.metaRefresh.map((x) => ({ u: x.u, kind: 'meta-refresh' })),
    ...found.jsRedirects.map((u) => ({ u, kind: 'js-redirect' })),
  ]);
  return found;
}

function hopEntry(type, url, { status, ms, note, error } = {}) {
  return { type, url, status, ms, note, error };
}

async function probe(url) {
  let r = await fetchPage(url, { head: true });
  if (r.error || !r.res) r = await fetchPage(url, { head: false, timeout: 30000 });
  if (r.error || !r.res) return { ok: false, error: r.error };
  const ct = r.res.headers.get('content-type') || '';
  const cl = +(r.res.headers.get('content-length') || 0);
  const cr = r.res.headers.get('content-range');
  let size = cl;
  if (cr) {
    const m = cr.match(/\/(\d+)$/);
    if (m) size = +m[1];
  }
  return { ok: true, contentType: ct, size };
}

function fmtSize(bytes) {
  if (!bytes) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function resolve(inputUrl) {
  const trace = [];
  const errors = [];
  let current = rawUrl(inputUrl);
  if (!current) return { ok: false, error: 'Invalid URL' };

  trace.push(hopEntry('input', current));
  const origin = current;

  let hops = 0;
  let html = null;
  let budget = MAX_FETCH_BUDGET;

  while (budget-- > 0 && hops < 10) {
    const r = await fetchPage(current);
    if (r.error) {
      trace.push(hopEntry('fetch', current, { error: r.error }));
      errors.push(`Failed fetching ${current}: ${r.error}`);
      break;
    }
    const loc = r.res.headers.get('location');
    if (r.res.status >= 300 && r.res.status < 400 && loc) {
      const next = normUrl(loc, current);
      trace.push(hopEntry('redirect', current, { status: r.res.status, ms: r.ms, note: next ? `→ ${new URL(next).hostname}${new URL(next).pathname}` : 'redirect without location' }));
      if (!next) break;
      current = next;
      hops++;
      continue;
    }
    const ct = r.res.headers.get('content-type') || '';
    trace.push(hopEntry('page', current, { status: r.res.status, ms: r.ms, note: ct }));
    if (!ct.startsWith('text/html') && !ct.startsWith('application/xhtml')) {
      if (MEDIA_RE.test(current)) {
        return { ok: true, input: inputUrl, trace, media: [{ url: current, contentType: ct, size: fmtSize(+r.res.headers.get('content-length') || 0) }], errors };
      }
      errors.push(`Page is not HTML (${ct}) and not a direct media file.`);
      break;
    }
    html = r.body;
    break;
  }

  if (!html) return { ok: true, input: inputUrl, trace, primary: current !== origin ? current : null, media: [], links: [], errors };

  const chainEnd = current;
  const page = extractLinks(html, current);
  const queue = [
    ...page.media.filter((md) => !isAdNoise(md.u)).map((md) => ({ u: md.u })),
    ...page.candidates,
  ];
  const visited = new Set([current]);
  const t0 = Date.now();
  const BUDGET_MS = 120_000;
  let depth = 0;

  const allMedia = new Map();

  while (budget-- > 0 && depth < 6 && Date.now() - t0 < BUDGET_MS) {
    const candidate = queue.shift();
    if (!candidate) break;
    if (allMedia.has(candidate.u) || visited.has(candidate.u)) continue;
    visited.add(candidate.u);

    // if candidate itself looks like a media file, verify
    if (MEDIA_RE.test(new URL(candidate.u).pathname)) {
      const p = await probe(candidate.u);
      if (p.ok) {
        allMedia.set(candidate.u, { url: candidate.u, contentType: p.contentType.split(';')[0], size: fmtSize(p.size) });
        trace.push(hopEntry('media', candidate.u, { note: p.contentType }));
        continue;
      }
      trace.push(hopEntry('media-fail', candidate.u, { error: p.error }));
      continue;
    }

    const r = await fetchPage(candidate.u);
    if (r.error) {
      trace.push(hopEntry('step', candidate.u, { error: r.error }));
      continue;
    }
    const loc = r.res.headers.get('location');
    if (r.res.status >= 300 && r.res.status < 400 && loc) {
      const next = normUrl(loc, candidate.u);
      trace.push(hopEntry('redirect', candidate.u, { status: r.res.status, ms: r.ms, note: next ? `→ ${new URL(next).hostname}` : '' }));
      if (next) queue.unshift({ u: next, kind: 'redirect' });
      continue;
    }
    const ct = r.res.headers.get('content-type') || '';
    trace.push(hopEntry('step', candidate.u, { status: r.res.status, ms: r.ms, note: ct.split(';')[0] }));
    if (ct.startsWith('text/html')) {
      const sub = extractLinks(r.body, candidate.u);
      const mediaFirst = sub.media
        .filter((md) => !allMedia.has(md.u) && !isAdNoise(md.u))
        .map((md) => ({ u: md.u }));
      queue.unshift(...mediaFirst);
      for (const c of sub.candidates) if (isSameHost(c.u, candidate.u) || queue.length < 8) queue.push(c);
      depth++;
    }
  }

  // media yang tak sempat diverifikasi (budget habis)
  const unverified = [];
  for (const md of page.media) {
    if (allMedia.has(md.u)) continue;
    if (MEDIA_RE.test(new URL(md.u).pathname) && !isAdNoise(md.u)) unverified.push({ url: md.u, contentType: null, size: null });
    if (allMedia.size + unverified.length >= 25) break;
  }

  // urutkan: video/audio/arsip dulu, gambar & lainnya belakangan
  const rank = (ct) => {
    const t = ct || '';
    if (/^(video|audio)\//.test(t) || /mp4|mkv|webm|mp3|zip|rar|7z|apk/i.test(t)) return 0;
    if (/image\//.test(t)) return 2;
    return 1;
  };
  const merged = [...allMedia.values(), ...unverified].slice(0, 25);
  merged.sort((a, b) => rank(a.contentType) - rank(b.contentType) || (b.contentType ? 1 : 0) - (a.contentType ? 1 : 0));

  return {
    ok: true,
    input: inputUrl,
    trace,
    primary: merged.length || chainEnd === origin ? null : chainEnd,
    media: merged,
    links: page.candidates.map((c) => c.u).filter((u) => !isSameHost(u, inputUrl)).slice(0, 25),
    errors,
  };
}


export { resolve };
