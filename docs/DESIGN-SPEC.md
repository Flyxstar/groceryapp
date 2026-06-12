# Veckans Klipp — Interface Architecture Specification

**Apple Human Interface Guidelines Compliance Document**
Version 1.0 · Platform targets: iOS 18+, iPadOS 18+, macOS 15+ (Catalyst-free, SwiftUI)
Classification: Internal design specification
Status: Approved for implementation

---

## 0. Product Definition & Brand Symbiosis

**Purpose.** Veckans Klipp turns Sweden's weekly grocery flyers (Lidl, ICA, City Gross,
Willys, Hemköp, Coop) into a single, tactile shopping ritual: the user browses the
*original* flyer pages and **circles offers with their finger** — the childhood
toy-catalogue gesture — building a price-compared, route-optimized shopping list with
price history, store busyness and the optimal time to go.

**Audience.** Price-conscious households, 25–45. They weekly-shop, compare chains, and
expect BankID/Swish-grade polish. They value speed over depth and trust over gamification.

**Feature surface.** Five primary scenes: *Idag* (dashboard), *Reklamblad* (flyer
browser + circle capture), *Inköpslista* (store-grouped list with price history),
*Planera* (trip & timing engine), *Recept* (recipe-to-cart with chain comparison).

**Brand integration.** The brand is the *gesture*. One tint ("Klipp Rose", §3.4), one
marker texture (the hand-drawn circle), one voice (terse, warm, Swedish: "Ligger i
listan", never "Produkten har adderats"). No logo appears inside the app after launch.
The flyer pages themselves provide all the color the interface will ever need; the
chrome stays out of their way.

---

## 1. Spatial Architecture & Geometry

### 1.1 Continuous curves

Standard `cornerRadius` is forbidden. Every card, button, thumbnail and sheet uses
Apple's continuous corner curve:

```swift
.clipShape(.rect(cornerRadius: r, style: .continuous))
```

| Element | Radius (pt) |
|---|---|
| Sheets, full-bleed cards | 24 |
| Primary cards | 20 |
| Buttons, chips, fields | 12 (capsules where height ≤ 44) |
| Thumbnails, cropped flyer items | 10 |
| Price splash | Circle (true) |
| App icon | System-masked squircle — never pre-rounded |

The marker circle the user draws is the single intentional violation of geometric
perfection: it keeps its hand-drawn turbulence. Imperfection is the feature.

### 1.2 Adaptive safe areas & grid

- Layout margins: **16 pt** (iPhone standard/Pro), **20 pt** (Pro Max), **24 pt**
  (iPad ≥ regular width), all via `.safeAreaPadding(.horizontal)` — never hard-coded.
- Dynamic Island / status bar: scroll content extends underneath chrome
  (`.ignoresSafeArea(edges: .top)` on flyer scenes); interactive controls never enter
  the top 59 pt on Island devices.
- Home indicator: floating action clusters keep ≥ 16 pt above the indicator region.
- Vertical rhythm: 8 pt base grid. Section spacing 24 pt, intra-card spacing 12 pt,
  label-to-value 4 pt.
- iPad/Mac: 2-column at ≥ 700 pt width (list + detail), flyer pages center at
  max 640 pt with `.containerRelativeFrame`. Tab bar becomes sidebar
  (`.tabViewStyle(.sidebarAdaptable)`).

### 1.3 Touch ergonomics

- Minimum touch target **44 × 44 pt**, enforced with `.contentShape(Rectangle())`
  hit-area expansion where the glyph is visually smaller (qty steppers, ✕ remove,
  offer check chips).
- ≥ **8 pt** between adjacent targets. Qty stepper: 44 pt buttons, 12 pt gap.
- Flyer hotspots: hit polygon inflated +6 pt beyond the printed offer bounds.

### 1.4 Hierarchy via Z-axis

Borders are not hierarchy. Depth is:

| Layer | Material/Color | Shadow |
|---|---|---|
| Z0 Root | `systemBackground` (warm-tinted, §3.3) | — |
| Z1 Cards | `secondarySystemBackground` | y2 r8 @ 6 % |
| Z2 Flyer pages ("paper") | Always-light white — content, not chrome | y4 r16 @ 10 % |
| Z3 Floating (tab bar, toolbars) | `.bar` / thin material | system |
| Z4 Transient (toasts, context menus) | `.regularMaterial` + vibrancy | y8 r24 @ 18 % |

Hairlines (`separator`, 0.5 px) only *inside* grouped lists — never around cards.

---

## 2. Typography & Symbology

### 2.1 The San Francisco ecosystem

| Face | Role |
|---|---|
| **SF Pro** (Text < 20 pt, Display ≥ 20 pt) | All running UI text |
| **SF Rounded** | Prices, savings, the "circled" identity numerals — warmth at the moments of money |
| **SF Compact** | Flyer-page overlay chips (page x/y), dense table cells |
| **SF Mono** | Compare-prices (`79:80/kg`), coordinates, API/debug surfaces |

Type ramp (Default size class — all styles ride Dynamic Type):

| Style | Size/Leading | Weight | Usage |
|---|---|---|---|
| Large Title | 34/41 | Bold | Scene titles, collapses on scroll |
| Title 2 | 22/28 | Bold | Card headlines |
| Headline | 17/22 | Semibold | Item names |
| Body | 17/22 | Regular | Copy |
| Subheadline | 15/20 | Regular | Store meta, validity |
| Footnote | 13/18 | Regular | Price history line |
| Caption 1 | 12/16 | Medium | Chips, badges |
| Price (custom) | 28/28 | SF Rounded Heavy, `.monospacedDigit` | Splash prices |

### 2.2 Optical tracking & Dynamic Type

SF's optical sizes handle tracking automatically: Display cuts (≥ 20 pt) tighten to
−0.4…−0.8 pt tracking; Text cuts loosen up to +0.24 pt at footnote sizes. **Never set
manual `tracking()`** — selecting the correct text style *is* the tracking decision.
All scenes are validated xSmall → xxxLarge + AX1–AX5: price splashes cap at AX2 via
`@ScaledMetric(relativeTo: .title)` with `minimumScaleFactor(0.7)`; list rows grow
unbounded; the flyer page itself never scales (it is a document), but every overlay
chip does.

### 2.3 Hierarchical symbology

SF Symbols only; custom vectors are forbidden except the marker-circle brand glyph.

| Function | Symbol | Rendering |
|---|---|---|
| Tabs | `house`, `newspaper`, `fork.knife`, `cart`, `map` | Monochrome; `.fill` variant when selected |
| Circle mode | `scribble.variable` | Hierarchical, tint |
| Tap-to-add state | `checkmark.circle.fill` | Hierarchical `systemGreen` |
| GPS | `location.fill` | Tint |
| Busyness | `chart.bar.xaxis` | Hierarchical |
| Transport | `car.fill`, `bicycle`, `figure.walk`, `bus.fill` | Monochrome label color |
| Price history | `chart.line.downtrend.xyaxis` | Palette: green/secondary |
| Savings | `arrow.down.circle.fill` | Hierarchical green |

Symbols inherit adjacent text's weight (`.fontWeight(.semibold)` matches Headline) and
baseline-align via `Label` — never manually offset.

---

## 3. Materials, Vibrancy & Color Semantics

### 3.1 Material assignments

| Surface | Material | Rationale |
|---|---|---|
| Tab bar / nav bar over flyers | **Thin** (`.bar`) | Flyer colors must bleed through; chrome stays present but transparent |
| Toasts ("Ligger i listan") | **Regular** | Legible over any flyer page |
| Context-menu backdrop | **Thick** + dim | Focus isolation |
| Skeleton shimmer cards | **Ultra-thin** | Barely-there placeholders |
| Trip summary footer (totals) | **Regular, dark forced** (`.environment(\.colorScheme, .dark)`) | The "receipt" moment gets gravity |

### 3.2 Vibrancy

All text/symbols over materials use vibrancy, never plain colors:
`.foregroundStyle(.primary)`/`.secondary` inside the material context, which maps to
`UIVibrancyEffect` label styles. Plain `Color.white` text on blur is forbidden — it
dies on bright flyer pages.

### 3.3 Semantic colors — no hex in code

| Token | Light | Dark | Usage |
|---|---|---|---|
| `systemBackground` | warm off-white | near-black warm | Z0 |
| `secondarySystemBackground` | white | elevated gray | cards |
| `label` / `secondaryLabel` / `tertiaryLabel` | system | system | text ramp |
| `systemFill` series | system | system | bars, steppers |
| `separator` | system | system | in-list hairlines |
| `systemGreen` | system | system | in-cart, savings (semantic success only) |
| `systemRed` is **not** used for prices | | | prices are `label`; only the *tint* is rose |

Chain brand colors (ICA red, Coop green…) are *data*, not UI: they appear only inside
store badges and flyer headers, sourced from an asset catalog with light/dark variants.

### 3.4 Global tint — "Klipp Rose"

Exactly one interactive tint: **Klipp Rose** — asset-catalog color, light
`#E11D48`-equivalent / dark `#FB5277`-equivalent (P3). Applied via `.tint()` at the
App root. Buttons, links, selected segments, the circle-mode toggle, the drawn marker
stroke: tint. Store colors, prices, success states: never tint. If everything is rose,
nothing is.

---

## 4. Fluid Motion & Physics

### 4.1 Spring catalogue (linear/ease curves are banned)

| Name | SwiftUI | m / k / c | Used for |
|---|---|---|---|
| `standard` | `.spring(response: 0.45, dampingFraction: 0.85)` | 1 / 195 / 23.6 | Navigation, layout changes |
| `snappy` | `.spring(response: 0.25, dampingFraction: 0.9)` | 1 / 631 / 45.2 | Context menus, chip selection |
| `bouncy` | `.spring(response: 0.35, dampingFraction: 0.6)` | 1 / 322 / 21.5 | Add-to-cart pop, check chip, badge bump |
| `sheet` | `.spring(response: 0.5, dampingFraction: 0.82)` | 1 / 158 / 20.6 | Sheet presentation |
| `fly` | `.spring(response: 0.6, dampingFraction: 0.78)` + arc keyframe | 1 / 110 / 16.4 | Item flying into the cart tab |

### 4.2 Interruptibility

Every animation is gesture-interruptible: springs retarget from live velocity
(`withAnimation` on state, gesture velocity injected via
`.transaction { $0.animation = .spring(...) }`). A half-dismissed sheet that is
re-grabbed reverses with the finger's momentum; a flying cart item caught mid-air is
not — transient particles (< 700 ms) are the only exempt class.

### 4.3 Spatial transitions

- Flyer card → flyer viewer: **zoom transition** (`.navigationTransition(.zoom)`),
  the cover literally becomes page 1.
- Cropped offer thumbnail in list → flyer page position: `matchedGeometryEffect`
  return trip, so the user always knows *where on the page* an item came from.
- Recipe card → detail: shared-element on the hero gradient.
- Tab switches: crossfade 180 ms `standard` — tabs are siblings, not journeys.

---

## 5. Cognitive UX, Gestures & Haptics

### 5.1 Direct manipulation

- **Circle-to-buy** is the primary verb: one-finger draw on the flyer. Two-finger pan
  scrolls while drawing mode is armed; pinch zooms the page (0.8×–4×, rubber-banded).
- Edge-pan swipe-back everywhere; no scene relies on a Back button.
- Pull-to-refresh on flyer list and shopping list (re-fetch offers).
- Long-press any offer/list item → context menu over Thick material: *Lägg till*,
  *Prishistorik*, *Visa i bladet*, *Ta bort*.
- Swipe list rows: trailing delete (full-swipe commits), leading +1/−1 qty.

### 5.2 Frictionless logic

Zero-step defaults: GPS picks the store, the freshest flyer auto-opens, the cart badge
is the only confirmation needed. Nothing asks "Är du säker?" for reversible acts —
undo via toast action instead (8 s window).

### 5.3 Haptic map (`UIFeedbackGenerator`)

| Event | Generator |
|---|---|
| Stroke begins on page | Impact **Light** |
| Page snap while scrolling | Impact **Light** |
| Mode/segment toggle | Impact **Medium** + Selection |
| Item snaps into cart (fly lands) | Impact **Heavy/Rigid** |
| Recipe plan (multi-item) added | Notification **Success** |
| Empty circle / GPS denied | Notification **Error** |

Haptics always co-fire with their visual counterpart in the same frame; a haptic
without visible cause is a bug.

---

## 6. Accessibility — the Standard

- **Contrast:** primary text ≥ 7:1 (WCAG AAA), secondary ≥ 4.5:1, verified in both
  modes. Klipp Rose on white is 4.6:1 → rose is never used for text below 18 pt
  unless bold.
- **Reduce Motion:** springs → 150 ms crossfades; the fly-to-cart becomes a badge
  pulse; zoom transitions become fades. (`UIAccessibility.isReduceMotionEnabled`.)
- **Increase Contrast:** materials gain opacity (system-automatic), hairlines double
  to 1 px, `secondaryLabel` promotes toward `label`.
- **Reduce Transparency:** all materials fall back to opaque semantic backgrounds.
- **VoiceOver:**
  - Flyer hotspot: label "Bregott smör, 49 kronor 90, ordinarie 58:90", traits
    `.button`, `.isSelected` when in cart, hint "Dubbeltryck för att lägga i listan".
  - Drawn circle results announce via `UIAccessibility.post(notification: .announcement)`:
    "3 varor tillagda".
  - The draw canvas exposes a rotor action "Lägg till utan att rita" enumerating
    page offers — the gesture is never the only path.
  - Decorative emoji/symbols: `.accessibilityHidden(true)`.
- **Dynamic Type:** see §2.2; at AX sizes the qty stepper becomes a vertical stack
  and price splashes move below item names.

---

## 7. Scene-by-Scene Specification

### 7.1 Idag (Dashboard)

- **Layout & Grid:** Large Title "Idag". 16/20 pt margins. Card stack: *Läget just nu*
  (store busyness, 3-col grid collapsing to 1 at AX), *Min position*, *Färdsätt*.
  All cards r20 continuous, Z1.
- **Typography:** Title 2 card heads; store names Headline; busyness percentage
  SF Rounded Semibold.
- **Materials & Color:** Z1 cards on Z0; busyness bars `systemFill` track with
  green/orange/red semantic fill (data, not tint). One rose CTA: "Planera rundan".
- **Motion:** Cards stagger in 40 ms apart, `standard` spring, y+10 → 0.
  Busyness bars grow from zero on appear (`bouncy`, delay-indexed).
- **Gestures & Haptics:** Pull-to-refresh (busyness re-poll). Long-press store card →
  context menu (*Visa blad*, *Vägbeskrivning*). Selection haptic on transport toggle.

### 7.2 Reklamblad → Bladvisaren (the core scene)

- **Layout & Grid:** Chain grid: 2-col cards (r20, zoom-source). Viewer: pages at
  full width minus margins, max 640 pt, paginated vertical scroll with 12 pt
  inter-page gap; page indicator chip (SF Compact, Caption 1) bottom-trailing inside
  an Ultra-Thin capsule. Toolbar: Thin material, contains circle-mode toggle
  (`scribble.variable`, 44 pt) and cart button.
- **Typography:** None on the page itself (the flyer is the typography). Overlays:
  Caption 1 SF Compact chips; toast Body Semibold.
- **Materials & Color:** Pages are Z2 paper — always light, even in Dark Mode
  (documents don't tan). Nav chrome Thin material so the flyer's own colors glow
  through. Marker stroke: Klipp Rose at 85 % with turbulence filter.
- **Motion:** Cover → page 1 zoom transition. Stroke renders live with zero added
  latency (`CADisplayLink`-driven path). On close: hit offers pulse (`bouncy`,
  60 ms stagger), thumbnails crop out and **fly** along an arc into the cart tab
  (`fly` spring); the cart badge bumps (`bouncy`).
- **Gestures & Haptics:** One-finger draw (circle mode), two-finger scroll, pinch
  zoom; toggle off → hotspots become tappable with rose hover ring. Light impact at
  stroke start, Heavy on each fly-landing, Error notification on empty circle with
  the stroke shaking (±4 pt, `snappy`) before fading.

### 7.3 Inköpslista

- **Layout & Grid:** Inset-grouped sections per store, **closest first**; section
  header: store badge (chain color asset), name, distance, subtotal (SF Rounded).
  Rows: 60 pt min height — cropped flyer thumbnail (r10), name Headline, price
  history Footnote, qty stepper 44 pt targets.
- **Typography:** Subtotals/totals SF Rounded Bold `.monospacedDigit`; price history
  Footnote with green/red Δ in SF Mono Caption.
- **Materials & Color:** Rows `secondarySystemBackground`; hairline separators inside
  sections only. Totals footer: Regular material forced-dark "receipt" with vibrancy;
  savings line `systemGreen`.
- **Motion:** Row insert/remove `standard` spring with `matchedGeometryEffect` from
  the flyer. Total counts up 300 ms when changed. Reorder stores on distance change
  animates with `standard`.
- **Gestures & Haptics:** Swipe leading +1/−1 (Selection haptic per step), trailing
  delete (Medium impact at commit point). Long-press → *Visa i bladet* (deep-link to
  the page, marker circle highlighted). Pull-to-refresh re-prices.

### 7.4 Planera resan

- **Layout & Grid:** Transport segmented control (SF Symbols, 44 pt), departure chips
  row (horizontal scroll, 8 pt gaps), itinerary as numbered timeline (28 pt nodes,
  2 pt `systemFill` connector), 3-col stat footer.
- **Typography:** Times SF Rounded Semibold `.monospacedDigit`; "Bästa tid" chip
  Caption 1 Bold; busyness axis labels Caption 2.
- **Materials & Color:** Busyness chart bars `systemFill`/tint-highlighted hour;
  traffic state pill: semantic green/orange/red fill with white vibrant label.
- **Motion:** Changing transport mode morphs leg durations with number-transition
  (`contentTransition(.numericText())`, `standard`). Suggestion chips slide-reorder
  when scores change. Chart bars grow `bouncy` on appear.
- **Gestures & Haptics:** Drag the highlighted hour across the chart to scrub
  departure time — Selection haptic per hour, Medium on release-commit. Segment
  toggles: Medium impact.

### 7.5 Recept & Receptdetalj

- **Layout & Grid:** 2-col card grid (r20, zoom-source hero). Detail: hero 220 pt
  with shared element, then two Z1 cards (ingredients / store comparison). Comparison
  rows 52 pt: plan name, total (SF Rounded), savings badge, 44 pt add button.
- **Typography:** Recipe titles Title 2; meta (⏱ 🍽) Caption 1; "spara 23,50 kr"
  Footnote Bold `systemGreen`.
- **Materials & Color:** Hero gradient is data-driven per recipe; text over hero uses
  Thin material scrim bottom-up. Brand-preference segments use tint selection only.
- **Motion:** Card → detail shared-element (`sheet` spring). Switching brand
  preference recomputes rows with numeric text transitions; the cheapest row gets a
  one-time `bouncy` crown slide.
- **Gestures & Haptics:** Edge-pan back; long-press a comparison row → context menu
  (*Visa varor*, *Byt butik*); Success notification haptic when a full recipe lands
  in the list (with N thumbnails flying as one flock).

---

## 8. Web Translation Addendum (current Next.js build)

Implemented now: semantic color tokens with native Dark Mode, AAA-checked text ramp,
44 px hit-target expansion, spring token unification, `prefers-contrast` and
`prefers-reduced-transparency` fallbacks, ARIA pressed/selected states, paper-stays-
light flyer rule. Native-only (documented for the iOS build): true continuous-corner
masks, SF Symbols, UIKit materials/vibrancy, matched-geometry transitions, haptic
generators beyond `navigator.vibrate`.
