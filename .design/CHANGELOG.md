# Visual changelog

## v2.1 (2026-10) — interactive layer
- Trace rows now interactive: click expands hop detail (full URL, status, latency, content type)
- Hovering a hop lights the whole chain above it (segment highlight)
- Signal packet dot travels the trace rail continuously
- Trace button shows a live elapsed timer (real ms data, no fake telemetry)
- Target-lock ping ring on the first hot result panel
- One-shot scan flash across each verified file row
- File sizes count up on render (700ms ease-out)
- Ambient parallax: horizon glow tracks cursor (rAF-throttled)
- Terminal shortcuts: `/` focuses input, `Esc` clears; hint chips in the hints row
- All animations honor prefers-reduced-motion (JS gate plus CSS rules)

## v2.0 (2026-10), intercept console
- Thesis rebranded: utility console → intercept console (signal monitoring instrument)
- Display font added: Chakra Petch 600/700 (wordmark, H1, section labels, buttons)
- Palette deepened/cooled: bg #0C0F10 → #06080B, surfaces recomputed
- Added HUD corner brackets (input console + FINAL DESTINATION panel)
- Added scan sweep during trace (body.scanning)
- Added staggered boot-log draw-in for trace/media rows
- Added live UTC tick clock in topbar
- Added blueprint grid background + radial horizon glow
- Labels localized to English, no em dashes anywhere in UI copy
- Reduced-motion: sweep, boot-log, caret blink all disabled

## v1.1 (2026-10), inspector reposition
- Full product pivot: bypass facelift removed → pure link inspector
- Engine cut: all decoders (base64 layers, AdFly, AES, obfuscated params) deleted
- Panel renamed LINK ASLI DITEMUKAN → FINAL DESTINATION semantics
- Copy moved to English

## v1.0 (2026-10), utility console
- First system: IBM Plex only, charcoal #0C0F10, lime #C8F14A, 3px radius, trace list
