const $ = (sel) => document.querySelector(sel);

const form = $('#form');
const input = $('#url');
const btn = $('#btn');
const output = $('#output');
const emptyState = $('#empty-state');
const intro = $('#intro');
const conn = $('#conn-state');
const histWrap = $('#history');

const HIST_KEY = 'linkupfind_history';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shortenUrl(u) {
  try {
    const p = new URL(u);
    const path = p.pathname === '/' ? '' : p.pathname;
    return { host: p.hostname.replace(/^www\./, ''), path: decodeURIComponent(path) };
  } catch {
    return { host: u, path: '' };
  }
}

function setConn(state, label) {
  conn.className = `conn ${state}`;
  conn.querySelector('.conn-label').textContent = label;
}

/* ---------- history ---------- */
function loadHist() {
  const list = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  histWrap.innerHTML = '';
  list.slice(0, 6).forEach((u) => {
    const b = document.createElement('button');
    b.className = 'hist-link mono';
    b.textContent = u;
    b.title = u;
    b.addEventListener('click', () => { input.value = u; form.requestSubmit(); });
    histWrap.appendChild(b);
  });
  if (list.length) {
    const clr = document.createElement('button');
    clr.className = 'hist-clear mono';
    clr.textContent = '× clear';
    clr.title = 'clear history';
    clr.addEventListener('click', () => { localStorage.removeItem(HIST_KEY); loadHist(); });
    histWrap.appendChild(clr);
  }
}

/* ---------- render ---------- */
function render(data, inputUrl) {
  emptyState.hidden = true;
  intro.classList.add('done');
  output.hidden = false;

  output.innerHTML = `
    ${buildTrace(data)}
    ${buildPrimary(data.primary)}
    <div class="sect-head"><span>results · verified files <span class="tag">${(data.media || []).length}</span></span><span>head-checked</span></div>
    ${buildMedia(data.media || []) || '<p class="lede">No media files found in this chain. Check the intermediate links below.</p>'}
    ${buildLinks(data.links || [])}
    ${buildErrors(data.errors || [])}
  `;

  wireCopy();
  initInteractions();

  const list = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
  const next = [inputUrl, ...list.filter((x) => x !== inputUrl)].slice(0, 12);
  localStorage.setItem(HIST_KEY, JSON.stringify(next));
loadHist();

/* UTC tick clock */
const clock = $('#clock');
function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  clock.textContent = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}
tickClock();
setInterval(tickClock, 1000);

/* console shortcuts: / focus, esc clear */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  }
  if (e.key === 'Escape' && document.activeElement === input) {
    input.blur();
    input.value = '';
  }
});

/* ambient parallax: horizon glow tracks cursor */
if (!reducedMotion) {
  let px = 0, py = 0, raf = null;
  window.addEventListener('mousemove', (e) => {
    px = (e.clientX / innerWidth - 0.5) * 40;
    py = (e.clientY / innerHeight - 0.5) * 18;
    if (!raf) raf = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--px', `${px.toFixed(1)}px`);
      document.documentElement.style.setProperty('--py', `${py.toFixed(1)}px`);
      raf = null;
    });
  }, { passive: true });
}
}

function wireCopyBtn(b) {
  b.addEventListener('click', async () => {
    const url = b.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    b.textContent = 'copied';
    b.classList.add('done');
    setTimeout(() => { b.textContent = 'copy'; b.classList.remove('done'); }, 1800);
  });
}

function wireCopy() {
  output.querySelectorAll('.copy').forEach(wireCopyBtn);
}

function buildPrimary(primary) {
  if (!primary) return '';
  return `
  <div class="primary-row">
    <div class="media-info">
      <span class="primary-label mono">FINAL DESTINATION</span>
      <a class="media-url" href="${esc(primary)}" target="_blank" rel="noopener noreferrer">${esc(primary)}</a>
    </div>
    <a class="open-link" href="${esc(primary)}" target="_blank" rel="noopener noreferrer">open ↗</a>
    <button class="copy" data-url="${esc(primary)}">copy</button>
  </div>`;
}

function buildTrace(data) {
  const items = (data.trace || []).map((h, i) => {
    const n = String(i + 1).padStart(2, '0');
    const { host, path } = shortenUrl(h.url);
    const kindClass = h.error ? 'k-error' : h.type === 'input' ? 'k-input' : h.type === 'media' ? 'k-media' : `k-${h.type}`;
    const meta = h.error
      ? `error: <span class="k-error">${esc(h.error)}</span>`
      : `${h.status ? `<span class="status-code">${h.status}</span>` : ''}${h.ms != null ? ` ${h.ms}ms` : ''}`;
    return `
      <li class="trace-item" style="--i:${i}" title="click to expand">
        <span class="trace-num">${n}</span>
        <span class="trace-body">
          <span class="k-kind ${kindClass}">${esc(h.type)}</span>
          <span class="trace-host">${esc(host)}</span>
          ${path ? `<span class="trace-path">${esc(path)}</span>` : ''}
          ${h.note ? `<span class="trace-note">${esc(h.note)}</span>` : ''}
        </span>
        <span class="trace-detail">
          <span class="detail-url">${esc(h.url)}</span>
          <span class="detail-meta">${h.status ? `status ${h.status} · ` : ''}${h.ms != null ? `${h.ms}ms · ` : ''}${esc(h.note || '')}</span>
        </span>
        <span class="trace-meta">${meta}</span>
      </li>`;
  }).join('');
  return `
    <div class="sect-head"><span>trace · resolution path</span><span>${(data.trace || []).length} hops</span></div>
    <ul class="trace">${items}</ul>`;
}

function buildMedia(media) {
  if (!media.length) return '';
  return media.map((m) => {
    return `
    <div class="media-row">
      <div class="media-info">
        <a class="media-url" href="${esc(m.url)}" download rel="noopener noreferrer">${esc(m.url)}</a>
        <div class="media-meta">
          ${m.contentType ? `<span class="badge ok">${esc(m.contentType)}</span>` : '<span class="badge unverified">unverified</span>'}
          ${m.size ? `<span class="size-readout" data-count="${esc(m.size)}">size ${esc(m.size)}</span>` : ''}
        </div>
      </div>
      <a class="open-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">open ↗</a>
      <button class="copy" data-url="${esc(m.url)}">copy</button>
    </div>`;
  }).join('');
}

function buildLinks(links) {
  if (!links.length) return '';
  return `
    <div class="sect-head"><span>intermediate links · detected steps</span><span>${links.length}</span></div>
    <ul class="links-list">
      ${links.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></li>`).join('')}
    </ul>`;
}

function buildErrors(errors) {
  if (!errors.length) return '';
  return `<ul class="errors">${errors.map((e) => `<li>✕ ${esc(e)}</li>`).join('')}</ul>`;
}

/* ---------- interactions ---------- */
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function initInteractions() {
  const rows = [...output.querySelectorAll('.trace-item')];

  // expand detail on click
  rows.forEach((r) => r.addEventListener('click', () => r.classList.toggle('open')));

  // chain highlight up to hovered hop
  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => rows.forEach((x, j) => x.classList.toggle('lit', j <= i)));
    r.addEventListener('mouseleave', () => rows.forEach((x) => x.classList.remove('lit')));
  });

  // one-shot ping on the first hot panel
  const target = output.querySelector('.media-row') || output.querySelector('.primary-row');
  if (target && !reducedMotion) {
    target.classList.add('ping');
    target.addEventListener('animationend', () => target.classList.remove('ping'), { once: true });
  }

  if (!reducedMotion) countUpSizes();
}

function countUpSizes() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const m = el.textContent.match(/^(.*?)\s?([\d.,]+)\s*(.*)$/);
    if (!m) return;
    const decimals = (m[2].split('.')[1] || '').length;
    const limit = parseFloat(m[2].replace(',', ''));
    if (!isFinite(limit) || limit <= 0) return;
    const prefix = m[1] ? `${m[1]} ` : '';
    const unit = m[3];
    const t0 = performance.now(), dur = 700;
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${prefix} ${(limit * eased).toFixed(decimals)} ${unit}`;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = `${prefix} 0 ${unit}`;
    requestAnimationFrame(step);
  });
}

/* live elapsed timer while tracing */
let traceTimer = null;
function startTraceTimer() {
  const t0 = Date.now();
  traceTimer = setInterval(() => {
    btn.textContent = `TRACING ${((Date.now() - t0) / 1000).toFixed(1)}s`;
  }, 100);
}

/* ---------- submit ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let url = input.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  btn.disabled = true;
  input.disabled = true;
  btn.textContent = 'TRACING…';
  setConn('busy', 'tracing');
  document.body.classList.add('scanning');
  startTraceTimer();

  try {
    const res = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'resolve failed');

    // input pengguna tetap di trace baris pertama
    data.trace = [{ type: 'input', url, status: null, ms: null, note: null }, ...(data.trace || [])];
    render(data, url);
    setConn('busy', (data.media || []).length ? `${data.media.length} file(s) verified` : 'path mapped');
  } catch (err) {
    setConn('err', 'failed');
    emptyState.hidden = true;
    output.hidden = false;
    output.innerHTML = `<div class="sect-head"><span>trace · resolution path</span><span>failed</span></div>
      <ul class="errors"><li>✕ ${esc(err.message)}</li></ul>`;
  } finally {
    clearInterval(traceTimer);
    document.body.classList.remove('scanning');
    btn.disabled = false;
    input.disabled = false;
    btn.innerHTML = `TRACE<span class="btn-key">⏎</span>`;
    setTimeout(() => setConn('', 'ready'), 2200);
  }
});

loadHist();
