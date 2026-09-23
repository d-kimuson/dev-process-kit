# Template: prototype (`<artifact-prototype>`)

UX prototypes: `Activity › UserStory › Step › Preview[]`.

```text
1 Step = 1 page / experience state
1 Step may have several Preview entries (mobile, desktop, native …)
```

- Element: `<artifact-prototype>`
- Definition name: `prototype`
- Accent token: `--af-blue`

## Base data

```json
{
  "title": "Kumoma — オンボーディング",
  "activities": [
    {
      "id": "onboarding",
      "name": "オンボーディング",
      "stories": [
        {
          "id": "account",
          "name": "アカウント作成",
          "steps": [
            {
              "id": "google-auth",
              "name": "Google ログイン",
              "previews": [
                { "id": "google-auth-mobile", "viewport": "mobile" },
                { "id": "google-auth-desktop", "viewport": "desktop", "url": "app://signin" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

| Field                      | Required | Notes                                                                                                           |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `title`                    | no       | shown in the artifact header, and the source of the placeholder preview domain                                  |
| `baseUrl`                  | no       | origin used for preview URLs, e.g. `https://app.kumoma.io`. Defaults to `https://<slugified title>.example.com` |
| `activities[].id` / `name` | yes      | `description` optional                                                                                          |
| `stories[].id` / `name`    | yes      | `description` optional                                                                                          |
| `steps[].id` / `name`      | yes      | `description` optional                                                                                          |
| `previews[].id`            | yes      | must equal the `data-preview-id` of the light DOM below                                                         |
| `previews[].kind`          | no       | `browser` (default, address bar) or `native` (phone bezel, no address bar)                                      |
| `previews[].viewport`      | no       | `mobile` (390px) · `tablet` (834px) · `desktop` (1180px) · `fluid` (default)                                    |
| `previews[].label`         | no       | caption and tab label; defaults to the viewport name                                                            |
| `previews[].url`           | no       | overrides the address shown in the browser chrome (cosmetic)                                                    |

Ids use `[A-Za-z0-9_-]+`. An activity id and a preview id are unique across the whole artifact (a preview id names a light DOM slot), while a story id and a step id are unique within their parent.

Every preview declared in the base gets a frame; a preview without matching light DOM shows an empty frame with a hint.

## Preview content (light DOM)

The prototype itself is authored by you, in the light DOM, so your CSS, JS, `localStorage`, IndexedDB or mock APIs all behave normally:

```html
<div slot="preview" data-preview-id="google-auth-mobile">
  <div class="signin">…</div>
</div>
```

`slot="preview"` plus `data-preview-id` is the whole contract: the framework re-points the element to the frame slot of that preview id, and an element whose id is unknown to the base is reported in the "previews without metadata" area instead of silently disappearing.

### Prototype-internal navigation

Step flow inside your own mock is plain navigation, not a draft action:

```html
<a href="#step=google-auth-done" data-artifact-navigate="step=google-auth-done">続行</a>
<button data-artifact-navigate="step=next-step">次へ</button>
```

`data-artifact-navigate` accepts the same `key=value&key2=value2` syntax as the hash, and the framework resolves the activity/story automatically while keeping the URL canonical.

## Action vocabulary

| Action                     | target   | payload                                                        |
| -------------------------- | -------- | -------------------------------------------------------------- |
| `SET_ACTIVITY_NAME`        | activity | `{ "name": string }`                                           |
| `SET_ACTIVITY_DESCRIPTION` | activity | `{ "description": string }`                                    |
| `SET_STORY_NAME`           | story    | `{ "name": string }`                                           |
| `SET_STORY_DESCRIPTION`    | story    | `{ "description": string }`                                    |
| `SET_STEP_NAME`            | step     | `{ "name": string }`                                           |
| `SET_STEP_DESCRIPTION`     | step     | `{ "description": string }`                                    |
| `SET_PREVIEW_KIND`         | preview  | `{ "kind": "browser" \| "native" }`                            |
| `SET_PREVIEW_VIEWPORT`     | preview  | `{ "viewport": "mobile" \| "tablet" \| "desktop" \| "fluid" }` |
| `SET_PREVIEW_LABEL`        | preview  | `{ "label": string }`                                          |
| `REORDER_ACTIVITY`         | activity | `{ "after": string \| null }` (`null` = first)                 |
| `REORDER_STORY`            | story    | `{ "after": string \| null }`                                  |
| `REORDER_STEP`             | step     | `{ "after": string \| null }`                                  |
| `MOVE_STORY`               | story    | `{ "toActivity": string, "after": string \| null }`            |
| `MOVE_STEP`                | step     | `{ "toStory": string, "after": string \| null }`               |
| `ADD_ACTIVITY`             | artifact | `{ "id", "name", "description"? }`                             |
| `ADD_STORY`                | activity | `{ "id", "name", "description"? }`                             |
| `ADD_STEP`                 | story    | `{ "id", "name", "description"?, "previews"? }`                |
| `ADD_PREVIEW`              | step     | `{ "id", "kind"?, "viewport"?, "label"?, "url"? }`             |
| `DELETE_ACTIVITY`          | activity | `{}`                                                           |
| `DELETE_STORY`             | story    | `{}`                                                           |
| `DELETE_STEP`              | step     | `{}`                                                           |
| `DELETE_PREVIEW`           | preview  | `{}`                                                           |

- `after` is an anchor id, not an offset: `{ "after": "login" }` means "directly after login" and `{ "after": null }` means "first". An anchor that does not exist makes the action stale instead of silently landing somewhere.
- `MOVE_STEP` / `MOVE_STORY` move the entity; combined with `after` they replace "move A from X to B" with an idempotent statement.
- Step targets are paths (`activityId.storyId.stepId`), and a bare step id is accepted only while it stays unique. Story targets use `activityId.storyId`; activity, preview and artifact targets stay bare.
- `ADD_*` actions carry the new id, so re-applying one whose entity already exists is a pruned no-op.
- Deleting an activity deletes its stories and steps at render time, so a draft that deletes a parent and then edits a child leaves the child edit stale.

## Navigation

```text
#activity=onboarding&preview=google-auth-mobile&step=google-auth&story=account
```

Only `step` is required (`#step=google-auth` resolves the containing activity and story). `preview` is the selected preview tab of that step; it is navigation state, so it lives in the hash and is shareable like everything else, and an unknown id falls back to the first preview.

## UI provided by the template

| Region  | Content                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sidebar | Activity select, UserStory select, numbered step list with comment badges, and the selected step's name/description                                                          |
| main    | preview tabs (only when the step has more than one preview) plus the frame of the selected preview                                                                           |
| frame   | browser chrome (traffic dots + address bar) or, for `native`, a device bezel with a phone status bar and a home indicator. There is no caption: what you see is the preview. |

Frames are sized by content, not by a fixed height: the viewport has a per-kind minimum height (mobile 620 · tablet 640 · desktop 520 · fluid 420) and grows with the mock, so a preview never scrolls inside its own frame — the artifact main column scrolls instead. The author wrapper element is stretched to fill the frame, so a mock can rely on being at least as tall as that minimum without using a percentage height.

The UI edits step name/description, adds steps, and comments. Adding previews, deleting previews, reordering steps and switching a preview's kind or viewport are deliberately not UI affordances: an empty frame or a reordered flow is a structural change, so it goes through the agent as natural language. A preview's `label` only names its tab, so it is edited through a draft action too.

### Preview address

The browser chrome shows a real-looking address instead of an internal id:

```text
https://kumoma.example.com/landing-mobile   # title slug -> ${name}.example.com
https://app.kumoma.example.com/signin        # preview.url, resolved against baseUrl
```

`preview.url` wins, then `${baseUrl}/${preview.id}`, then the placeholder domain derived from `title`. A `baseUrl` without a scheme gets `https://` prepended.

### Step naming

A step is an experience state reached by an action, so name it as a verb phrase: `LP に到達する` → `Google でログインする` → `初期画面に到達する`. Names that describe a screen (`ランディング`) hide the intent and make the flow read as a list of pages instead of a user journey.
