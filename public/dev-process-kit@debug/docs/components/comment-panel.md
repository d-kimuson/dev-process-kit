# artifact-comment-panel

The core review rail: the list of draft actions, comments, stale markers,
deletion, and the copy hand-off for the agent.

```text
Draft Action 一覧 / Comment 一覧 / 並び順 / 削除 / 一括コピー / 共通メタ情報
```

It is a Shadow DOM component and it is the **only** place the framework renders
template-specific text — through `describe()` and `serialize()`.

## Where it comes from

Every `ArtifactElement` renders one inside its notes rail. Templates do not
create it, and authors do not need to:

```html
<artifact-prototype>…</artifact-prototype>
<!-- the rail with <artifact-comment-panel> is already there -->
```

It is closed by default. The floating comment button in the bottom right corner
(with a badge showing the draft count) toggles it, and `notes="on"` on the
artifact root opens it on load.

## Rendering contract

Action rows use the template's presentation functions (target choices and the
composer also use `commentTargets()` / `currentTarget()`):

```ts
describe(action, state, base?): {
  title: string;        // "Step 名を変更"
  targetLabel: string;  // "Step · Google ログイン"
  summary?: string;     // "\"Google ログイン\" → \"Google でログイン\""
  tone: 'comment' | 'create' | 'update' | 'delete' | 'move' | 'meta';
}

serialize(action): string;  // one stable line, e.g.
                            // SET_STEP_NAME step:google-auth {"name":"Google でログイン"}
```

`describe` must not throw when the target has disappeared: stale actions are
rendered too, with a `target-missing` / `constraint-violated` /
`unsupported-action-type` badge.

## Ordering

Draft order = dispatch order. Only adjacent matching patches are compacted;
no patch crosses an intervening action. Sequence operations (move/reorder) and
comments are never deduped. Stateful rows retain their entity identity on reorder.

## Composer

The composer dispatches a core `comment` action:

```json
{ "type": "comment", "target": "step:google-auth", "payload": { "body": "…" } }
```

The composer resolves its target in this order:

| State                                        | Target                                              |
| -------------------------------------------- | --------------------------------------------------- |
| an explicit request is pending               | that target (shown as a chip you can clear)         |
| the "attach to the current …" checkbox is on | `currentTarget(state, nav)` of the template         |
| otherwise                                    | the artifact as a whole, `artifact:<template name>` |

- The checkbox only appears when the template implements `currentTarget()` — for
  the prototype that is the step the reader is looking at, for the story map the
  selected story, and so on. It is the "comment on this one thing" switch; without
  it, the note is a general remark about the whole artifact.
- Artifact-wide comments are always applicable: the core never marks
  `target.type === 'artifact'` as stale, whichever template is in use.
- `requestComment(target)` on the artifact element (or
  `data-artifact-comment="step:id"` in author markup) pre-fills the composer with
  that exact target, which is how per-element "コメント" buttons work. The chip
  shows where the note will land, and clearing it returns to the checkbox.
- `Ctrl/Cmd+Enter` submits, except during IME composition.
- Clearing an explicit target restores the previous checkbox preference.
- An `onComment` callback may return the dispatch outcome. A rejected submission
  retains its text; success clears it. Legacy callbacks returning `void` retain
  their existing “accepted” behavior.

## Hand-off

| Button       | Payload                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `Copy JSON`  | `serializeDraft(actions)` — the canonical draft, an array of action objects                   |
| `Copy brief` | markdown: template, version, navigation, comments, requested changes, then the canonical JSON |
| `Clear`      | removes every draft action                                                                    |

`element.artifact.exportBrief()` returns the same markdown as `Copy brief`
(including the stale count), and `element.artifact.exportDraft()` returns the
JSON with `template`, `frameworkVersion` and `exportedAt`.

Both are produced from the draft only. The agent receives the base HTML
separately, so it can diff intent against the current base.

## Using it standalone

The panel is a normal custom element, but it expects a derivation, not a state:

```js
import { ArtifactController, registerCoreElements } from '/dev-process-kit@debug/components.js';

registerCoreElements();

const controller = new ArtifactController({ definition, base, storage: null });
const panel = document.createElement('artifact-comment-panel');
panel.definition = definition;
panel.state = controller.derivation.state;
panel.navigation = {};
panel.derivation = controller.derivation;
panel.onDelete = (id) => controller.removeAction(id);
panel.onClear = () => controller.clearActions();
panel.onComment = (target, body) => controller.dispatch({ type: 'comment', target, payload: { body } });
document.body.append(panel);
```

Without a controller, re-render by assigning `panel.derivation` again after every
change. Inside an artifact, the base element does that automatically.

## Props

| Property (attribute: false)          | Type                 | Purpose                                                   |
| ------------------------------------ | -------------------- | --------------------------------------------------------- |
| `definition`                         | `TemplateDefinition` | `describe` / `serialize` / `commentTargets`               |
| `state`                              | derived state        | passed to `describe`                                      |
| `navigation`                         | `Navigation`         | passed to `commentTargets`                                |
| `derivation`                         | `Derivation`         | the draft, comments, stale list                           |
| `issues`                             | `ValidationIssue[]`  | last rejected dispatch, rendered as an inline alert       |
| `pendingTarget`                      | `string \| null`     | target ref focused by `requestComment()`                  |
| `exportBrief`                        | `() => string`       | optional canonical host brief (shared fallback otherwise) |
| `onDelete` / `onClear` / `onComment` | callbacks            | the only way the panel changes anything                   |
