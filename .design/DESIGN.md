# LINKUPFIND · Design Contract v2.0

## Thesis
Intercept console: a traceroute for links, before the click. The product should feel like a
signal monitoring instrument, because the user is about to click a risky link and needs to see
the path the way radar tracks a contact. Every hop is real data, so every visual element is
telemetry: monospace readouts, one phosphor accent, frames that look machined, not decorated.

Position: pure transparency tool. Every hop is shown, nothing bypassed.
The main result panel is labeled FINAL DESTINATION (last hop of the chain).

## Typography
- Display/HUD: Chakra Petch 600/700, uppercase, letter-spacing 0.01–0.16em
  (wordmark, H1, section labels, buttons)
- Data/mono: IBM Plex Mono 400/500/600 (all URLs, hops, sizes, status codes, clock)
- UI/body: IBM Plex Sans 400/500/600
- H1: clamp(26–40px) Chakra Petch 600 uppercase
- Body 15px/1.55; small data 10.5–13px
- Kicker: 10.5px mono, uppercase, letter-spacing 0.28em, lime, with fading rule

## Color
| role | value |
|---|---|
| --color-bg | #06080B |
| --color-surface | #0D1218 |
| --color-surface-2 | #131A21 |
| --color-text | #E8E6E0 |
| --color-text-muted | #8A918E |
| --color-primary (phosphor lime) | #C8F14A |
| --color-primary-dim | rgba(200,241,74,0.09) |
| --color-primary-glow | rgba(200,241,74,0.22) |
| --color-border | #1C232B |
| --color-border-strong | #2C353F |
| --color-error | #FF6B57 |
| --color-warning | #F5C04A |
| --color-success | #58D68D |

ONE phosphor. Lime is signal: primary (direct or hovering risk), warning amber (redirect steps),
warning red (errors), green (HEAD verified). Glow is restricted to live-signal states:
scan sweep, active dot, button hover, FINAL DESTINATION panel. Never on static surfaces.

## Shape & depth
- 3px radius everywhere, no pills
- no drop shadows; hierarchy from hairline borders and surfaces
- restrained glow only on live signal states (above)
- 2px solid border only on FINAL DESTINATION (the one "hot" panel); 1px elsewhere

## Signature elements (the identity)
1. HUD corner brackets on the input console and FINAL DESTINATION panel (8-segment gradient
   background trick; the input row brackets brighten on focus)
2. Scan sweep: a 2px lime line travels the viewport only while `body.scanning` is set
3. Staggered boot-log draw-in for trace rows and media rows (translateX + fade, 90ms stagger
   via `--i`, 300ms for media)
4. Live UTC tick clock in the topbar, right of the status dot
5. Blueprint grid background: 40px grid at 1.5–2.5% opacity + faint radial horizon glow at top
6. Blinking block caret `▮` after FINAL DESTINATION label

## Layout
- max-width 960px, gutter clamp(16px, 4vw, 40px)
- composition: wordmark bar → kicker → asymmetric statement (left) → bracketed input console →
  hints → numbered trace → verified results → aux readout empty state
- signature: trace list numbered 01..NN over a vertical signal line with hop kind badges

## Motion
- purpose only: state (scanning), sequence (boot log), live signal (caret, pulse dot)
- 120–300ms, ease; reduced-motion disables sweep, boot-log, caret blink

## Grid background & surfaces
- page grid at ≤2.5% opacity, never interfering with text contrast
- inputs and panels use near-opaque gradients (0.85 alpha) so the grid does not fight content

## Anti-patterns (blocked)
- purple/blue gradients, glassmorphism, glow on everything, neon rainbow
- Orbitron-style sci-fi display fonts, off-grid fonts
- blobs, noise grain everywhere, floating particles
- bento widget grids, decorative charts, icon libraries for every noun
- shadow on every surface, hover-lift everywhere
- generic centered hero + three feature cards + testimonials

## QA
- [x] focus-visible lime outline on all interactive controls
- [x] mobile: clock hidden, brackets inset reduced, input stacks, trace 2 columns
- [x] prefers-reduced-motion: sweep off, bootlog off, caret static
- [x] muted text contrast ok on new bg (#8A918E on #06080B)
- [x] glow limited to live-signal states
