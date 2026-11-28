# dpk-panel-section

A section the author writes for the side panel: discussion points, decisions, notes, anything the reader checks beside the content rather than in it. Place it as a direct child of the panel's owner — `<dpk-page>`, or a standalone `dpk-view-*` / `dpk-board-*` — with `slot="panel"`.

```html
<dpk-page name="design-doc">
  <dpk-view-plain>…</dpk-view-plain>
  <dpk-panel-section slot="panel" name="issues" label="Open points" badge="2">
    <ol>
      <li>What happens when the refund keeps failing.</li>
      <li>The deadline for a cancellation.</li>
    </ol>
  </dpk-panel-section>
  <dpk-panel-section slot="panel" name="decisions" label="Decisions">…</dpk-panel-section>
</dpk-page>
```

Each section is one segment of the switch at the top of the panel, in document order, after the kit's own **Detail** segment (shown while the content is a board that shows a selected element's detail) and any section a component adds. Only the section the panel is on is shown; the rest stay in the document, hidden.

## Attributes and properties

| Name     | Kind                 | Meaning                                                                                                                                                              |
| -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`  | attribute            | The segment's text and the section's accessible name. Without it the section is listed as **Notes**.                                                                 |
| `name`   | attribute            | The section's id for `openPanel(name)`, `panelSection` and the `dpk-panel-change` event. Without it the section goes by `section-<n>`, its place among the sections. |
| `badge`  | attribute            | A short count or mark shown on the segment (`2`).                                                                                                                    |
| `hidden` | attribute            | Leaves the section out of the switch.                                                                                                                                |
| `active` | property (read-only) | Whether the panel is open on this section.                                                                                                                           |

The default slot is the section's content, styled by the page's own CSS (the section is light DOM).

## The owner's panel

The element that holds `slot="panel"` sections owns the panel.

| Name                  | Kind                      | Meaning                                                                                                                                                              |
| --------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel`               | attribute                 | `auto` (default): closed until the reader opens it. `open`: open on the first visit. `none`: only the Settings. The reader's later choice wins over `auto` / `open`. |
| `panelOpen`           | property                  | Whether the panel is open; setting it opens or closes it.                                                                                                            |
| `panelSection`        | property (read-only)      | The `name` of the section the panel is on (`detail` for the kit's Detail).                                                                                           |
| `openPanel(section?)` | method                    | Opens the panel, on `section` when given.                                                                                                                            |
| `closePanel()`        | method                    | Closes it.                                                                                                                                                           |
| `dpk-panel-change`    | event (bubbles, composed) | `{ open, section }`, whenever either changes.                                                                                                                        |
| `--dpk-panel-width`   | CSS custom property       | The panel's starting width (default `360px`); the reader's own width wins.                                                                                           |

## Reading

The sections are, in order: **Detail**, the sections a component adds, yours, and last **Settings** (設定), which the header's settings gear opens (see [the header](../index.md)). The header also holds one button per section of yours and per supplement, labelled and badged as its segment, before the gear: it opens the panel on that section, and closes the panel while it shows that section. A `hidden` section has none. Buttons the header has no room for go into one menu button after the others. Opening the element on a board opens it on Detail. The panel's × and Escape close it. The switch follows the tabs pattern: arrow keys, Home and End move between sections. On a wide screen the panel stands to the right of the content and narrows it; its edge resizes it between 280px and 560px (drag, arrow keys, double-click for the default), and a button maximizes it over the content. Under 760px it is a sheet from the bottom, half or full height.

Escape with the focus in the panel restores a maximized panel, then makes a full sheet half height, then closes the panel; on the Detail of an element that sits in a supplement it goes back to that supplement instead (see [supplements](../index.md)). Closing puts the focus back where it was before the panel opened, or on the selected element when the panel was on its Detail. An Escape that a control inside the panel uses itself (closing a candidate list, ending an IME composition) stays with that control.

Whether the panel is open, its section and its width are the reader's, not the draft's: they are kept in `localStorage` (`dev-process-kit:panel:<owner>`) unless `storage` is `off` or `memory`.

## Selected element's detail

A board that has a detail for its selection shows it in the panel's **Detail** section: Kanban's card, and the selected node or edge of the state, sequence, architecture map, BPMN, dependency graph and mind map diagrams, whose detail lists what the element's tooltip carries (description, condition, effect, ends) read only. Opening the element (a click or Enter on a card, a node, an edge, a participant or a message) opens the panel on Detail; the click that ends a drag or a pan opens nothing, and a selection made otherwise only marks the segment until the reader looks. Edits there are the board's element actions, as before. Review stays in the app's review rail, beside the panel.
