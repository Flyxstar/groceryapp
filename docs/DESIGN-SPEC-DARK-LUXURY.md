# Addendum A — "Dark Luxury" Architecture

**Veckans Klipp · Interface Architecture Specification, Appendix to v1.0**
Scope: Dark Mode elevation to OLED gallery standard. All v1.0 rules remain in force;
where this addendum conflicts, the addendum wins in Dark Mode.

---

## A1. Acknowledged constraints

OLED true black root (#000000) · ambient low-opacity glows instead of borders ·
continuous corners only · 24–32 pt hero margins, 44 pt targets · SF ecosystem with
heavy-vs-ultralight optical contrast · Thin/Ultra-Thin materials with scroll-driven
dynamic blur and vibrancy · shared-element morphing on springs, fully interruptible ·
gesture-first, progressive disclosure, contextual fading · haptic synergy ·
skeleton screens (spinners banned) · composed empty states. Accepted in full.

## A2. The OLED canvas & ambient light

- Dark `systemBackground` is **pure #000000**. The device bezel and the interface
  share one surface; the app has no edges.
- Borders are demoted to 6 %-alpha hairlines. Elevation is *light*, not lines:
  every Z1 card sits on a layered shadow stack —
  `0 8px 24px -8px black @ 70 %` (grounding) + `0 0 48px -12px KlippRose @ 7 %`
  (ambient brand glow). On hover/focus the glow breathes to 12 %.
- Three fixed ambient washes (rose 7 %, cyan 5 %, amber 4 %, radial, 800–1100 pt)
  float behind content — the "gallery lighting" that keeps black from feeling void.
- The flyer pages remain `.paper` white (v1.0 §7.2): on OLED black they hover like
  lit artwork, which **is** the gallery effect. Their shadow gains a wide soft
  spread (y4 r24 @ 35 %).

## A3. Hyper-margins & quiet density

- Hero content margins: **24 pt** (compact), **32 pt** (regular+). Scene padding
  rises from 16 → 20/32 pt. Section rhythm 32 pt. Cards never touch viewport edges.
- Touch targets unchanged: 44 × 44 pt minimum, 8 pt separation (v1.0 §1.3).

## A4. Typography — optical weight contrast

- Titles: SF Pro Display **Heavy**, tracking auto-tightened by the Display cut.
- Secondary lines directly under heavy titles: SF Pro Text **Light** at
  `secondaryLabel` 62 % — the whisper under the statement.
- Numbers keep SF Rounded; in Dark Mode prices render at `label` 92 % to avoid
  OLED bloom on pure white.
- SF Symbols accompanying Light text use `.ultraLight`/`.thin` variable weights;
  symbols in buttons match the button's Semibold. Hierarchical rendering pulls its
  secondary layer from the ambient glow palette.

## A5. Materials & dynamic blur

- Tab/nav bars: **Ultra-Thin** material at rest over content, vibrancy on all
  glyphs. Scrolling drives the material: blur radius 12 → 26 pt and saturation
  1.3 → 1.9 mapped to scroll offset (0–240 pt, rubber-banded), so chrome
  condenses out of the content like breath on glass. Implemented natively with
  `UIScrollView` offset → `CAFilter` interpolation; on the web with a scroll-driven
  CSS custom property.
- Toasts/menus stay Regular material; totals "receipt" keeps forced-dark Regular
  with the rose ambient glow.

## A6. Motion & morphing

Spring catalogue v1.0 §4.1 unchanged (linear motion remains banned; all gestures
interruptible with velocity hand-off). Additions:

- **Card → scene morphs** (`matchedGeometryEffect` + `.navigationTransition(.zoom)`):
  chain card morphs into flyer page 1; recipe card hero morphs into detail hero.
  Continuous glass, never a page flip.
- Glow transitions animate with `standard`; nothing blinks on black.

## A7. Contextual fading — the quiet interface

- Scroll indicators, page chips ("sida 4/30"), provider footnotes idle at 50 %
  opacity and illuminate to 100 % on pointer proximity/touch; they fade back after
  1.2 s of stillness.
- Secondary controls (GPS chip, "Töm listan") use `tertiaryLabel` until the user's
  attention zone (hover/focus-within) lights them.
- Haptic map unchanged (v1.0 §5.3); fades never haptically announce themselves.

## A8. Edge cases

- **Loading:** skeleton cards in `systemFill` mirroring the exact target layout,
  pulsing 1.4 s linear shimmer (the one permitted non-spring animation). Spinners
  are banned application-wide.
- **Empty states:** one oversized glyph (80 pt), desaturated to grayscale at 30 %
  opacity, Title 3 Semibold headline, Light body, exactly one rose CTA.
  Composed, centered, generous (≥ 48 pt vertical padding).

## A9. Screen deltas (Dark Mode)

| Scene | Delta vs v1.0 |
|---|---|
| **Idag** | Cards lift off #000 with rose ambient glow; busyness bars glow in their semantic color at 20 % behind the bar. Hero gradient gains a wide rose bloom shadow. |
| **Reklamblad** | The flyer is the only light source — chrome falls to Ultra-Thin over black; page chip fades per §A7; marker rose brightens to the P3 dark-tint variant. |
| **Inköpslista** | Store headers keep chain colors (data) but on 8 %-alpha tinted black; the receipt footer's glow is the scene's visual anchor. |
| **Planera** | Chart bars on `systemFill`; the selected hour bar carries a rose glow halo. Traffic pill colors render at 85 % to avoid OLED bloom. |
| **Recept** | Recipe gradients render at 88 % brightness on black; detail hero morphs in with its glow following one frame behind (`fly` spring) — light has inertia. |
