# Name the public contract after the project: `dpk-*`

Every custom element, event, attribute and CSS custom property the framework ships carries the `dpk` prefix, and the element name says which kind of element it is: `dpk-template-<name>`, `dpk-component-<name>`, or `dpk-internal-<template>-<name>`.

## Status

accepted

## Context

The first versions used an `artifact-*` prefix (`<artifact-prototype>`, `artifact-change`, `--af-*`) and called the project a "single HTML artifact framework". The word came from one hosting environment, and it suggested that the pages only make sense there, although they are ordinary HTML files that load a pinned ESM bundle from any origin. The prefix also did not say whether an element is a template (it owns the draft and the review rail), a component (it can be used on any page), or a part of a template that authors never write.

Tag names, event names, `data-*` attributes and CSS custom properties are the public contract, and a page generated against one release keeps them. Renaming them later breaks every page that pinned an earlier release, so this has to be settled before the first versioned release.

## Decision

- **One prefix for the project: `dpk`.** Elements, events (`dpk-change`, `dpk-comment-submit`, …), author attributes (`data-dpk-comment`, `data-dpk-navigate`) and theme tokens (`--dpk-*`) all use it. The global the bundle announces itself on is `window.devProcessKit`.
- **The element name states its role.** `dpk-template-<name>` is a template root, `dpk-component-<name>` is a component that works on any page, and `dpk-internal-<template>-<name>` is a sub-element a template renders in its own shadow DOM. Clarity wins over length: authors write a tag once per page.
- **The class is the tag in PascalCase** (`dpk-template-event-storming` → `DpkTemplateEventStorming`), so a stack trace or a devtools node names the element that is on the page.
- **Tags are fixed.** An element registers under its one name; there is no parameter to register it under another.
- **"Page" is the noun for what an author writes.** Documentation and UI text say page (ページ), not artifact; the page-wide comment target is `page:<template>`.
- **The convention is checked, not only documented.** A lint rule rejects a `customElements.define` whose tag does not match the directory it lives in, or whose class is not the tag in PascalCase.

## Consequences

- Pages written against the pre-release `@debug` builds with `artifact-*` names stop working. No versioned release ever shipped those names, so there is no compatibility layer.
- Long tag names in markup (`<dpk-component-sequence-diagram>`). This is accepted: the name is written once and read many times.
- A new template or component gets its name from its directory; the lint rule fails the build if the two drift apart.
