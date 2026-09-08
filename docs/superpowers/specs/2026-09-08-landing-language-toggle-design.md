# Landing page EN/BN language toggle

Date: 2026-09-08

## Goal

The landing page (`/`) ships in Bangla by default, with a toggle in the navbar
that switches it to the English copy that exists today. The choice is remembered
across visits.

Bangla is the first language of nearly every person Remique is for. A landing
page that opens in English asks them to translate the pitch before they can
judge it.

## Decisions

Three choices were settled before design, and they bound everything below.

**Client-side toggle, one URL.** A React context holds the language; the toggle
flips it in place. No locale routes, no middleware, no duplicated pages. The
cost is accepted and stated under Trade-offs.

**Landing page only.** `/pricing`, `/faq`, `/how-it-works` and `/use-cases` stay
English. The provider wraps only the home page tree, so those pages — which
render their own `Navbar` and `SiteFooter` — are unaffected by a visitor's
choice.

**Bangla copy drafted here, edited by the owner.** Every string lives in one
file so the Bangla can be rewritten without touching a component.

## Architecture

Three new files.

### `src/lib/i18n/copy.ts`

The whole dictionary, and the only place a landing-page string is written.

```ts
export type Lang = "en" | "bn";
const en = { ... } as const;
export type Copy = typeof en;
const bn: Copy = { ... };
export const COPY: Record<Lang, Copy> = { en, bn };
```

Typing `bn` as `Copy` is the enforcement: a missing or misspelled Bangla key
fails `tsc`, so the two languages cannot drift apart silently.

Strings that wrap inline markup are split at the markup boundary rather than
carrying HTML. The hero paragraph, for instance, is `heroSubBefore` +
`<span lang="bn">বাংলা</span>` + `heroSubAfter`, which holds in both languages
because the word বাংলা sits mid-sentence in each.

The rotating headline is `headlinePrefix` + rotator phrase + `headlineSuffix`.
English uses prefix "Never forget" with suffix "again."; Bangla leaves the
prefix empty and puts the whole verb phrase in the suffix, which is where Bangla
word order wants it.

### `src/components/lang-provider.tsx`

`"use client"`. Context of `{ lang, setLang }`.

- Initial state is `"bn"`, so the server renders Bangla.
- On mount, a `useEffect` reads `localStorage["remique-lang"]` and calls
  `setLang` if a valid stored value differs.
- `setLang` writes back to `localStorage` inside a `try`/`catch` — a browser
  with storage blocked must still toggle.
- `useCopy()` returns `COPY[lang]`. Called with no provider above it, it returns
  `COPY.en`. That default is what keeps the other four pages English.

### `src/components/lang-toggle.tsx`

A segmented pill, `বাং | EN`, styled after the existing weekly/monthly control
in `home-pricing.tsx` so it reads as part of the same design system rather than
a new component vocabulary. Two `<button>`s with `aria-pressed`, wrapped in a
`role="group"` labelled in the active language.

## Files changed

| File | Change |
| --- | --- |
| `src/app/page.tsx` | becomes a client component; every literal reads from `useCopy()`; the tree is wrapped in `LangProvider` |
| `src/components/navbar.tsx` | nav labels and CTA from copy; `LangToggle` mounted on desktop and inside the mobile menu, rendered only when `pathname === "/"` |
| `src/components/site-footer.tsx` | becomes a client component; all strings from copy |
| `src/components/hero-rotator.tsx` | phrases come from copy instead of a module constant |
| `src/components/home-pricing.tsx` | feature list, billing-period labels and card copy from copy |
| `src/components/home-faq.tsx` | the five question/answer pairs from copy |
| `src/app/globals.css` | `:lang(bn)` font rules |

`HERO_CHAT` in the WhatsApp mockup is left alone in both languages. It is
deliberately a mixed English-and-Bangla thread — that mixing is the product
demonstration, and translating it would erase the point.

The toggle is hidden off `/` because it would otherwise appear on four pages
where pressing it changes nothing.

## Fonts

Bricolage Grotesque, the display face, carries no Bengali. Left alone, Bangla
headings fall back to whatever the system offers, which is what a machine
translation looks like.

The provider sets `lang` on its wrapper element and `globals.css` keys off it:

```css
:lang(bn),
:lang(bn) .font-display {
  font-family: var(--font-bn), system-ui, sans-serif;
}
```

Anek Bangla is already loaded in `layout.tsx` as `--font-bn`; no new font
request. Prices keep Western digits (৳49, not ৳৪৯), which is what Bangladeshi
commerce uses.

## Trade-offs

**One frame of Bangla for returning English visitors.** The server renders BN
and the stored preference is applied in an effect, so a visitor who previously
chose EN sees Bangla for a paint. Removing it entirely requires locale routes or
rendering both copies and hiding one in CSS, both of which were considered and
rejected as heavier than this page needs.

**Crawlers see Bangla only.** There is one URL and it serves the default
language. If English search traffic later matters more than this simplicity,
the fix is locale routes, and the dictionary built here is what they would
consume — no copy is rewritten to make that move.

## Testing

`tests/i18n-copy.test.ts` walks `COPY.en` and `COPY.bn` recursively and asserts
identical key sets and identical array lengths at every level, then asserts no
Bangla value is left as its English source string. The type system catches
missing keys; this catches an untranslated one and a features array that lost a
row.

Browser verification on the running dev server: the page loads in Bangla,
toggling to English swaps the copy, a reload keeps English, and Bangla text
renders in Anek Bangla rather than a system fallback.
