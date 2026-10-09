# Keep the prototype's app screens apart from its scenarios

The prototype template's base data declares the product's screens under the app they belong to (`apps[].screens[]`, each with its renditions as `previews`). A scenario step lays out what it shows as `panes`, left to right: references to screens, each optionally pinned to one rendition, and materials the user has at hand, such as a handwritten memo or a FAX. With its `situation`, that is all a step owns. The app view reads the apps alone, and the scenario view composes a step from its panes.

## Status

accepted

## Context

The template began as `Activity › UserStory › Step › Preview[]`, where a step owns every preview it shows. Later the app view was added, which lets the reader use the UI as one app, whatever the scenario. That view had to _derive_ the app from the scenario: steps that show the same page title to the same actor became one screen, opened at its first step. The sub-application was inherited down the scenario tree, and links in the mocks pointed at steps.

That derivation mixes two things the product does not mix:

- **Scenario context leaks into the app.** A step's previews include what the user has in front of them outside the product: the memo next to the admin page, or the FAX that starts the refund story. The app view showed them as if they were part of the admin console. A FAX-only step even became a "screen" of the app.
- **The app's identity is a heuristic.** Two steps are one screen only when their title and actor match. The same page in two stories needs its markup twice, and the sitemap is a by-product of the order of the stories.
- **The product's markup knows the scenario.** A link in a mock names the step it leads to, so the same page cannot be shown by two stories without the links of one of them going to the wrong place.
- **`layout` encodes a distinction the model can now express.** `tabs` meant alternatives of the same page (mobile, desktop) and `side-by-side` meant things held together (the memo and the screen). Once a screen's renditions and a step's materials are different things, that difference is in the data itself.

Alternatives considered:

- **Mark the previews that are scenario context** (by `kind: "plain"` or a flag) and leave them out of the app view. That is cheap and hides the memo. But the app stays derived from steps, so the duplication, the title heuristic and the step links all remain. Context is also not a matter of kind: a third-party web page next to the admin page is a `browser` preview, yet it is not the product.
- **A flat top-level `screens[]` with an `app` field.** Screens would not need an app declared, but every screen would need one for the app view's select anyway, and nesting says the same thing without a reference to check.

## Decision

- **Screens belong to apps.** `apps[]` declares each application of the product (`id`, `name`, optional `description` and `actor`, the user the app is for). Its `screens[]` declares the app's pages and states (`id`, `title`, optional `description`, `previews`). A screen's previews are renditions of the same page, such as mobile and desktop, and the reader switches between them with tabs. Screen ids and preview ids are unique across the page, because a screen is a navigation destination and a preview names a light DOM slot.
- **A step lays out panes and owns only scenario context.** A step has `panes`, an ordered list whose order is the left-to-right layout. Each pane is either `{ screen, preview? }`, a reference to a screen with an optional pinned rendition, or `{ material }`, a preview of something outside the product. A step keeps its `situation` and the scenario `actor` as well. The step `title`, `layout` and `previews` fields and the inherited `app` are removed.
  - A screen pane without `preview` offers all the screen's renditions as tabs; a pinned one shows that rendition alone. A step may show several screens, and the same screen twice only when each of its panes pins a distinct rendition. A pinned `preview` must be a rendition of that screen.
  - The hash's `preview` is a comma-separated list with one selected rendition per unpinned screen pane that has tabs. Preview ids are unique across the page, so each entry identifies its screen without positional coupling.
  - The heading of a step showing exactly one screen comes from that screen; a step showing several screens, or none, is headed by the step's `name`.
- **The app view reads apps only.** Its sidebar is the apps' screens, as URL trees per app. Its hash is `view=app&screen=…&preview=…`, its heading is the app's `actor` and the screen's `title`, and its browser profile is the app's `actor`. Nothing a step declares reaches it.
- **Mock links name screens.** `data-dpk-navigate="screen=…"` is the link a page's markup uses. In the app view it opens the screen. In the scenario view it moves to the current step if one of its panes shows that screen, else to the next step of the current story that does, then to an earlier one in the story, then to the first step on the page that shows it. A screen no step shows opens in the app view. `step=` and `story=` targets keep working for scenario-only links, and in the app view they open the step's first screen.
- **Comments can target a screen.** In the app view, the current target is the screen on stage, not a step.

## Consequences

- The app view can never show scenario context, by construction rather than by filtering. A page that several stories pass through is declared once, and its links are right in every story.
- Base data written for 0.0.9 and earlier no longer parses: `title`, `layout` and `previews` on a step, and `app` on any level, are rejected. Pages pin an exact version, so existing pages keep working until they are regenerated. An agent regenerating one moves each step's product previews into a screen and lists the screen and the remaining previews, as materials, in the step's `panes`.
- Authors declare a little more structure up front: every product page needs a screen under an app, even for a single-app prototype. In return they no longer repeat a title across steps to make them one screen.
- A step decides how much of a screen it shows: all its renditions as tabs, or one pinned rendition. Pinning is per pane, so a scenario that only ever uses the mobile rendition says so instead of offering a desktop tab it never talks about.
- Panes are always laid side by side, never as tabs. A step that needs two alternatives that are not renditions of one screen has no way to say so.
- Several screens on one stage each keep their own selected rendition, which is why the hash's `preview` is a list rather than a single id. A link that names one rendition (`preview=x`) still works: the pane whose screen has `x` shows it, and every other pane falls back to its first rendition.
- The scenario view's resolution of a screen link depends on the current step. A link's destination in the scenario is therefore contextual, while in the app view it is fixed.
- A screen may be shown by no step at all. The app view lists it like any other, and a link to it from the scenario view opens the app view. A page the product's menus link to but nobody has drawn yet is declared as a stub screen, so the link still leads somewhere instead of naming a story.
- UI comments land on a screen's renditions, so a comment made in one step is seen by every step that shows the screen, and in the app view. That is the point for comments on the product, but a remark that only holds for one moment of the story belongs on the step instead.
- Two windows of the product side by side (the buyer's phone next to the admin console) are two screen panes, so both stay part of the product and reachable in the app view. From the scenario, the app view opens the step's first screen.
- The scenario detail names every screen of the step and links each to the app view, so a reader can step out of the story onto the same page.

## References

- [Template docs: prototype](../../docs/templates/prototype.md)
