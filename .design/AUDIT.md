# Design audit v2.1

## Completed QA (2026-10-26)
- [x] syntax: node --check app.js, server.mjs
- [x] served over HTTP: new headline, kicker, brackets CSS, Chakra Petch loaded in font link
- [x] API end-to-end still resolves (bit.ly chain traced successfully)
- [x] em dash sweep across public/ + docs: zero occurrences
- [x] reduced-motion rules present and more aggressive than v1
- [x] glow inventory: sweep line, status dot, button hover, FINAL DESTINATION panel, copy hover: all live-signal states, none static
- [x] fake-data check: elapsed timer, clock, count-up sizes, ping, chain highlight all bind to real response data; no decorative telemetry
- [x] interaction inventory: hover (chain light, row hover), click (detail expand, copy, open), keys (/ focus, esc clear, enter submit), active press on resolve button

## Known weaknesses / follow-ups
- [ ] Component test done by code inspection + HTTP smoke; no pixel screenshot taken (no browser tooling in session). Recommend a quick visual pass in a real browser.
- [ ] Chakra Petch loads from Google Fonts; first paint may FOIT on slow networks. Acceptable for local/self-hosted tool; revisit if deploying publicly.
- [ ] Trace stagger caps at 90ms/item; a 10-hop chain takes ~1s to fully draw. Statement design choice; revisit if users complain.
- [ ] Blueprint grid is fixed to viewport, not page scroll; intentional (HUD frame), but verify no distracting interaction with long traces.
- [ ] Empty-state AUX READOUT label uses same muted color as body; acceptable, but could take lime if it ever needs promotion.
