# Make `<dpk-page>` the base form of every page, and keep the screen layout inside it

`<dpk-page>` is the element a page starts from, whether it holds one board or several. The rail of boards is always drawn, even for one board, with the "+" that adds another at its foot; a page with one board shows no board name in the header, since there is nothing to tell it apart from. The whole-screen layout (the header and footer bars, the sidebars and the main column) is internal to the shell; a page gets its regions through slots, and a region with no content draws nothing, not even its buttons.

## Status

accepted. Supersedes the guidance in [20261020_multi-board-pages.md](20261020_multi-board-pages.md) that a single template on its own is the simpler page; the rest of that decision stands. Its own guidance that the rail is a region of its own, always drawn, with its own fold toggle, is superseded by [20261023_header-board-switcher.md](20261023_header-board-switcher.md); the rest of this decision stands.

## Context

With pages of boards, an agent chose between two shapes for the same page: a template on its own, or a `<dpk-page>` around it. The two looked different (the page always drew a rail) and were written differently, so a page that grew a second subject had to be rewritten, and the docs had to teach both.

The screen layout had also been published as two elements (`dpk-layout-app`, `dpk-layout-sidebar`) so that a page built from components could reuse the shell's frame. They did not compose: the page's rail was itself a sidebar layout with the board's own sidebar layout nested inside it, a sidebar on each side of the main column could not be expressed, and a page using them directly duplicated what `<dpk-page>` already does. Publishing them also froze attributes that only the shell needs.

## Decision

- **One shape.** Docs and samples write every page as `<dpk-page>` with its boards. One board is the plain case of the same markup, not a separate form, so adding a board never rewrites the page. A template that is the page root on its own keeps working exactly as before (existing pages, tags of earlier versions), but it is no longer the form we teach.
- **The rail is a region of its own, always drawn.** The board rail is a fixed column before the sidebars, not a sidebar; it is drawn for one board the same as for several. It carries its own fold toggle, which acts on the active board's own sidebar — the one control shown twice, once at the top of the rail and once on the sidebar's own edge — so there is a single fold state rather than two to keep in sync.
- **Sidebars are slots.** The shell has a sidebar on each side of the main column. The template's own sidebar takes the side its `sidebarLayout` names; the author's `slot="sidebar"` content joins it, and `slot="aside"` content becomes the sidebar on the other side. Each side is resized and folded on its own, and a side with nothing in it has no edge and no button.
- **The layout elements are internal.** They are named `dpk-internal-layout-*`, are not exported, and are not documented for authors. Laying out part of the screen (a toolbar, a canvas, a card grid) stays the job of components and atoms.

## Consequences

- An author learns one page shape and one set of slots; growing a page from one board to several adds a child, nothing else.
- A page built from components alone no longer has a public frame to sit in. It is written inside a template (`plain`) on a `<dpk-page>`, or lays itself out with ordinary CSS.
- Whole-screen templates that own the full viewport (`slides`, `whiteboard`) still need their own answer to how they sit inside a page's chrome; this decision does not settle it.
- Two shapes keep working for compatibility, so the standalone path must stay covered by the template tests even though the docs no longer lead with it.

## References

- [20261020_multi-board-pages.md](20261020_multi-board-pages.md)
- `docs/page.md`
