# A prototype preview may be a same-origin iframe, reached into directly

`<dpk-view-prototype>` accepts an `<iframe>` as a preview element. When its page is same-origin, the view treats the page's markup as part of the preview: it hit-tests, locates, measures and listens inside the frame's document. A UI target names an element in a frame by chaining a selector per document with `>>>` and by appending ` @ <url>`, the frame's page relative to the review page.

## Status

accepted

## Context

Prototypes outgrow hand-written light DOM. Once the mock is an app with its own router and build, the natural shape is to publish the build next to the review page (Claude Artifacts serve supporting files on the page's origin) and show it in a frame. Without support, a frame is a single opaque element. A reader cannot comment on what is inside it, `data-dpk-navigate` in it goes nowhere, and the frame keeps a fixed height.

The alternatives were:

- **A postMessage bridge**, where the framed page loads a kit script that answers hit tests and reports clicks. This works across origins, but every mock would need to ship and version a second script. The protocol would also become a public contract.
- **Reaching into the frame's document from the view.** This needs nothing from the mock, but it works only same-origin. The Artifact viewer serves supporting files same-origin, and so does a dev server, so this covers the case that prompted the change.

A target also has to stay meaningful across the frame's own navigation. Within one preview, the same selector on two routes of a framed app names two different elements, whereas a light DOM preview has only one page.

## Decision

- **Same-origin only, reached into directly.** The view reads `contentDocument` and walks across frame boundaries itself. A cross-origin frame stays opaque. A bridge for it can be added later without changing the target format.
- **Cross-realm safety.** Nodes of a frame belong to another realm, so the code that crosses frames tests nodes by `nodeType` and `localName`, not by `instanceof`.
- **Targets chain per document and carry the page.** A UI target's selector is `outer >>> inner`. Inside a frame, the selector is relative to the frame's `body`, and `:scope` means the page as a whole. ` @ <url>` names the frame's page, and marks and badges show only while the frame shows that page. Targets of light DOM markup keep their old form, so existing comments and notes are unaffected.
- **Only the kit's own link vocabulary is relayed.** A click on `data-dpk-navigate` in the frame moves the view. Any other link stays the framed app's own routing.
- **The frame takes its page's height** through a custom property, so it scrolls with the stage the way light DOM does.

## Consequences

- An app-built mock can be reviewed with comments, notes and navigation, and it needs no kit code of its own.
- Screen actions (`fill` / `click`) are not played inside a frame. The framed page has to listen for `dpk-action` on its `frameElement` and play the action itself.
- The view now depends on the framed page's layout. A page sized to its viewport never lets the frame shrink, and its height can only be documented, not enforced.
- A note is tied to a route. If the framed app renames a route, the note's `url` has to be carried forward, just as its `selector` is when markup moves.
- Supporting cross-origin frames later means adding a bridge beside this path, not replacing it.

## References

- `docs/views/prototype.md` (A preview in an iframe, Commenting on the UI)
- `docs/claude-artifact.md` (A mock built as its own app)
