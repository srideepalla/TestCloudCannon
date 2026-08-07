# Accessibility Issues — IBA (`iba-new-template`)

**Standard:** WCAG 2.1 AA (2.2 noted where it applies) · **Updated:** 07 August 2026

**Sources merged into this list**

- Rendered-DOM sweep of the built output (all pages parsed, 45 automated checks per page)
- Exact contrast computation from `src/data/theme.json` (both themes, alpha-composited)
- Skynet Technologies Free Accessibility Checker report, 07 Aug 2026 (`moving-salmon.cloudvent.net`)
- ESLint `astro/jsx-a11y` (31 rules) — currently **0 errors**, 45 warnings

Status column is verified against the **current working tree**, not against the older build.

---

## A. Open — code fix, no decision needed

- [ ] **A1 · Footer newsletter button is not a link.** `Footer.astro:99` passes `href=` to `<Button>`, whose prop is `link` (`Button.astro:13`, used at `:33`). Unrecognised props fall into `...htmlAttributes` and land on the wrapper `<span>`, so the rendered `<a>` has **no `href`** — not focusable, not keyboard-activatable, not exposed as a link. Affects every page. Also flagged by Skynet as *"Link should have a valid attributes"*. → change `href=` to `link=`. **WCAG 2.1.1 A, 4.1.2 A**
- [ ] **A2 · Mobile "Log in" is a dead `href="#"`.** `MainNav.astro:31` reads `button.href`, but the nav data key is `link` (`mainNav.json`). Desktop renders the real URL; the mobile drawer renders `#`. Nobody below 1025px can log in. → `path: button.link || button.href || "#"`. **WCAG 2.4.4 A, 3.2.3 AA**
- [ ] **A3 · Hero subheading renders before the `h1`.** `HeroCalendar.astro:74` emits the subheading as `h3`, above the `h1` at `:84`. The document's first heading is therefore an `h3`. → make the subheading a `<p>` (or move it after the `h1`). **WCAG 1.3.1 A**
- [ ] **A4 · Staff "Read More" is an unnamed checkbox.** `StaffCard.astro:61-91` — a hidden checkbox whose name comes from a `<label>` containing two `<Button>`s with **no `link`**, so each card also emits dead `<a>` elements. No `aria-expanded`. Announced as *"Read More, checkbox, not checked"* with no indication of whose bio. → native `<button aria-expanded>` labelled `Read more about {name}`. **WCAG 4.1.2 A, 2.4.4 A**
- [ ] **A5 · Body links are colour-only.** `_typography.css:74-81` sets `text-decoration: none`. Measured link-vs-text contrast **1.28:1** (dark) / **2.84:1** (light); 3:1 is required before colour alone may carry the distinction. → add an underline to in-content links. Needs no new brand colour. **WCAG 1.4.1 A**
- [ ] **A6 · No `scroll-padding` under the sticky nav.** Tabbing to an element near a section top can scroll it under the sticky bar. → `scroll-padding-top: var(--nav-height)` on `:root`. **WCAG 2.4.11 AA**
- [ ] **A7 · Touch targets below 24×24px.** Carousel indicator dots are 8×8px; the nav submenu chevron computes to ~21×21px. → expand hit area via padding/pseudo-element. **WCAG 2.5.8 AA (2.2)**
- [ ] **A8 · Component-docs layout has no skip link.** `LibraryLayout.astro` builds its own shell and renders a full sidebar before a `<main>` with no `id`. → mirror `BaseLayout.astro`'s skip link and add `id="main"`. **WCAG 2.4.1 A**
- [ ] **A9 · Language options carry no `lang`.** The desktop switcher shows a bare code with no `lang` attribute, so each language name is pronounced with the current page's rules. → add `lang={lang.langCode}` per option. **WCAG 3.1.2 AA**
- [ ] **A10 · Form building blocks permit a nameless control.** All eight render a label only when one is supplied, with no `aria-label` fallback; a shipped example configures a slider with no name. → require `label` or fall back to `aria-label={name}`. **WCAG 3.3.2 A**
- [ ] **A11 · Segments icon-only mode has no reliable name.** Only a `title` on a nested span. → `aria-label={option.label}` on the input. **WCAG 4.1.2 A**
- [ ] **A12 · Desktop nav blurs keyboard focus on hover.** `Bar.astro` calls `.blur()` when hovering another item, stranding focus. The `:has(:focus-visible)` rule already keeps keyboard menus open, so the call can simply be deleted. **WCAG 2.4.3 A**

## B. Open — content fix

- [ ] **B1 · Empty `href` in content.** `<a href="">2025 Stevie Awards Winners Page</a>` (Skynet). → supply the destination or remove the link wrapper.
- [ ] **B2 · Four links with no accessible name.** `<a href="…"><strong></strong></a>` — the bold wrapper survived but its text did not: `about/contact` (japan), `about/faq` (shopify), `enter/regulations-terms-conditions` (mailto), `thank-you-for-requesting-the-…-entry-kit`. **WCAG 2.4.4 A**
- [ ] **B3 · "Georgia" contact link points at `href="#"`.** Every other country entry links to its region anchor. → supply the anchor or make it plain text. *Needs content input: does Georgia have a representative?*
- [ ] **B4 · Webinars page: 4 `<h1>`s, two of them empty, plus 3 empty `<h2>`s** and two duplicate IDs (`webinar-sessions`, `webinar-registration-cards`). → delete the empty heading blocks, demote all but the page title. **WCAG 1.3.1 A**
- [ ] **B5 · Contact page: 11 duplicate IDs.** `<Anchor id="australia"/>` renders `<span id="australia">` immediately before `<h3 id="australia">` (auto-slugged from the heading). Jump links land on an empty span. → drop the explicit anchors and rely on heading IDs. **WCAG 4.1.1**
- [ ] **B6 · Eleven "click here" links** across FAQ, submission guide and press pages. → fold the destination into the link text. **WCAG 2.4.4 A**
- [ ] **B7 · Decorative logo with empty `alt`** flagged by Skynet for a possible `title` attribute. → confirm it is decorative; if it is the wordmark, give it real alt text. **WCAG 1.1.1 A**

## C. Open — needs a decision

- [ ] **C1 · Focus indicator is invisible on primary buttons.** `--color-focus-ring: rgba(223,186,25,0.4)` is an **inset** shadow with `outline: none`, and no global `:focus-visible` rule exists. Composited contrast: **1.00:1 on the brand button fill** (identical hue), 1.28:1 on white, 2.42:1 on black — all below 3:1. → real `outline` offset outside the control, in a colour reaching 3:1 on every ground. **Design owns the colour. WCAG 2.4.7 AA, 2.4.11 AA**
- [ ] **C2 · Colour contrast — 69 failures (Skynet's largest cluster).** Token-level, not per-element:

  | Pair | Actual | Needs | Where |
  |---|---|---|---|
  | `#fff` on `#dfba19` | **1.88:1** | 4.5:1 | every primary button label |
  | `#f59e0b` on `#fff` | **2.15:1** | 4.5:1 | emphasis links |
  | `#f00` on `#fff` | **4.00:1** | 4.5:1 | form error messages |
  | `#9c7727` on `#fff` | **4.13:1** | 4.5:1 | muted text |
  | `#d1d5db` on `#fff` | **1.47:1** | 3:1 | button & table borders |
  | `#374151` on `#000` | **2.04:1** | 3:1 | dark-theme borders |

  → one coordinated `theme.json` pass. **Design owns the values. WCAG 1.4.3 AA, 1.4.11 AA**
- [ ] **C3 · Navigation `aria-expanded` desyncs.** Bar syncs only the click path (hover and focus open the panel while it still reports `false`); Mobile computes the value once at build time and never updates it; Side leaves a sibling-deselected radio reporting `true` forever. → `<details name="…">` for Side/Mobile, native `<button>` + one state controller for Bar/LanguageSwitcher. **Blocked on: revert nav files first? keep hover-to-open? WCAG 4.1.2 A**
- [ ] **C4 · Skip link is defeated by the mobile drawer.** The hide rule compiles to the descendant selector `.main-nav .mobile`, but `Mobile.astro` reparents the nav to `#overlays-container` at `body.firstChild`, outside `.main-nav`. First `Tab` lands on the hidden mobile menu. → un-nest the `@media` block. **WCAG 2.4.1 A**
- [ ] **C5 · Dialogs have no focus trap and no `aria-modal`.** `popover="auto"` gives light-dismiss but does not trap focus; `Tab` walks out behind the dialog. → implement the trap *before* adding `aria-modal`, or switch to `<dialog>.showModal()`. **WCAG 2.1.2 A**
- [ ] **C6 · Tab widget invalid against the ARIA APG.** Tabpanel nested inside the tablist (`display: contents` flattens it), no roving tabindex, no Arrow/Home/End. → restructure; 1–2 days. **WCAG 4.1.2 A**
- [ ] **C7 · Split-link nav parity.** Desktop renders a page link *plus* a submenu toggle; Mobile and Side render only the toggle, so those users cannot reach the parent item's own page. → add it to Mobile/Side, or remove from desktop. **Product decides. WCAG 3.2.3 AA**
- [ ] **C8 · Global `overflow-x: hidden`** hides reflow failures instead of surfacing them. Reflow currently passes 5/5 at 320px, so nothing known is masked — but the next regression will be silent. **WCAG 1.4.10 AA**
- [ ] **C9 · 852 `target="_blank"` links with no new-tab cue** (English pages). All carry `rel="noopener"`, so no security exposure. Too many to hand-edit — an authoring-pattern decision. **WCAG 3.2.5 AAA**
- [ ] **C10 · Heading level is a free-form CMS string** with no validation against surrounding order — this is how B4 happened. A governance question, not a code fix.
- [ ] **C11 · Locale copies lag the English fixes.** Untitled iframes and `autoStart=1&playButton=0` (autoplay with the pause control hidden) remain in `src/content/pages/<locale>/`. Live today. **WCAG 4.1.2 A, 2.2.2 A**
- [ ] **C12 · Unbalanced `<a>` tags in two translated strings.** The `ms` and `fa` footer strings in `ui.json` have 3 opens and 0 closes, so the final link swallows the rest of the document (quick-actions button, modal, footer lists all nested inside it). 104 pages. Re-running translation will **not** fix it — the translator's output is what is malformed. **WCAG 4.1.2 A**

## D. Third-party — not fixable in this repo

- **D1 · reCAPTCHA textareas unlabelled.** Both `<textarea id="g-recaptcha-response">` elements are injected by Google and are `display: none`. Verify they stay out of the accessibility tree; prefer invisible/v3 if configurable. *(Skynet: "All Form fields should be labelled properly" — 2 failures.)*

---

## E. Verified fixed — do not re-open

| Issue | Verified |
|---|---|
| Footer "Quick Links" heading skip | `Footer.astro:64` now `level="h2"` |
| Homepage missing `<h1>` | `HeroCalendar.astro:84` now `level="h1"` |
| `--color-border-inputs` undefined in dark theme | present in `theme.json` `dark` block |
| Unlabelled `<nav>` landmarks | Bar `aria-label="Main"`, Mobile `"Mobile"`, Side `"Section"`, breadcrumb `"Breadcrumb"` |
| Segments unreachable by keyboard | now `height:0; opacity:0; width:0` (focusable) |
| Layout tables with no `<th>` | zero `<table>` elements remain in English output |
| Iframes untitled / `title="Form"` | English embeds now descriptively titled |
| Images with no `alt` | zero in English output; test-debris page removed |
| Duplicate IDs (Skynet check) | 11 passes, 0 failures |
| Viewport blocks zoom | passes — no `user-scalable=no` |
| Skip-link presence | present (though see **C4** for it being shadowed) |

---

## Verification

- `npm run lint` — must stay at **0 errors** (`astro/jsx-a11y`, 31 rules)
- `npm run lint:a11y` — alt-text check across English content
- `npm run build` — must emit the full page count
- **Not automatable, required before claiming AA:** screen-reader passes (NVDA, VoiceOver) over nav / tabs / dialogs / staff cards; keyboard-only click-through; 320px and 400% zoom reflow; visual confirmation that the focus indicator is visible on a primary button once **C1** lands.
