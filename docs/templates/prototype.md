# Template: prototype (`<dpk-template-prototype>`)

UX prototypes: `Activity › UserStory › Step › Preview[]`.

```text
1 Step = 1 page / experience state
1 Step may have several Preview entries (mobile, desktop, native, a paper memo …)
```

- Element: `<dpk-template-prototype>`
- Definition name: `prototype`
- Accent token: `--dpk-blue`

## Base data

```json
{
  "title": "Kumoma — オンボーディング",
  "activities": [
    {
      "id": "onboarding",
      "name": "オンボーディング",
      "actor": "新規ユーザー",
      "stories": [
        {
          "id": "account",
          "name": "アカウント作成",
          "steps": [
            {
              "id": "google-auth",
              "name": "Google ログイン",
              "title": "ログイン",
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
| `title`                    | no       | shown in the page header, and the source of the placeholder preview domain                                      |
| `baseUrl`                  | no       | origin used for preview URLs, e.g. `https://app.kumoma.io`. Defaults to `https://<slugified title>.example.com` |
| `activities[].id` / `name` | yes      | `description` optional                                                                                          |
| `stories[].id` / `name`    | yes      | `description` optional. `steps` defaults to `[]`: a story with no steps yet is still a navigation destination   |
| `steps[].id` / `name`      | yes      | `description` optional                                                                                          |
| `steps[].title`            | no       | title of the page the step shows, headed above the frame (e.g. `ユーザー一覧`). Defaults to the step name       |
| `actor`                    | no       | who uses the page (e.g. `管理者`), on an activity, story or step. The nearest one wins: step › story › activity |
| `previews[].id`            | yes      | must equal the `data-preview-id` of the light DOM below                                                         |
| `previews[].kind`          | no       | `browser` (default, address bar), `native` (phone bezel), `mail` (a received e-mail) or `plain` (no device)     |
| `previews[].viewport`      | no       | `mobile` (390px) · `tablet` (834px) · `desktop` (1180px) · `fluid` (default)                                    |
| `previews[].label`         | no       | caption and tab label; defaults to the viewport name                                                            |
| `previews[].url`           | no       | overrides the address shown in the browser chrome (cosmetic)                                                    |
| `previews[].mail`          | no       | `kind: "mail"` only: `{ "from", "to", "cc", "subject", "date" }`, all optional strings, shown above the body    |

Ids use `[A-Za-z0-9_-]+`. An activity id and a preview id are unique across the whole page (a preview id names a light DOM slot), while a story id and a step id are unique within their parent.

Every preview declared in the base gets a frame; a preview without matching light DOM shows an empty frame with a hint.

### Choosing the kind

Pick the kind from what the user is looking at, not from how you will draw it:

| The user is looking at                                                           | `kind`    |
| -------------------------------------------------------------------------------- | --------- |
| a web page or web app                                                            | `browser` |
| a phone app, a push notification, a lock screen                                  | `native`  |
| an e-mail the user received (or sends)                                           | `mail`    |
| something that is not a screen: a handwritten memo, a FAX, a paper form, a label | `plain`   |

Do not put a memo or a FAX in a `browser` frame: the address bar tells the reader it is a web page. A `plain` preview has no chrome, no bezel and no background of its own — the light DOM draws the whole object (the paper, its shadow, the handwriting) on the canvas, and the frame is only as tall as that content.

A `mail` preview is one opened message: the frame draws the subject, the sender's avatar and the envelope rows from `mail`, and your light DOM is only the body. Put a mail in a `mail` frame rather than drawing a mail client in a `browser` one, and link its buttons like any other screen:

```json
{
  "id": "refund-mail-message",
  "kind": "mail",
  "viewport": "mobile",
  "mail": {
    "from": "Sora Market <order@sora-market.example.com>",
    "to": "hanako.sato@example.com",
    "subject": "【Sora Market】返金が完了しました",
    "date": "2025/09/19 9:41"
  }
}
```

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
<a href="#step=google-auth-done" data-dpk-navigate="step=google-auth-done">続行</a>
<button data-dpk-navigate="step=next-step">次へ</button>
```

`data-dpk-navigate` accepts the same `key=value&key2=value2` syntax as the hash, and the framework resolves the activity/story automatically while keeping the URL canonical.

### Linking the UI back to its user story

A step links to the next screen of its own flow. Shared UI — a global menu, a tab bar, a "see all" link — instead leads to the **user story** behind it. Link it with `story=` so the reader can follow the UI back to the story it serves:

```html
<nav>
  <a href="#story=tasks" data-dpk-navigate="story=tasks">タスク一覧</a>
  <a href="#story=reports" data-dpk-navigate="story=reports">レポート</a>
</nav>
```

`story=` lands on the first step of that story (a bare id is looked up in the current activity first, then across the page; `activity.story` is always unambiguous). Naming a level drops the deeper ones: `story=` forgets the current step, `activity=` the current story.

A story does not need steps. Declare the stories the UI points to even before they are prototyped — the link then shows the story's name and description with a note that nothing is drawn yet — rather than leaving the menu item dead:

```json
{ "id": "tasks", "name": "タスク一覧を確認する", "description": "自分に割り当てられたタスクを期限順に見る" }
```

## Action vocabulary

| Action                     | target   | payload                                                        |
| -------------------------- | -------- | -------------------------------------------------------------- |
| `SET_ACTIVITY_NAME`        | activity | `{ "name": string }`                                           |
| `SET_ACTIVITY_DESCRIPTION` | activity | `{ "description": string }`                                    |
| `SET_STORY_NAME`           | story    | `{ "name": string }`                                           |
| `SET_STORY_DESCRIPTION`    | story    | `{ "description": string }`                                    |
| `SET_STEP_NAME`            | step     | `{ "name": string }`                                           |
| `SET_STEP_DESCRIPTION`     | step     | `{ "description": string }`                                    |
| `SET_PREVIEW_KIND`         | preview  | `{ "kind": "browser" \| "native" \| "mail" \| "plain" }`       |
| `SET_PREVIEW_VIEWPORT`     | preview  | `{ "viewport": "mobile" \| "tablet" \| "desktop" \| "fluid" }` |
| `SET_PREVIEW_LABEL`        | preview  | `{ "label": string }`                                          |
| `REORDER_ACTIVITY`         | activity | `{ "after": string \| null }` (`null` = first)                 |
| `REORDER_STORY`            | story    | `{ "after": string \| null }`                                  |
| `REORDER_STEP`             | step     | `{ "after": string \| null }`                                  |
| `MOVE_STORY`               | story    | `{ "toActivity": string, "after": string \| null }`            |
| `MOVE_STEP`                | step     | `{ "toStory": string, "after": string \| null }`               |
| `ADD_ACTIVITY`             | page     | `{ "id", "name", "description"? }`                             |
| `ADD_STORY`                | activity | `{ "id", "name", "description"? }`                             |
| `ADD_STEP`                 | story    | `{ "id", "name", "description"?, "previews"? }`                |
| `ADD_PREVIEW`              | step     | `{ "id", "kind"?, "viewport"?, "label"?, "url"?, "mail"? }`    |
| `DELETE_ACTIVITY`          | activity | `{}`                                                           |
| `DELETE_STORY`             | story    | `{}`                                                           |
| `DELETE_STEP`              | step     | `{}`                                                           |
| `DELETE_PREVIEW`           | preview  | `{}`                                                           |

- `after` is an anchor id, not an offset: `{ "after": "login" }` means "directly after login" and `{ "after": null }` means "first". An anchor that does not exist makes the action stale instead of silently landing somewhere.
- `MOVE_STEP` / `MOVE_STORY` move the entity; combined with `after` they replace "move A from X to B" with an idempotent statement.
- Step targets are paths (`activityId.storyId.stepId`), and a bare step id is accepted only while it stays unique. Story targets use `activityId.storyId`; activity, preview and page targets stay bare.
- `ADD_*` actions carry the new id, so re-applying one whose entity already exists is a pruned no-op.
- Deleting an activity deletes its stories and steps at render time, so a draft that deletes a parent and then edits a child leaves the child edit stale.

## Navigation

```text
#activity=onboarding&preview=google-auth-mobile&step=google-auth&story=account
```

Only `step` is required (`#step=google-auth` resolves the containing activity and story); `#story=account` alone opens the first step of that story, or the story itself when it has none. `preview` is the selected preview tab of that step; it is navigation state, so it lives in the hash and is shareable like everything else, and an unknown id falls back to the first preview.

## UI provided by the template

| Region  | Content                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sidebar | Activity select, UserStory select, numbered step list with comment badges, and the selected step's name/description                                                                                                                   |
| main    | page head (the `actor` chip and the page `title`), preview tabs (only when the step has more than one preview), a "Full screen" button, plus the frame of the selected preview                                                        |
| frame   | browser chrome (traffic dots + address bar); for `native`, a device bezel with a phone status bar and a home indicator; for `mail`, the subject and envelope; for `plain`, nothing. There is no caption: what you see is the preview. |

Frames are sized by content, not by a fixed height: the viewport has a per-kind minimum height (mobile 620 · tablet 640 · desktop 520 · fluid 420) and grows with the mock, so a preview never scrolls inside its own frame — the page main column scrolls instead. A `plain` preview has no minimum: it is exactly as tall as what it draws. The author wrapper element is stretched to fill the frame, so a mock can rely on being at least as tall as that minimum without using a percentage height.

**Full screen** shows the page head, the preview tabs and the frame alone on the whole screen; the canvas scrolls instead of the page, and a browser preview is at least as tall as the screen. The same button (or `Esc`) leaves. The button is hidden where the browser does not allow full screen (for example a sandboxed frame).

The UI edits step name/description, adds steps, and comments. Adding previews, deleting previews, reordering steps and switching a preview's kind or viewport are deliberately not UI affordances: an empty frame or a reordered flow is a structural change, so it goes through the agent as natural language. A preview's `label` only names its tab, so it is edited through a draft action too. A step's `title` and the `actor` are base data with no draft action; a reviewer asks for a change with a comment on the step.

### Preview address

The browser chrome shows a real-looking address instead of an internal id:

```text
https://kumoma.example.com/landing-mobile   # title slug -> ${name}.example.com
https://app.kumoma.example.com/signin        # preview.url, resolved against baseUrl
```

`preview.url` wins, then `${baseUrl}/${preview.id}`, then the placeholder domain derived from `title`. A `baseUrl` without a scheme gets `https://` prepended.

### Step naming

A step is an experience state reached by an action, so name it as a verb phrase: `LP に到達する` → `Google でログインする` → `初期画面に到達する`. Names that describe a screen (`ランディング`) hide the intent and make the flow read as a list of pages instead of a user journey.
