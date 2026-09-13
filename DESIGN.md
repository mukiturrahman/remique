---
name: Remique
description: A bright near-white page where jade owns whole regions and one coral figure marks the hour a reminder lands on.
colors:
  ground: "#ffffff"
  ground-2: "#f4f7f5"
  ground-3: "#e9efeb"
  ink: "#0b1512"
  ink-2: "#4c5a55"
  ink-3: "#66736e"
  line: "#dde5e0"
  line-strong: "#c4d2cb"
  brand: "#0f6b52"
  brand-deep: "#08402f"
  brand-tint: "#e4efe9"
  signal-ink: "#a32b12"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5.4vw, 4.05rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontVariation: "opsz"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.6vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
    fontVariation: "opsz"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1.6vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.09em"
  bengali:
    fontFamily: "Anek Bangla, Geist, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  focus: "4px"
  sm: "6px"
  lg: "16px"
  panel: "26px"
  block: "32px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  section: "80px"
  section-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "#ffffff"
  button-light:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-light-hover:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.brand-deep}"
  nav-cta:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  bubble-outgoing:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  bubble-incoming:
    backgroundColor: "{colors.ground-3}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  readout:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
  meta-pill:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  composer-field:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
    height: "42px"
---

# Design System: Remique

## Overview

**Creative North Star: "The Lit Room"**

Remique's page is a bright room with the lights on. The ground is plain white, the ink is a near-black with green in it, and the only structural colour is a single deep jade that never appears as decoration — it takes whole regions at a time: the nav's call to action, the outgoing message bubble, the parse readout, and the closing block that turns the full container jade edge to edge. Nothing is tinted for mood. A surface is white, or it is jade, and the eye is never asked which one matters.

The density is spacious and editorial rather than dashboard-like. Content sits inside a 72rem container with generous vertical section rhythm (80px, opening to 112px on large screens), and structure is carried by hairline rules rather than boxes: the three steps and the six capabilities are list items separated by 1px top borders, not cards on a grid. Depth is spent in one place only — the live conversation panel — so that the single interactive object on the page reads as the real thing and everything around it reads as page.

The world it replaced was the category default this build refuses: a dark #0B141A ground, WhatsApp's platform green as brand colour, emoji standing in for icons, a 3-up feature card grid, and 01/02/03 step numerals. None of that survives in the shipped code. What replaced it is the conventional modern-SaaS arrangement executed at the craft bar the user named — Stripe, Notion, Framer — distinct through drawing, spacing and restraint rather than through an adopted metaphor.

**Key Characteristics:**
- Near-white ground; jade as the only structural colour, owning whole regions
- One coral figure, reserved for the resolved hour and nothing else
- Hairline rules instead of a card grid
- Bricolage Grotesque display with its optical-size axis live, over Geist text
- Geist Mono for parsed data, Anek Bangla for every Bengali string
- Drawn 1.5px stroke icons on a 24 grid; no emoji used as an icon
- Depth spent on exactly one panel; the rest of the page is flat
- One authored motion moment, pausable, and absent under reduced motion

## Colors

A near-white green-shifted neutral field, one deep jade that carries all structure, and one burnt coral that appears exactly where a time resolves.

### Primary
- **Deep Jade** (`brand`): The only structural colour. It fills the nav call-to-action, both primary buttons, the outgoing message bubble, the Remique bell mark, icon strokes in capability rows, the composer caret and send affordance, the text selection background, and — as a gradient into Deep Jade Shade — the entire closing block. It is never used as a small decorative accent floating on white.
- **Deep Jade Shade** (`brand-deep`): The pressed and hovered state of every jade surface, the terminal stop of the closing block's 158° gradient, and the ink colour on the light-tone button sitting on jade. Also the label ink inside the parse readout, where it measures 9.98:1 on jade tint.
- **Jade Tint** (`brand-tint`): The only jade-family fill that carries body content — the parse readout inside the live panel, the icon plaque in the capabilities section, and the hero's radial wash. It is also the text colour for supporting copy set on the closing block.

### Secondary
- **Fired Coral** (`signal-ink`): The one hour a reminder lands on. It sets the resolved `when` value in the parse readout and nothing else in the shipped page. On jade tint it measures 6.12:1. Its rarity is the entire point: it is the visual proof that a sentence became a timestamp.

### Neutral
- **Paper** (`ground`): The page ground, the live panel's body, and the tiles inside the time-vocabulary table.
- **Cool Paper** (`ground-2`): The banded language-proof section, the composer field, the language chip, and the scrollbar track.
- **Quiet Paper** (`ground-3`): Incoming reply bubbles and the typing indicator's capsule — the "not from you" surface inside the thread.
- **Deep Ink** (`ink`): All headings, primary body emphasis, and the wordmark.
- **Muted Ink** (`ink-2`): Every paragraph of running body copy and idle nav links.
- **Soft Ink** (`ink-3`): Metadata, placeholder text, the Bengali gloss in the vocabulary table, and the resolved-time footnotes.
- **Hairline** (`line`): The universal border colour — set as the global `border-color` default, so any bordered element is on the hairline unless it says otherwise. It draws section divisions, list separators, the panel edge, and the 1px gutter grid of the vocabulary table.
- **Hairline Strong** (`line-strong`): The one step up — hover borders, the middot separator, and the scrollbar thumb.

### Named Rules
**The Fired-Moment Rule.** Coral marks the hour a reminder lands on. It never colours ordinary data, never a heading, never a border, never a hover state. If a second coral element appears on a screen, one of them is wrong.

**The Whole-Region Rule.** Jade takes regions, not accents. A jade element is a button, a bubble, a readout, a mark, or a full-bleed block — never a sprinkle of coloured text or a decorative line inside otherwise neutral prose.

**The Green-Neutral Rule.** Every neutral in the system carries a trace of green (ink is `#0b1512`, not black; paper steps are green-shifted greys). Do not introduce a pure grey or a blue-grey; it reads as a foreign palette immediately against jade.

## Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui)
**Body Font:** Geist (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (with ui-monospace)
**Bengali Font:** Anek Bangla (with Geist)

**Character:** Bricolage's slightly quirky, optically-sized grotesque gives headlines a confident, friendly voice at large sizes; Geist underneath is neutral and completely legible at small sizes on modest phones. The mono is not decoration — it is the signal that a value came out of the parser.

### Hierarchy
- **Display** (600, `clamp(2.5rem, 5.4vw, 4.05rem)`, line-height 1, tracking -0.035em): The hero headline only. Capped at 4.05rem; it does not scale past that on wide screens.
- **Headline** (600, `clamp(2rem, 3.6vw, 3rem)`, line-height 1.04): Section headings. The closing block runs a slightly hotter variant (`clamp(2.1rem, 4.4vw, 3.5rem)`, line-height 1.02) in white on jade.
- **Title** (600, 20px / 19px / 17px, tracking -0.02em): Step headings (20px), vocabulary entries and the wordmark (19px), capability headings (17px). Always display face, never Geist.
- **Body** (400, 17px section lead / 15.5px step copy / 15px capability copy / 14.5px metadata, line-height ~1.6): Running prose. Constrained by `max-w-measure` (68ch) or a tighter per-block cap (46ch under the hero, 44ch on the closing block).
- **Label** (400, 10.5–13px, uppercase, tracking 0.09em–0.13em, Geist Mono): Data legends inside the live panel (`what Remique read`, `task`, `when`), the timezone pill, the language chip, and the resolved values in the vocabulary table.
- **Bengali** (400–500, matched to its neighbour's size, Anek Bangla): Every Bengali string, always with a `lang="bn"` attribute on the element that carries it.

### Named Rules
**The Optical-Axis Rule.** Bricolage Grotesque ships with its `opsz` axis loaded. Do not drop it to shrink the font payload — the browser applies it via font-optical-sizing and removing it silently widens every heading by 8.4%. No other variable axis is loaded; nothing on the page varies width.

**The Parsed-Data Rule.** Mono is reserved for values that came out of the parser or the system clock, and for the legends that name them. Prose never sets in mono. Any figure — times, the bot number, resolved offsets — carries the `.tabular` class so digits stay aligned.

**The Script-Attribution Rule.** Bengali text gets Anek Bangla and `lang="bn"` together, always. A Bengali string in the Latin stack is a bug, not a style choice.

**The Bare-Headline Rule.** Headlines stand alone on the ground. No eyebrow, kicker, or uppercase mono label is ever placed above a heading to introduce it — the mono label exists only inside data surfaces, naming a field.

## Layout

A single centred container at 72rem (`max-w-6xl`) with a 20px gutter that opens to 32px at the `sm` breakpoint. Vertical rhythm is 80px of section padding, opening to 112px on `lg`; the hero runs 64px top / 96px bottom, opening to 96px / 128px. Spacing inside blocks steps in 4px increments off a 8px base, with deliberate half-steps (10px, 14px, 22px) where optical balance beat the grid.

The page is a stack of asymmetric two-column splits rather than a repeating card grid. The hero is 1.05fr / 0.95fr — headline and primary action left, live panel right. The language proof is 0.85fr / 1.15fr with a sticky left column at 100px offset. The capabilities section is 0.9fr / 1.1fr, also sticky left. All of them collapse to a single column below `lg`; the right-hand lists collapse from two columns to one below `sm`. The steps row is a three-up `md` grid of list items separated by hairline top borders, and the vocabulary table is a two-column grid whose 1px gaps over a hairline background produce the ruled grid — there is no border on any individual cell.

The header is sticky at the top with a hairline bottom border and a 95%-opaque ground with backdrop blur, applied only where `backdrop-filter` is supported. Body measure is capped at 68ch (`max-w-measure`); headline measure is capped in characters (15ch–18ch) so line breaks stay deliberate at every width. The build carries zero horizontal overflow at 390px.

**The Hairline Rule.** Structure is drawn with 1px lines in the hairline colour, never with a box around content. The global border colour is set once so that any bordered element inherits it; overriding it is a deliberate act, not a default.

## Elevation & Depth

The page is flat by design, and depth is spent in exactly one place: the live conversation panel, which sits on a three-layer shadow that reads as a real object resting above the page. Everything else — sections, lists, the vocabulary table, the closing block — is separated by hairlines and ground steps alone. Buttons are the only other elements that carry shadow, and they use it as state: a resting lift, a deeper lift on hover, and a collapse to near-nothing on press paired with a 1px downward translate.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 1px 2px rgba(11,21,18,0.04), 0 12px 28px -12px rgba(11,21,18,0.14), 0 34px 64px -32px rgba(11,21,18,0.18)`): The live thread panel at rest, and the primary button on hover. The only true elevation in the system.
- **Lift** (`box-shadow: 0 2px 4px rgba(11,21,18,0.05), 0 18px 36px -14px rgba(11,21,18,0.2)`): Primary and light buttons at rest.
- **Press** (`box-shadow: 0 1px 2px rgba(11,21,18,0.12)`): The active state of any button, combined with `translateY(1px)`.

All shadow colours are the ink hue at low alpha — never neutral black — so shadows stay in the palette's green cast.

**The One Panel Rule.** Only the live conversation panel is elevated at rest. If a second surface on a screen needs a shadow to be found, the layout is wrong; use a hairline or a ground step.

## Shapes

Two shapes carry the whole system: the pill and the soft rectangle. Every action, chip, status pill, avatar-scale mark and composer field is fully rounded (`9999px`). Every container is a soft rectangle at one of four radii — 16px for message bubbles, the parse readout, the icon plaque and the vocabulary table; 26px for the live panel; 32px for the closing block; 6px on inline links and nav targets so their focus ring has a shape.

Message bubbles break their own symmetry: the outgoing bubble drops its bottom-right corner to 6px and the incoming reply drops its bottom-left, which is the only tail language in the system — no pointers, no notches, no drawn arrows.

Focus is a 2px jade outline at 3px offset with a 4px radius, applied globally to `:focus-visible`. It is not restyled per component.

Borders are 1px everywhere. The one exception is the parse readout, which uses jade at 25% opacity so the tinted panel reads as jade-family rather than neutral-bordered.

## Components

### Buttons
- **Shape:** Fully rounded pill (`9999px`), display face at 16px/600 with tight tracking.
- **Primary:** Jade ground, white text, 24px horizontal and 14px vertical padding, resting Lift shadow. Content is always WhatsApp mark → label → arrow, with a 10px gap.
- **Hover / Focus:** Ground darkens to Deep Jade Shade, shadow deepens to Panel, and the trailing arrow translates 4px right over 300ms. Transitions are scoped to background-color, box-shadow and transform at 200ms ease-out. Focus uses the global jade outline.
- **Active:** Press shadow plus a 1px downward translate.
- **Light tone:** White ground, Deep Jade Shade text; used only when the button sits on the jade closing block. Hovers to Cool Paper.
- **Nav variant:** Same pill, smaller (16px/10px padding, 14.5px type), and shadowless — the header is a flat surface.

### Chips
- **Language chip:** Cool Paper ground, Soft Ink text, 11px uppercase mono-tracked label, pill shape. Names the script currently in the thread.
- **Meta pill:** White ground with a hairline border, 12px mono, and a 6px jade dot at its head. Used for the `Asia/Dhaka · UTC+6` fact.

### Cards / Containers
The system has no card grid. Content blocks are either hairline-separated list items (steps, capabilities: 1px top border, 24px top padding, first item in each column dropping the border) or grid cells whose separation comes from a 1px gutter over a hairline ground (the vocabulary table). Neither carries a shadow, a background, or a radius of its own.

### Inputs / Fields
The page has one field and it is a representation, not an input: the composer inside the live panel. Cool Paper ground, hairline border, pill shape, 42px minimum height, 14.5px text. The caret is a 1px jade bar blinking on a 1s step function. Real inputs added later inherit the global jade caret and accent colours and the global focus ring.

### Navigation
Sticky 68px header, hairline bottom border, near-opaque ground with backdrop blur. Left: bell mark at 30px plus the wordmark in display 19px/600. Centre-right: two 14.5px medium links in Muted Ink that transition to Deep Ink on hover, hidden below `sm`. Right: the jade pill CTA, which is present at every width — on mobile the section links disappear and the CTA takes their place.

### Icons
One drawn system: a 24 viewBox, 1.5px stroke, round caps and joins, `fill="none"`, `stroke="currentColor"`, and `aria-hidden` with `focusable="false"` by default. Rendered at 20px in capability rows, 17–18px inside buttons, 24px in the icon plaque. Two exceptions, both deliberate: the WhatsApp mark, which is the platform's own filled glyph and is kept accurate; and the Remique bell mark, a filled jade rounded square (7px radius) with the bell knocked out in white.

**The Drawn Icon Rule.** Every icon is authored SVG on the 24 grid at 1.5 stroke, inheriting colour from its parent. No icon fonts, no emoji standing in for an icon, no third-party icon set dropped in at a different stroke weight.

### Live Thread Panel (signature)
The page's one interactive object and its only motion moment. A white 26px-radius panel on the Panel shadow, composed of three bands: a header (bell mark, name, pulsing jade online dot, language chip, pause control), a thread body of at least 244px, and a composer band above a hairline.

The body cycles four real turns — Banglish, English, Bengali script, relative time — each playing typing → sent → reading → parsed → replied. The parse readout is the payload: a jade-tint card with a mono legend, `task` in ink and `when` in coral, the coral being the only instance on the page.

Motion grammar, all three keyframes global:
- **rise** (620ms, `cubic-bezier(0.16, 1, 0.3, 1)`): opacity 0 → 1, 10px up, 6px blur → 0. Every arriving message element.
- **pulse** (1.8s ease-in-out, infinite): the online dot and the three typing dots, staggered 180ms.
- **caret** (1s, `steps(1, end)`, infinite): the composer caret.

The panel's commitments are what make it shippable: the thread renders complete on the server, so it reads with no JavaScript at all and the animation only replays content that is already there. Under `prefers-reduced-motion: reduce` all three animations are hard-cancelled to their end state and the demo never starts, which is why the render evidence shows a settled panel and no pause control. When the demo does run, a 28px pause control appears with a 2px invisible hit-area expansion and `aria-pressed` state (WCAG 2.2.2). The looping body is `aria-hidden` and one settled exchange is given as a static screen-reader equivalent — a live region was tried and removed, because it narrated the loop without end.

**The Server-Complete Rule.** Any animated content must render whole on the server first. Motion replays what is already readable; it never delivers information.

### Browser surfaces
The browser's own chrome is themed as part of the design, not left to the user agent: selection is white on jade, caret and accent colours are jade, the scrollbar is an 11px thin track in Cool Paper with a fully-rounded Hairline Strong thumb (3px track-coloured border, darkening to Soft Ink on hover), links carry a 0.22em underline offset with from-font thickness, and the mobile browser chrome is themed jade via `themeColor`.

## Do's and Don'ts

### Do:
- **Do** let jade own whole regions — a button, a bubble, a readout, a full-bleed block — and let white be the ground between them.
- **Do** reserve coral for the resolved hour. One coral figure per screen, at most.
- **Do** separate content with 1px hairlines and ground steps instead of boxing it.
- **Do** load Bricolage Grotesque with its `opsz` axis, and cap the display at 4.05rem with -0.035em tracking.
- **Do** set every parser-derived value in Geist Mono with `.tabular`, and every Bengali string in Anek Bangla with `lang="bn"`.
- **Do** draw new icons on the 24 grid at 1.5 stroke with round caps, inheriting `currentColor`.
- **Do** keep body text inside 68ch (`max-w-measure`) and headlines inside a character cap so breaks stay deliberate.
- **Do** render animated content complete on the server and cancel all motion under `prefers-reduced-motion`.
- **Do** give any looping motion a visible pause control with `aria-pressed`.
- **Do** theme browser surfaces — selection, caret, scrollbar, focus ring — as part of any new surface.
- **Do** treat the time-vocabulary rows as parser data mirrored from `src/lib/llm.ts` (the Banglish temporal mappings block); edit the parser first, then the page.

### Don't:
- **Don't** use coral for ordinary data, headings, borders, or hover states.
- **Don't** build a 3-up feature card grid, or put shadows under content blocks — the live panel is the only elevated surface at rest.
- **Don't** put an eyebrow, kicker, or uppercase label above a headline; the mono label belongs inside data surfaces, naming a field.
- **Don't** use emoji as an icon, or import an icon set at a different stroke weight.
- **Don't** return to the dark ground or WhatsApp's platform green as a brand colour — the WhatsApp mark is the only place that platform's identity appears, and it is monochrome there.
- **Don't** introduce a pure grey or blue-grey neutral; every neutral here is green-shifted.
- **Don't** number steps 01/02/03, or add a second display face.
- **Don't** restyle focus per component — the global 2px jade outline at 3px offset is the system's focus.
- **Don't** wrap a looping region in `aria-live`; give a static screen-reader equivalent instead.
