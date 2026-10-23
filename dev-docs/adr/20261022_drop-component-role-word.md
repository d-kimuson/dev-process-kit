# Drop the `component` role word: `dpk-component-<name>` becomes `dpk-<name>`

Every component's tag loses the `component-` segment (`dpk-component-state-diagram` → `dpk-state-diagram`), matching `dpk-page`. Templates keep `dpk-template-<name>` and template-owned sub-elements keep `dpk-internal-<template>-<name>`.

## Status

accepted. Narrows the component-tag guidance in [20260924_dpk-naming.md](20260924_dpk-naming.md); the rest of that decision (the `dpk` prefix, template and internal roles, the class-in-PascalCase rule, "page" as the authoring noun) stands.

## Context

20260924_dpk-naming.md gave every element a role word so a tag states whether it is a template, a component or a template-owned internal: `dpk-template-<name>`, `dpk-component-<name>`, `dpk-internal-<template>-<name>`. That ADR accepted the resulting length (`<dpk-component-sequence-diagram>`) because at the time every public role carried a word.

20261020_multi-board-pages.md then added a fourth role, the page host, and named it `dpk-page` — "the one role named without a suffix", because a page is the one element an author always writes and nothing else on the page could be mistaken for it. Once one role goes bare, `dpk-component-<name>` reads less like a deliberate convention and more like a word that never earned its keep: a component is not ambiguous with a template (`template-` already marks that) or with an internal (`internal-` already marks that), so `component-` was disambiguating a component from a page in a world where `dpk-page` did not yet exist. Components are also the tag an author types most often, since most pages hold several and some pages hold only a page of components.

## Decision

- **Component tags drop the role word.** `dpk-component-<name>` becomes `dpk-<name>`. The class stays the tag in PascalCase (`DpkComponentStateDiagram` → `DpkStateDiagram`), per the existing rule.
- **Only the component role changes.** Templates and template-owned internals keep their words; the asymmetry is intentional — `dpk-page`, `dpk-template-<name>` and `dpk-internal-<template>-<name>` all name something an author cannot mistake for a bare component, while a bare component is unambiguous once it is the only role with no word.
- **A component's directory name must not collide with another role.** Because components now share the same bare `dpk-<name>` shape as the page host and (within its own template) an internal, a new component's directory must not be `page`, must not equal a template's name, and must not start with `internal-` or `template-`. The `element-naming` lint rule (`dev/lints/conventions.js`) enforces a component's tag against its directory the same way it always did; this decision just removes the segment from what it checks. No existing component directory collided when this rename was made.

## Consequences

- Shorter, more consistent markup: every role an author writes bare-handed (`dpk-page`, and now every component) looks the same way, and only `template-` and `internal-` still say which role they mark.
- Pages generated before this change, including the published `v0.0.1`–`v0.2.1` releases, pin their exact version on jsDelivr (20260924_npm-jsdelivr-distribution.md) and keep loading the bundle that still defines `dpk-component-*`; they are unaffected. Only a page generated against this version or later uses the new names, same as any other contract change carried by the version.
- A future component whose directory name would collide with a template, with `page`, or with the internal/template prefixes is now rejected by the lint rule during review, not discovered later in a browser.
