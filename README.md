<div align="center">

# LINKUPFIND

**Know where a link ends, before you click it.**

A link inspector that traces a URL hop by hop, shows the full redirect chain,
and verifies the file waiting at the end: content type and size, checked live
over HTTP HEAD. No guessing. No clicking blind.

[![Live demo](https://img.shields.io/badge/live-demo-C8F14A?style=flat-square)](https://linkupfind.vercel.app)
[![No dependencies](https://img.shields.io/badge/dependencies-0-C8F14A?style=flat-square)](package.json)
[![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-C8F14A?style=flat-square)](package.json)

[Open live demo](https://linkupfind.vercel.app)

</div>

---

## The problem

Download links rarely point where they claim. A single click travels through
shorteners, ad interstitials, meta refreshes and JS redirects before the real
destination appears, and nothing tells you what is actually waiting there:
a movie file, a setup installer that rebrands itself as a codec pack, or an
empty landing page farming clicks.

LINKUPFIND makes the invisible journey visible, then verifies the destination
as fact: exact content type, exact size, straight from HTTP HEAD.

## How it works

```
paste url
    │
    ▼
[1] follow HTTP 30x redirects, each hop logged with status + latency
[2] catch <meta http-equiv="refresh"> chains
[3] catch JS redirects (window.location, location.replace, window.open)
[4] follow intermediate pages: iframes, explicit ?url= style params
[5] HEAD-verify media at the end of the chain (content-type + size)
[6] report: full trace, verified files, final destination
```

The result is a numbered resolution path you can inspect hop by hop. Click
any hop to expand full URL, status code and latency. Every claim in the
results panel comes from a real HTTP response, not from text scraping.

## Verified extensions

`mp4` `mkv` `webm` `avi` `mov` `ts` `m3u8` `mp3` `m4a` `wav` `flac`
`zip` `rar` `7z` `pdf` `epub` `apk` `exe` `iso`

## Quick start

```bash
git clone https://github.com/maksalarina12/linkupfind.git
cd linkupfind
npm start        # node server.mjs, open http://localhost:3000
npm run dev      # auto-reload mode
```

Zero dependencies. Node 18+ is enough.

## API

```
POST /api/resolve
{ "url": "https://some-link.com/x" }
```

```bash
curl -X POST https://linkupfind.vercel.app/api/resolve \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response: `{ ok, input, trace[], primary, media[], links[], errors[] }`
Where `trace[]` is the full hop history, `media[]` are HEAD-verified files,
and `primary` is the final destination when the chain moved with no file
at the end.

## One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/maksalarina12/linkupfind)

Deployed as a serverless function (`api/resolve.js`) plus static front end.
Same engine runs locally via `server.mjs` and on Vercel via `engine.mjs`.

## Project structure

```
engine.mjs        resolver core: redirect following, page scanning, HEAD verify
server.mjs        local HTTP shell (dev)
api/resolve.js    Vercel serverless handler
public/           intercept console UI: vanilla HTML/CSS/JS, no build step
vercel.json       deployment config
.design/          design contract, references, audit, visual changelog
```

## Design

The interface is an **intercept console**: a traceroute view styled as a signal
monitoring instrument. IBM Plex Sans/Mono with Chakra Petch display type, one
writing phosphor accent `#C8F14A` on deep charcoal `#06080B`, HUD corner
brackets, a scan sweep while tracing, and staggered boot-log row entrances.
Every animation honors `prefers-reduced-motion`. Full contract in
[`.design/DESIGN.md`](.design/DESIGN.md).

## Limits

- Hard budget of 14 fetches / 120 s per resolution (protects against loops)
- JS-heavy SPA pages that require a browser engine cannot be scraped
- Paste history lives in browser `localStorage` only, never on a server

## License

MIT
