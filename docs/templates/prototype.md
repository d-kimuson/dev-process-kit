# Template: prototype (`<dpk-template-prototype>`)

UX prototypes: `Activity › UserStory › Step › Preview[]`.

```text
1 Step = 1 page / experience state
1 Step may have several Preview entries (mobile, desktop, native, a paper memo …)
```

- Element: `<dpk-template-prototype>`
- Definition name: `prototype`
- Accent token: `--dpk-blue`

Check before you hand the page over:

- [ ] **Every link leads somewhere** — primary actions to the next step, list rows to a detail step, and every item of a sidebar, menu or tab bar to the step or user story behind it ([Wire every link](#wire-every-link-required)). The console warns about the ones that do not.
- [ ] Each preview has the `kind` of what the user is looking at: `plain` for a memo, a FAX or paper, `mail` for an e-mail ([Choosing the kind](#choosing-the-kind)).
- [ ] What is seen together is `side-by-side`; only alternatives are tabs ([Several previews](#several-previews-tabs-or-side-by-side)).
- [ ] A step whose when / where / why is not obvious has a `situation` ([Situation](#situation)).
- [ ] Steps are named as verb phrases ([Step naming](#step-naming)).

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
| `steps[].situation`        | no       | what is going on around the screen (e.g. `朝 8 時、店舗の FAX に注文書が届く`), shown just above the previews   |
| `steps[].layout`           | no       | `tabs` (default: one preview at a time) or `side-by-side` (every preview at once, in one row)                   |
| `previews[].id`            | yes      | must equal the `data-preview-id` of the light DOM below                                                         |
| `previews[].kind`          | no       | `browser` (default, address bar), `native` (phone bezel), `mail` (a received e-mail) or `plain` (no device)     |
| `previews[].viewport`      | no       | `mobile` (390px) · `tablet` (834px) · `desktop` (1180px) · `fluid` (default)                                    |
| `previews[].label`         | no       | tab label (defaults to the viewport name), or the caption of a side-by-side pane                                |
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

### Wire every link (required)

A prototype is **clicked through**, not looked at. The reader judges the flow by clicking what looks clickable, so every link, button, menu item, tab and list row in a preview must lead somewhere. A sidebar item that does nothing reads as a dead end — or as a feature that does not exist. Wiring is plain navigation, not a draft action: add `data-dpk-navigate` (and the same hash in `href` on an `<a>`):

```html
<a href="#step=google-auth-done" data-dpk-navigate="step=google-auth-done">続行</a>
<button data-dpk-navigate="step=next-step">次へ</button>
```

`data-dpk-navigate` accepts the same `key=value&key2=value2` syntax as the hash, and the framework resolves the activity/story automatically while keeping the URL canonical.

Pick the destination by what the element is:

| Element in the mock                                                           | Leads to                                    | Write                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| the primary action of the screen (続行, 保存, 注文を確定する)                 | the next step of the same story             | `data-dpk-navigate="step=<next step>"`     |
| back / cancel / a breadcrumb                                                  | the step it returns to                      | `data-dpk-navigate="step=<that step>"`     |
| a row of a list, a card, "詳細"                                               | the detail step (one drawn example is fine) | `data-dpk-navigate="step=<detail step>"`   |
| shared UI: sidebar, global menu, tab bar, header links, "すべて見る"          | the **user story** the destination serves   | `data-dpk-navigate="story=<story>"`        |
| a notification, a mail button, a link in a FAX — anything that opens a screen | that screen's step                          | `data-dpk-navigate="step=<step>"`          |
| switching to another preview of the same step (e.g. the mail behind a push)   | that preview                                | `data-dpk-navigate="preview=<preview id>"` |

Shared UI is the case that is easiest to forget: link **every** item of a sidebar or menu, including the current page and the pages nobody has drawn yet. This is a complete sidebar of an admin screen:

```html
<nav class="side">
  <a href="#step=admin-orders" data-dpk-navigate="step=admin-orders" aria-current="page">注文</a>
  <a href="#step=admin-refunds" data-dpk-navigate="step=admin-refunds">返金</a>
  <a href="#story=inventory" data-dpk-navigate="story=inventory">在庫</a>
  <a href="#story=inquiries" data-dpk-navigate="story=inquiries">お問い合わせ</a>
</nav>
```

`story=` lands on the first step of that story (a bare id is looked up in the current activity first, then across the page; `activity.story` is always unambiguous). Naming a level drops the deeper ones: `story=` forgets the current step, `activity=` the current story.

A story does not need steps. **Declare a story for every place the UI points to**, even before it is prototyped — the link then shows the story's name and description with a note that nothing is drawn yet — rather than leaving the menu item dead:

```json
{
  "id": "inventory",
  "name": "在庫の残りを確かめる",
  "description": "引当が解除された在庫が販売可能数に戻ったかを確かめる"
}
```

A `<dialog>` the mock opens with `showModal()` opens inside its frame, dimming the preview behind it, instead of covering the whole page: a modal dialog in the browser's top layer would make the review page around the mock unusable. Open it from the mock's own script as you would in the real screen, or mark a step's dialog state up as `<dialog open>`.

Leave an element inert only when it changes nothing but the screen itself (a toggle, an input) or ends the flow. Never write `href="#"` or an `<a>` without a destination. When the page loads, the template checks the links of every preview and warns on the console about each one that names no destination or a step, story, activity or preview the page does not have.

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

Only `step` is required (`#step=google-auth` resolves the containing activity and story); `#story=account` alone opens the first step of that story, or the story itself when it has none. `preview` is the selected preview tab of that step (absent for a `side-by-side` step); it is navigation state, so it lives in the hash and is shareable like everything else, and an unknown id falls back to the first preview.

## UI provided by the template

| Region  | Content                                                                                                                                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sidebar | Activity select, UserStory select, numbered step list with comment badges, and the selected step's name/description                                                                                                                                |
| main    | page head (the `actor` chip and the page `title`), preview tabs (only for several previews in `tabs` layout), "Comment on UI" and "Maximize" buttons, the step's `situation`, plus the frame of the selected preview — or every frame side by side |
| frame   | browser chrome (traffic dots + address bar); for `native`, a device bezel with a phone status bar and a home indicator; for `mail`, the subject and envelope; for `plain`, nothing. Only a side-by-side pane has a caption (its `label`).          |

Frames are sized by content, not by a fixed height: the viewport has a per-kind minimum height (mobile 620 · tablet 640 · desktop 520 · fluid 420) and grows with the mock, so a preview never scrolls inside its own frame — the page main column scrolls instead. A `plain` preview has no minimum: it is exactly as tall as what it draws. The author wrapper element is stretched to fill the frame, so a mock can rely on being at least as tall as that minimum without using a percentage height. A maximized stage makes the frame as tall as the screen, so lay the mock out to stretch (a grid or flex column whose side navigation and backgrounds fill the wrapper) rather than pinning a fixed `min-height`, and start the page content at the top as the real screen would.

**Maximize** fills the browser tab with the page head, the preview tabs and the frame alone, the way a diagram's maximize does (it is not the browser's full screen mode); the canvas scrolls instead of the page, and a browser preview is at least as tall as the tab. The same button ("Restore size") or `Esc` restores it. "Comment on UI" works while maximized as well; there `Esc` ends commenting first and a second `Esc` restores. The button is shown whenever the step has a preview.

The UI edits step name/description, adds steps, and comments — on a step, or on any element of a preview (see below). Adding previews, deleting previews, reordering steps and switching a preview's kind or viewport are deliberately not UI affordances: an empty frame or a reordered flow is a structural change, so it goes through the agent as natural language. A preview's `label` only names its tab, so it is edited through a draft action too. A step's `title` and `situation` and the `actor` are base data with no draft action; a reviewer asks for a change with a comment on the step.

### Commenting on the UI

"Comment on UI" in the stage tools turns on a mode for commenting on the mock itself: the reader clicks any element of a preview (a click inside a control counts for the control), writes the comment in a box next to it, and keeps clicking for the next one; `Esc` or the same button ends the mode. While it is on, a clear sheet lies over the previews and takes the pointer, so nothing reaches your mock (links, `mousedown` and click handlers stay still, a select does not open) and any element can be picked, a disabled button included; the wheel still scrolls the part of the mock under the pointer. Every element that already has a comment carries a numbered pin. The step list counts these comments with the step's own.

The comment enters the draft like any other, on a `ui` target that names the element:

```text
ui:<preview id>/<selector> "<text>"
ui:admin-refund-stuck-desktop/button.sm-btn.sm-btn--ghost:nth-of-type(2) "購入者に連絡する"
```

`<selector>` is the shortest CSS selector, relative to the preview's light DOM element (`[data-preview-id]`), that matched only that element when the reader clicked it, and `<text>` is what the element said (its text, `aria-label`, placeholder or alt). Find the element by either, and answer in the next version of that preview. A `ui` comment stays valid as long as its preview exists, even after the markup changes.

### Preview address

The browser chrome shows a real-looking address instead of an internal id:

```text
https://kumoma.example.com/landing-mobile   # title slug -> ${name}.example.com
https://app.kumoma.example.com/signin        # preview.url, resolved against baseUrl
```

`preview.url` wins, then `${baseUrl}/${preview.id}`, then the placeholder domain derived from `title`. A `baseUrl` without a scheme gets `https://` prepended.

### Several previews: tabs or side by side

A step with several previews shows them in one of two ways, chosen by `layout`:

- `tabs` (default) — **alternatives of the same moment**: the mobile and the desktop version of one page. The reader sees one at a time and switches with the tabs.
- `side-by-side` — **things the user has in front of them at the same time**: the memo in hand next to the screen, the FAX next to the admin page, two windows. Every preview is on screen at once, in one row, each with its own `kind` and `viewport`, captioned by its `label`.

```json
{
  "id": "admin-refund-stuck",
  "name": "失敗が続く返金を調べる",
  "layout": "side-by-side",
  "previews": [
    { "id": "admin-refund-stuck-memo", "kind": "plain", "label": "手元のメモ" },
    { "id": "admin-refund-stuck-desktop", "viewport": "desktop", "label": "管理画面" }
  ]
}
```

A fixed viewport keeps its width while the row has room and a `fluid` one takes what is left; a row wider than the canvas scrolls sideways (or maximize the stage). Side by side there is no tab, so the hash carries no `preview`.

### Situation

A screen alone does not say when, where or why the user is looking at it. Write that in `situation`, one or two sentences, whenever it is not obvious from the flow: `朝 8 時、事務所の FAX に決済代行から 1 枚届く`, `レジ待ちの列で、片手でスマホを操作している`. It is shown just above the previews as a stage direction, and the reader comments on it like any other part of the step. Keep what the UI does in the preview and what the step is for in `description`.

### Step naming

A step is an experience state reached by an action, so name it as a verb phrase: `LP に到達する` → `Google でログインする` → `初期画面に到達する`. Names that describe a screen (`ランディング`) hide the intent and make the flow read as a list of pages instead of a user journey.
