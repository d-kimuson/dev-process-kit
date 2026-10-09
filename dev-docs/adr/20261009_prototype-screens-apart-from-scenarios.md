# Keep the prototype's app screens apart from its scenarios

The prototype template's base data declares the product's screens under the app they belong to (`apps[].screens[]`, each with its renditions as `previews`). A scenario step names the screen the user is on (`screen`) and keeps only what belongs to that moment of the story: the `situation` and the `materials` the user has at hand, such as a handwritten memo or a FAX. The app view reads the apps alone, and the scenario view composes a step from its materials and its screen.

## Status

accepted

## Context

The template began as `Activity › UserStory › Step › Preview[]`, where a step owns every preview it shows. Later the app view was added, which lets the reader use the UI as one app, whatever the scenario. That view had to _derive_ the app from the scenario: steps that show the same page title to the same actor became one screen, opened at its first step. The sub-application was inherited down the scenario tree, and links in the mocks pointed at steps.

That derivation mixes two things the product does not mix:

- **Scenario context leaks into the app.** A step's previews include what the user has in front of them outside the product: the memo next to the admin page, or the FAX that starts the refund story. The app view showed them as if they were part of the admin console. A FAX-only step even became a "screen" of the app.
- **The app's identity is a heuristic.** Two steps are one screen only when their title and actor match. The same page in two stories needs its markup twice, and the sitemap is a by-product of the order of the stories.
- **The product's markup knows the scenario.** A link in a mock names the step it leads to, so the same page cannot be shown by two stories without the links of one of them going to the wrong place.
- **`layout` encodes a distinction the model can now express.** `tabs` meant alternatives of the same page (mobile, desktop) and `side-by-side` meant things held together (the memo and the screen). Once a screen's renditions and a step's materials are different fields, that difference is in the data itself.

Alternatives considered:

- **Mark the previews that are scenario context** (by `kind: "plain"` or a flag) and leave them out of the app view. That is cheap and hides the memo. But the app stays derived from steps, so the duplication, the title heuristic and the step links all remain. Context is also not a matter of kind: a third-party web page next to the admin page is a `browser` preview, yet it is not the product.
- **A flat top-level `screens[]` with an `app` field.** Screens would not need an app declared, but every screen would need one for the app view's select anyway, and nesting says the same thing without a reference to check.

## Decision

- **Screens belong to apps.** `apps[]` declares each application of the product (`id`, `name`, optional `description` and `actor`, the user the app is for). Its `screens[]` declares the app's pages and states (`id`, `title`, optional `description`, `previews`). A screen's previews are renditions of the same page, such as mobile and desktop, and the reader switches between them with tabs. Screen ids and preview ids are unique across the page, because a screen is a navigation destination and a preview names a light DOM slot.
- **A step references a screen and owns only scenario context.** A step has an optional `screen` and optional `materials`: previews of things outside the product, shown next to the screen. It also keeps its `situation` and the scenario `actor`. The step `title`, `layout` and `previews` fields and the inherited `app` are removed. The heading comes from the screen, the composition from the fields, and the app from the screen.
- **The app view reads apps only.** Its sidebar is the apps' screens, as URL trees per app. Its hash is `view=app&screen=…&preview=…`, its heading is the app's `actor` and the screen's `title`, and its browser profile is the app's `actor`. Nothing a step declares reaches it.
- **Mock links name screens.** `data-dpk-navigate="screen=…"` is the link a page's markup uses. In the app view it opens the screen. In the scenario view it moves to the next step of the current story that shows that screen, then to an earlier one in the story, then to the first step on the page that shows it. A screen no step shows opens in the app view. `step=` and `story=` targets keep working for scenario-only links, and in the app view they open the screen of the step.
- **Comments can target a screen.** In the app view, the current target is the screen on stage, not a step.

## Consequences

- The app view can never show scenario context, by construction rather than by filtering. A page that several stories pass through is declared once, and its links are right in every story.
- Base data written for 0.0.9 and earlier no longer parses: `title`, `layout` and `previews` on a step, and `app` on any level, are rejected. Pages pin an exact version, so existing pages keep working until they are regenerated. An agent regenerating one moves each step's product previews into a screen and keeps the rest as materials.
- Authors declare a little more structure up front: every product page needs a screen under an app, even for a single-app prototype. In return they no longer repeat a title across steps to make them one screen.
- A step shows all renditions of its screen. A scenario that only ever uses the mobile rendition still offers the desktop tab when the screen has one. A per-step choice of rendition was left out until a page needs it.
- Materials are always shown beside the screen, never as tabs. A step that needs two alternatives that are not renditions of one screen has no way to say so.
- The scenario view's resolution of a screen link depends on the current step. A link's destination in the scenario is therefore contextual, while in the app view it is fixed.
- A screen may be shown by no step at all. The app view lists it like any other, and a link to it from the scenario view opens the app view. A page the product's menus link to but nobody has drawn yet is declared as a stub screen, so the link still leads somewhere instead of naming a story.
- UI comments land on a screen's renditions, so a comment made in one step is seen by every step that shows the screen, and in the app view. That is the point for comments on the product, but a remark that only holds for one moment of the story belongs on the step instead.
- A step shows one screen. Two windows of the product side by side (the buyer's phone next to the admin console) cannot be expressed; only one of them can be the screen, and the other would have to be a material, which the app view then does not see as part of the product.
- The scenario detail names the step's screen and links to it in the app view, so a reader can step out of the story onto the same page.

## References

- [Template docs: prototype](../../docs/templates/prototype.md)
