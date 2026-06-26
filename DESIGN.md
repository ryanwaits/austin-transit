# DESIGN

The single source of truth for the visual system. Tokens are implemented in
`apps/web/src/app/globals.css`. This is a deliberately prescriptive, Pudding-style
editorial system; honor it exactly. Apply craft (motion, focus, reduced-motion,
tabular numerals, no layout shift, 44px targets, iOS-safe inputs) in the gaps.

## Color

Light only. The brief prescribes exact hex values (Paul Tol qualitative palette
for data); these override the usual "OKLCH / never #fff" defaults because the
system is specific and credible. White (`--color-surface`) is used sparingly for
raised media against the cream page.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FFFEF5` | warm cream page background (the signature) |
| `--color-surface` | `#FFFFFF` | raised media only |
| `--color-surface-warm` | `#FBF3D8` | parchment callouts / rigor section |
| `--color-fg` | `#262626` | body text |
| `--color-fg-muted` | `#5C5C5C` | captions, axis labels |
| `--color-fg-faint` | `#8A8A8A` | bylines, faint meta |
| `--color-border` | `#E8E4D5` | dividers |
| `--color-border-strong` | `#B8B4A5` | emphasis rules |

Categorical (Paul Tol): blue `#4477AA`, red `#EE6677`, green `#228833`,
yellow `#CCBB44`, cyan `#66CCEE`, purple `#AA3377`, gray `#BBBBBB`.

Domain semantics:
- Equity: burdened `#AA3377` (magenta), advantaged `#4477AA` (blue), neutral `#BBBBBB`.
- OTP: ontime `#228833`, early `#66CCEE`, late `#EE6677`, missing `#BBBBBB`.

## Typography

- **EB Garamond** (serif) + **Inter** (sans), via `next/font/google`, exposed as
  `--font-serif` / `--font-sans`.
- Body: EB Garamond, 18px, line-height 1.55, weight 400.
- Headings: EB Garamond, weight 600 (elegant, not extra-bold).
- UI / labels / chart axes / buttons: Inter, weight 500.
- Numbers in body and charts: `font-variant-numeric: tabular-nums`.
- Pull quotes: EB Garamond italic, larger, indented.

Scale: h1 48 / h2 36 / h3 28 / h4 24 / h5 22 / h6 20 / body 18 / small 15 /
caption 13. Hero headline `clamp(48px, 6vw, 88px)`, max-width 14ch.

## Layout

Content widths: narrow 640 (prose), medium 830 (prose + media), wide 1080
(two-column), bleed 1280 (maps, full-bleed viz). Page gutter
`--space-page-x: clamp(16px, 6vw, 64px)`. Editorial pattern: narrow centered
column, full-bleed viz breaks out at key beats. Vary vertical rhythm between
sections; never uniform padding.

## Charts — universal rules (encode in `<ChartFrame>`)

1. No top/right axes. 2. No tick marks (bare axis lines, floating labels).
3. No gridlines unless needed (then `--color-border` at 50%). 4. Color encodes
one variable, ever. 5. Direct labeling over legends. 6. Caption below, source
below caption (`--text-caption`, `--color-fg-muted`). 7. Axis labels Inter 13px
muted; series labels Inter 14px in series color. 8. Animate on initial paint
only, no idle/hover motion; honor `prefers-reduced-motion`. 9. Tabular figures
in tooltips. 10. Static SVG must render without JS; interactivity is enhancement.

## Motion

Scroll-driven transitions (Framer Motion `useScroll`/`useTransform`) and
on-enter chart reveals only. Ease-out exponential curves, no bounce. Never
animate layout properties (transform/opacity only). All motion gated behind
`prefers-reduced-motion: reduce`.
