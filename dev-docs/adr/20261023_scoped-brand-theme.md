# Theme a subtree with two CSS custom properties

## Status

accepted

## Context

`dev-process-kit` renders two things on one page: the kit's own chrome (toolbars, panels, the review rail — always its indigo-violet mark) and, inside a template such as `dpk-template-prototype`, an author's own prototyped application screens. An author building a UX prototype wants those screens to carry their application's brand colors, not the kit's, while the kit's chrome around them stays recognizably `dev-process-kit`.

Every atom and component already draws its primary and accent colors from two token families in `src/core/theme.ts`: `--dpk-accent*` (primary actions, selection, the kit's own mark) and `--dpk-blue*` (focus rings, links, secondary emphasis). Both families were, until now, a fixed set of hand-picked literals per color scheme — there was no way for an author to change them for part of a page without overriding every derived token (`--dpk-accent-strong`, `--dpk-accent-bright`, `--dpk-accent-soft`, …) by hand, which is brittle and not a contract anyone could rely on.

The obvious alternative — a `theme` attribute on a template or a JS `setTheme()` helper — was rejected: `TemplateElement` already has a `theme` attribute/property for the light/dark color-scheme choice, and reusing the word for an unrelated "brand palette" concept would be confusing. A second alternative, a dedicated attribute such as `brand` taking a preset name, was rejected because it would require the kit to ship and maintain a palette of presets rather than letting an author supply their own two colors.

## Decision

Two CSS custom properties are the entire contract: `--dpk-brand-primary` and `--dpk-brand-secondary`. No attribute, no JS API, no new element carries them.

Every derived token keeps reading its raw input through `var(--dpk-brand-primary, <dev-process-kit's own color>)` / `var(--dpk-brand-secondary, <dev-process-kit's own color>)`, never assigning a literal unconditionally. `--dpk-accent*` derives from `--dpk-brand-primary`, `--dpk-blue*` from `--dpk-brand-secondary`, each by `color-mix()` (stronger/darker, brighter/lighter, and a soft translucent tint), so a theme only has to supply two base colors and every atom — buttons, chips, badges, inputs, cards, links, focus rings — recolors together. `--dpk-accent-ink` (the foreground color against a filled accent background) stays the fixed `#ffffff` it always was; a theme is expected to pick a primary dark enough to keep white text readable, same as the kit's own color does today.

A subtree that never sets either property is visually unchanged: the `var()` fallback is the kit's existing literal, reproduced exactly (not re-derived), so the catalog and every page that predates this feature keeps its current indigo-violet and blue pixel for pixel.

Declaring the two properties only scopes a theme where some rule _redeclares_ the derived tokens there too — a `var()` reference resolves once, where that rule's selector matches, and inherits unchanged below it; it does not re-run at every descendant. The kit redeclares the derivation at two such points already: once per component instance (`:host`, in `tokens`) and once for the whole document (`:where(:root)`, in `documentTokens`). Content with neither boundary — an author's light DOM slotted into an already-instantiated component, an app screen a template renders with its own brand next to the template's own chrome in one shared host — needs a third, explicit point to redeclare the derivation. That point is the `data-dpk-theme` attribute: any element that carries it, together with the two brand properties, becomes a scope boundary the same way `:host` and `:root` already are. It ships as CSS with the atoms (`src/components/atoms/styles.ts`), so it is present wherever atoms are, and `src/core/theme.ts` generates it (`themeScope`) from the exact same `brandTokens()` function `tokens` and `documentTokens` call, so the three can never drift apart.

Custom-property resolution is per shadow root, so a themed subtree's own nested shadow roots (a card inside a themed preview, for instance) pick the theme back up automatically wherever `src/core/theme.ts`'s token block is already redeclared — which is everywhere a component defines `static styles`. Nothing elsewhere in the codebase needs to change for this to work.

Order/task-style status semantics (success, warning, danger, …) are a separate, fixed set of tones and are not themed by these two properties — they mean the same thing regardless of which brand is in effect.

## Consequences

- The contract is two property names plus one attribute for the one case that needs it (`data-dpk-theme`); it carries no JS surface and needs no runtime test beyond a guard that `themeScope` stays byte-identical to `tokens` / `documentTokens` (`src/core/theme.test.ts`).
- Declaring the two properties alone does nothing outside a `:host` or `:root` boundary — an author who forgets `data-dpk-theme` on light DOM with neither boundary gets no error, just the kit's unchanged colors, because the `var()` fallback is silent by design.
- A theme is only two colors; an author cannot independently restyle, say, `--dpk-green` (success) or `--dpk-danger` this way, by design — those stay the kit's fixed semantic tones.
- The derived tints are recomputed by `color-mix()` instead of being hand-picked per theme, so a theme's tints always track its two base colors, at the cost of no longer being literally identical, pixel for pixel, to the hand-tuned literals that preceded this change in edge cases `color-mix()` rounds slightly differently (accepted: visually equivalent in both color schemes).
- Because the properties are declared with a `var()` fallback rather than assigned on `:host`/`:root`, an author who wants the _kit's own_ colors inside an already-themed subtree can reset them with `--dpk-brand-primary: initial` (or redeclare the kit's literals) on a narrower element — the same inheritance mechanism in reverse.

## References

- `src/core/theme.ts` (`brandInput`, `brandTokens`, and their use in `tokens` / `documentTokens` / `themeScope`)
- `src/components/atoms/styles.ts` (`themeScope` registered into `atomStyles`)
- `docs/index.md` ("Theme")
- `docs/templates/prototype.md`
