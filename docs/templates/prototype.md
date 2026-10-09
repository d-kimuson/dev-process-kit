# Template: prototype (`<dpk-template-prototype>`)

UX prototypes: the product's **apps** and their **screens**, walked through by **activities › user stories › steps**.

```text
App    = one application of the product (the shop, the admin console, …), with its own Screens
Screen = one page or state of the product; its previews are renditions of it (mobile, desktop, …)
Step   = one moment of a story: the Screen the user is on, plus the Materials at hand outside the
         product (a memo, a FAX, a lock-screen notification)
```

The app view reads the apps alone, so a screen is drawn once no matter how many stories pass through it, and the mock's own links can be followed as one app, outside of any story.

- Element: `<dpk-template-prototype>`
- Definition name: `prototype`
- Accent token: `--dpk-blue`

Check before you hand the page over:

- [ ] **Every page the product has is a screen under an app** — drawn or not. A page the UI links to that nothing has prototyped yet is still declared, with just an id and a title ([Stub screens](#stub-screens)).
- [ ] **Every link leads somewhere** — primary actions to the next screen, list rows to a detail screen, and every item of a sidebar, menu or tab bar to the screen (or story) behind it ([Wire every link](#wire-every-link-required)). The console warns about the ones that do not.
- [ ] Each preview has the `kind` of what the user is looking at: `plain` for a memo, a FAX or paper, `mail` for an e-mail ([Choosing the kind](#choosing-the-kind)).
- [ ] What belongs to the product is a screen's `previews`; a step lays out the screens it shows and what the user has at hand outside the product as its `panes` ([A step's panes](#a-steps-panes)).
- [ ] A step whose when / where / why is not obvious has a `situation` ([Situation](#situation)).
- [ ] Steps are named as verb phrases ([Step naming](#step-naming)).

> Pages written before this change no longer parse: a step's `title`, `layout` and `previews`, and `app` on any level, are rejected. Move each step's previews of the product into a screen under an app, and list the screens and the rest as the step's `panes` — see the [ADR](../../dev-docs/adr/20261009_prototype-screens-apart-from-scenarios.md#consequences) for the full mapping.

## Base data

```json
{
  "title": "Kumoma — オンボーディング",
  "apps": [
    {
      "id": "app",
      "name": "Kumoma",
      "actor": "新規ユーザー",
      "screens": [
        {
          "id": "signin",
          "title": "ログイン",
          "previews": [
            { "id": "signin-mobile", "viewport": "mobile" },
            { "id": "signin-desktop", "viewport": "desktop", "url": "app://signin" }
          ]
        }
      ]
    }
  ],
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
              "name": "Google でログインする",
              "screen": "signin"
            }
          ]
        }
      ]
    }
  ]
}
```

| Field                           | Required | Notes                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`                         | no       | shown in the page header, and the source of the placeholder preview domain                                                                                                                                                                                                                                                                       |
| `baseUrl`                       | no       | origin used for preview URLs, e.g. `https://app.kumoma.io`. Defaults to `https://<slugified title>.example.com`                                                                                                                                                                                                                                  |
| `apps[].id` / `name`            | no       | one application of the product, e.g. the shop for buyers, the admin console for operators. `description` optional. `apps` defaults to `[]`                                                                                                                                                                                                       |
| `apps[].screens[].id` / `title` | no       | one page or state of that app, e.g. `カート`, or the cart and its empty state as two screens. `description` optional (Markdown). `screens` defaults to `[]`                                                                                                                                                                                      |
| `apps[].screens[].previews[]`   | no       | renditions of that screen (mobile, desktop, …); see the preview fields below. Defaults to `[]`                                                                                                                                                                                                                                                   |
| `activities[].id` / `name`      | yes      | `description` optional                                                                                                                                                                                                                                                                                                                           |
| `stories[].id` / `name`         | yes      | `description` optional (Markdown). `steps` defaults to `[]`: a story with no steps yet is still a navigation destination                                                                                                                                                                                                                         |
| `steps[].id` / `name`           | yes      | `description` optional (Markdown)                                                                                                                                                                                                                                                                                                                |
| `steps[].panes[]`               | no       | what the step shows, left to right: `{ "screen", "preview"? }` names a screen declared under `apps[].screens` (`preview` pins one of its renditions), `{ "material" }` is a preview of what the user has at hand that is **not** the product (a memo, a FAX, a lock-screen notification). Defaults to `[]`; see [A step's panes](#a-steps-panes) |
| `actor`                         | no       | who uses the page (e.g. `管理者`), on an app, activity, story or step. The nearest one wins: step › story › activity, falling back to the screen's app                                                                                                                                                                                           |
| `steps[].situation`             | no       | what is going on around the screen (e.g. `朝 8 時、店舗の FAX に注文書が届く`), shown just above it                                                                                                                                                                                                                                              |
| `previews[].id`                 | yes      | must equal the `data-preview-id` of the light DOM below                                                                                                                                                                                                                                                                                          |
| `previews[].kind`               | no       | `browser` (default, address bar), `native` (phone bezel), `mail` (a received e-mail) or `plain` (no device)                                                                                                                                                                                                                                      |
| `previews[].viewport`           | no       | `mobile` (390px) · `tablet` (834px) · `desktop` (1180px) · `fluid` (default)                                                                                                                                                                                                                                                                     |
| `previews[].label`              | no       | tab label (defaults to the viewport name), or the caption of a side-by-side pane                                                                                                                                                                                                                                                                 |
| `previews[].url`                | no       | overrides the address shown in the browser chrome (cosmetic)                                                                                                                                                                                                                                                                                     |
| `previews[].mail`               | no       | `kind: "mail"` only: `{ "from", "to", "cc", "subject", "date" }`, all optional strings, shown above the body                                                                                                                                                                                                                                     |

A step's `description`, a screen's `description`, and the `description` of a story without steps are shown as Markdown (GFM; a single line break stays a break), so write lists and emphasis there rather than one long line. Raw HTML is shown as text, and a link keeps only a `http(s)`, `mailto` or in-page address.

Ids use `[A-Za-z0-9_-]+`. An activity id, an app id, a screen id and a preview id are each unique across the whole page — a screen is a navigation destination and a preview id names a light DOM slot, so both are global whether the preview is a screen's rendition or a step's material. A story id and a step id are unique within their parent.

Every preview declared in the base gets a frame; a preview without matching light DOM shows an empty frame with a hint. That is also how a [stub screen](#stub-screens) looks before it is drawn.

### Choosing the kind

Pick the kind from what the user is looking at, not from how you will draw it:

| The user is looking at                                                           | `kind`    |
| -------------------------------------------------------------------------------- | --------- |
| a web page or web app                                                            | `browser` |
| a phone app, a push notification, a lock screen                                  | `native`  |
| an e-mail the user received (or sends)                                           | `mail`    |
| something that is not a screen: a handwritten memo, a FAX, a paper form, a label | `plain`   |

Do not put a memo or a FAX in a `browser` frame: the address bar tells the reader it is a web page. A `plain` preview has no chrome, no bezel and no background of its own — the light DOM draws the whole object (the paper, its shadow, the handwriting) on the canvas, and the frame is only as tall as that content. This applies the same way whether the preview is a screen's rendition or a step's material.

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
<div slot="preview" data-preview-id="signin-mobile">
  <div class="signin">…</div>
</div>
```

`slot="preview"` plus `data-preview-id` is the whole contract: the framework re-points the element to the frame slot of that preview id, and an element whose id is unknown to the base is reported in the "previews without metadata" area instead of silently disappearing.

### Wire every link (required)

A prototype is **clicked through**, not looked at. The reader judges the flow by clicking what looks clickable, so every link, button, menu item, tab and list row in a preview must lead somewhere. A sidebar item that does nothing reads as a dead end — or as a feature that does not exist. Wiring is plain navigation, not a draft action: add `data-dpk-navigate` (and the same hash in `href` on an `<a>`):

```html
<a href="#screen=order-detail" data-dpk-navigate="screen=order-detail">詳細</a>
<button data-dpk-navigate="screen=order-complete">注文を確定する</button>
```

`screen=<screen id>` is the link a page's markup uses: the destination is a page of the product, not a moment of a story. How it resolves depends on the view:

- In the **app view**, it opens that screen directly.
- In the **scenario view**, it moves to a step showing that screen: the current step if it already does, else the next step in the current story showing it, else an earlier one in the story, else the first step on the page that shows it. A screen no step shows yet opens the app view instead ([Stub screens](#stub-screens)).

`step=<step id>` and `story=<story id>` keep working for a link that only makes sense inside a story — a push notification or a FAX that resumes a particular scenario, or a material that has no screen of its own to resolve a `screen=` link against. In the app view they open the screen the named step shows. `preview=<preview id>` switches to another rendition of the current screen without otherwise moving. Naming a level drops the deeper ones: `story=` forgets the current step, `activity=` the current story.

`data-dpk-navigate` accepts the same `key=value&key2=value2` syntax as the hash, and the framework resolves the rest of the navigation automatically while keeping the URL canonical.

Pick the destination by what the element is:

| Element in the mock                                                                   | Leads to                                      | Write                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| the primary action of the screen (続行, 保存, 注文を確定する)                         | the screen it moves to                        | `data-dpk-navigate="screen=<next screen>"`   |
| back / cancel / a breadcrumb                                                          | the screen it returns to                      | `data-dpk-navigate="screen=<that screen>"`   |
| a row of a list, a card, "詳細"                                                       | the detail screen (one drawn example is fine) | `data-dpk-navigate="screen=<detail screen>"` |
| shared UI: sidebar, global menu, tab bar, header links, "すべて見る"                  | the screen it names, current page included    | `data-dpk-navigate="screen=<screen>"`        |
| a notification, a mail button, a link in a FAX — a material with no screen of its own | the step that resumes the story               | `data-dpk-navigate="step=<step>"`            |
| switching to another rendition of the same screen                                     | that rendition                                | `data-dpk-navigate="preview=<preview id>"`   |

Shared UI is the case that is easiest to forget: link **every** item of a sidebar or menu, including the current page and the pages nobody has drawn yet. This is a complete sidebar of an admin screen, two of whose destinations are stubs:

```html
<nav class="side">
  <a href="#screen=admin-orders" data-dpk-navigate="screen=admin-orders" aria-current="page">注文</a>
  <a href="#screen=admin-refunds" data-dpk-navigate="screen=admin-refunds">返金</a>
  <a href="#screen=admin-inventory" data-dpk-navigate="screen=admin-inventory">在庫</a>
  <a href="#screen=admin-inquiries" data-dpk-navigate="screen=admin-inquiries">お問い合わせ</a>
</nav>
```

A `<dialog>` the mock opens with `showModal()` opens inside its frame, dimming the preview behind it, instead of covering the whole page: a modal dialog in the browser's top layer would make the review page around the mock unusable. Open it from the mock's own script as you would in the real screen, or mark a step's dialog state up as `<dialog open>`.

Leave an element inert only when it changes nothing but the screen itself (a toggle, an input) or ends the flow. Never write `href="#"` or an `<a>` without a destination. When the page loads, the template checks the links of every preview and warns on the console about each one that names no destination or a screen, step, story, activity or preview the page does not have.

### Stub screens

A product's menus often point at pages you have not drawn yet. Declare them anyway, as a screen under its app — an id and a `title` are enough, and a `url` on a preview if it is a page of your site, so the app view's URL tree and your mock's own links both carry it:

```json
{
  "id": "admin-inventory",
  "title": "在庫",
  "description": "まだ描いていない。キャンセルで引当が解除された在庫が、販売可能数に戻ったかを確かめる画面になる",
  "previews": [
    {
      "id": "admin-inventory-desktop",
      "viewport": "desktop",
      "url": "https://admin.sora-market.example.com/inventory"
    }
  ]
}
```

Leave its preview without matching light DOM, and it shows the ordinary empty-frame placeholder. As long as no step's pane shows it, `data-dpk-navigate="screen=admin-inventory"` opens it straight in the app view instead of failing or stalling in the scenario — a menu's link to a page nobody has told a story about still goes somewhere.

This is a different gap from **a story with no steps yet**, which is about the scenario rather than the product: declare one for a user story you know exists but have not walked through step by step —

```json
{
  "id": "inventory",
  "name": "在庫の残りを確かめる",
  "description": "キャンセルで引当が解除された在庫が、販売可能数に戻ったかを確かめる。画面はまだ描いていない"
}
```

— and `story=inventory` / `activity=…` opens its name and description with a note that nothing is drawn yet. Prefer a stub screen for anything your mock's own markup links to (it is, after all, a page); reach for a step-less story only when what is missing is the telling of a flow, not a page.

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
| `ADD_STEP`                 | story    | `{ "id", "name", "description"?, "panes"? }`                   |
| `ADD_PREVIEW`              | step     | `{ "id", "kind"?, "viewport"?, "label"?, "url"?, "mail"? }`    |
| `DELETE_ACTIVITY`          | activity | `{}`                                                           |
| `DELETE_STORY`             | story    | `{}`                                                           |
| `DELETE_STEP`              | step     | `{}`                                                           |
| `DELETE_PREVIEW`           | preview  | `{}`                                                           |

- `after` is an anchor id, not an offset: `{ "after": "login" }` means "directly after login" and `{ "after": null }` means "first". An anchor that does not exist makes the action stale instead of silently landing somewhere.
- `MOVE_STEP` / `MOVE_STORY` move the entity; combined with `after` they replace "move A from X to B" with an idempotent statement.
- Step targets are paths (`activityId.storyId.stepId`), and a bare step id is accepted only while it stays unique. Story targets use `activityId.storyId`; activity, preview and page targets stay bare.
- `ADD_*` actions carry the new id, so re-applying one whose entity already exists is a pruned no-op. `ADD_STEP`'s screen panes must name screens already declared under `apps[].screens` (and a pinned `preview` one of their renditions), and `ADD_PREVIEW` always adds a **material** — there is no action to add a screen's rendition, an app or a screen itself: the product's apps and screens are base data only, edited by regenerating the page.
- `SET_PREVIEW_*` and `DELETE_PREVIEW` apply the same way to a screen's rendition and a step's material; they are found by preview id, which is global either way.
- Deleting an activity deletes its stories and steps at render time, so a draft that deletes a parent and then edits a child leaves the child edit stale.

## Navigation

```text
#activity=onboarding&preview=signin-mobile&step=google-auth&story=account
```

Only `step` is required (`#step=google-auth` resolves the containing activity and story); `#story=account` alone opens the first step of that story, or the story itself when it has none. `preview` lists the selected rendition of each screen the step shows with tabs, comma-separated in pane order (`preview=cart-mobile,admin-refund-desktop`); a screen with one rendition or a pinned one has no entry, and a step with none has no `preview`. Preview ids are unique across the page, so each entry names its screen. Moving to another screen or step — a link of the mock, the step list — carries the rendition the reader is on, and the destination opens on its rendition of the same `kind` and `viewport` — a link inside the phone app stays in the app — else on its first rendition, as an unknown id does. It is navigation state, so it lives in the hash and is shareable like everything else. `view=app` opens the [app view](#scenario-and-app-views); the scenario view is the default and leaves no `view` in the hash. There, the hash instead carries `screen` and `preview` alone — `activity`, `story` and `step` are dropped, and a `step=`/`story=` hash resolves to the screen that step shows.

## UI provided by the template

| Region  | Content                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sidebar | the Scenario / App switch, then — in the scenario view — Activity select, UserStory select, numbered step list with comment badges, and the selected step's name/description; in the app view, the App select (when there is more than one), the app's screens as URL trees, and the screens outside a browser below them                                         |
| main    | page head (the `actor` chip and the page `title`), preview tabs (only when the screen has more than one rendition), "Comment on UI" and "Maximize" (scenario view) or "Demo" (app view) buttons, the step's `situation`, plus the frame of the selected rendition — or, with more than one pane, every pane side by side                                          |
| frame   | browser chrome (traffic dots + address bar; in the app view, a [simulated browser](#the-app-views-browser)); for `native`, a device bezel with a phone status bar and a home indicator; for `mail`, the subject and envelope; for `plain`, nothing. Only a side-by-side pane has a caption: a screen's `title` (with its rendition tabs) or a material's `label`. |

Frames are sized by content, not by a fixed height: the viewport has a per-kind minimum height (mobile 620 · tablet 640 · desktop 520 · fluid 420) and grows with the mock, so a preview never scrolls inside its own frame — the page main column scrolls instead. A `plain` preview has no minimum: it is exactly as tall as what it draws. The author wrapper element is stretched to fill the frame, so a mock can rely on being at least as tall as that minimum without using a percentage height. A maximized stage or a demo makes the frame as tall as the screen, so lay the mock out to stretch (a grid or flex column whose side navigation and backgrounds fill the wrapper) rather than pinning a fixed `min-height`, and start the page content at the top as the real screen would.

**Maximize** fills the browser tab with the page head, the preview tabs and the frame alone, the way a diagram's maximize does (it is not the browser's full screen mode); the canvas scrolls instead of the page, and a browser preview is at least as tall as the tab. The same button ("Restore size") or `Esc` restores it. "Comment on UI" works while maximized as well; there `Esc` ends commenting first and a second `Esc` restores. The button is shown in the scenario view whenever the step has a pane; the app view has "Demo" in its place (see [The app view's browser](#the-app-views-browser)).

The UI edits step name/description, adds steps, and comments — on a step, or on any element of a preview (see below). In the app view the same composer attaches to the **screen** on stage instead of a step, since there is no step there. Adding or deleting previews, reordering steps and switching a preview's kind or viewport are deliberately not UI affordances: an empty frame or a reordered flow is a structural change, so it goes through the agent as natural language. A preview's `label` only names its tab, so it is edited through a draft action too. A step's `situation`, a screen's `title`, and the `actor` of any level are base data with no draft action; a reviewer asks for a change with a comment on the step or the screen.

### Scenario and app views

The switch at the top of the sidebar picks how the reader goes through the prototype:

- **Scenario** (default) follows one user story: the Activity and UserStory selects, the story's steps in order, and each step's `situation` above its panes.
- **App** uses the UI as one app, whatever the scenario. The sidebar lists exactly the screens declared under `apps[].screens` — nothing derived from a story — picked with an App select when the product has more than one. The reader picks a screen to start from, or follows a `screen=` link, and moves around through the mock's own links, which stay in the app view. The stage shows the screen's renditions alone, as tabs; a step's materials and `situation` belong to the scenario and never reach it.

The heading above the frame is the `title` of the screen on stage either way; its `actor` chip is the nearest of step › story › activity, falling back to the actor of the app the screen belongs to. A step that shows several screens, or none (a moment away from the product), is headed by its own `name` instead, with the scenario's actor only.

The screens shown in a `browser` preview are laid out as a URL tree per origin, each path followed by the screen's `title` (`/orders 注文一覧`), from the address of the screen's first browser preview ([Preview address](#preview-address)) without its query. A path no screen sits at folds into its only child (`/checkout/done`), and several screens at one path (a page and its states) each get a row. Every other screen (`native`, `mail`, `plain`) is listed below the tree, under "Outside the browser".

The app view needs nothing more from you than [wired links](#wire-every-link-required) and a screen declared once per page: give browser renditions the `url` of the page they show, so the tree reads like the app's own sitemap, and give a page a single screen even when several stories pass through it.

#### The app view's browser

In the app view a `browser` screen runs in a simulated browser instead of a static frame, so the reader uses the app the way its users will:

- **Tabs.** A link with `target="_blank"` opens its destination in a new tab next to the current one; Ctrl / Cmd click or a middle click opens it in a background tab. The tab strip switches and closes tabs; closing the last one leaves a new tab page, since the window stays. "+" opens a new tab page offering the web pages of the current app.
- **Back / forward.** Each tab keeps its own history of the pages the reader visited, through the mock's links or the sidebar.
- **Reload.** Resets the forms of the page, closes its open dialogs, scrolls it to the top and dispatches a bubbling `dpk-reload` event on the preview wrapper. A mock with its own state listens to that event to start over.
- **Address bar.** Shows the [preview address](#preview-address). Typing an address (or a path on the same site) opens the browser preview at that address, the query aside; an address no preview has shows "This site can't be reached".
- **Profile.** The pill at the right of the toolbar names the `actor` of the app the screen belongs to, as the profile the window is signed in with.
- **Phone browser.** A `mobile` rendition runs in a phone browser instead: the address bar and the profile avatar on top, and back / forward / new tab / the tab count / reload in a bar under the page. The tab count opens an overview of the tabs as cards, to switch or close them. When a screen has both a desktop and a mobile rendition, its preview tabs switch the browser between the two; a `native` rendition beside them (the same page in the phone app) leaves the browser for the device bezel, and the app's own links then stay in the app.

Screens outside a browser (`native`, `mail`, `plain`) keep their own frame — a `native` screen is a phone app, so it gets a device bezel, never a browser; there is never a material beside them in the app view. The history and tabs are the reader's alone: they live in memory, not in the hash or the storage, and start over on a reload of the page.

```html
<!-- Opens the order detail screen in a new tab of the simulated browser. -->
<a href="#screen=order-detail" data-dpk-navigate="screen=order-detail" target="_blank">SM-0918-0342</a>
```

**Demo** takes the browser alone across the browser tab — no title, no sidebar, no tools — as close to the real app as the prototype gets: the page scrolls inside the browser, and a phone-sized page keeps its width. "Exit demo" at the free end of the tab strip (floating at the top right over a phone browser or a frame outside the browser) or `Esc` ends it. Entering the demo ends commenting on the UI.

#### Apps

A product is often several apps for different audiences — the shop buyers use, the admin console operators use. Declare each as an `app`, with its screens nested under it:

```json
{
  "apps": [
    {
      "id": "shop",
      "name": "ショップ（購入者向け）",
      "actor": "購入者",
      "screens": [{ "id": "cart", "title": "カート", "previews": [] }]
    },
    {
      "id": "admin",
      "name": "管理画面（運営者向け）",
      "description": "ショップ運営者が PC で使う",
      "actor": "ショップ運営者",
      "screens": [{ "id": "admin-orders", "title": "注文一覧", "previews": [] }]
    }
  ]
}
```

The app view shows one app at a time, picked with a select when the product has more than one; the app of the screen on stage is the current one. Every screen belongs to exactly one app — there is no "other apps" bucket, and no `app` field anywhere else: a step's app follows from the screen it shows.

### Commenting on the UI

"Comment on UI" in the stage tools turns on a mode for commenting on the mock itself: the reader clicks any element of a preview (a click inside a control counts for the control), writes the comment in a box next to it, and keeps clicking for the next one; `Esc` or the same button ends the mode. While it is on, a clear sheet lies over the previews and takes the pointer, so nothing reaches your mock (links, `mousedown` and click handlers stay still, a select does not open) and any element can be picked, a disabled button included; the wheel still scrolls the part of the mock under the pointer. Every element that already has a comment carries a numbered pin. The step list — and, in the app view, each screen's row — counts these comments with its own.

The comment enters the draft like any other, on a `ui` target that names the element:

```text
ui:<preview id>/<selector> "<text>"
ui:admin-refund-stuck-desktop/button.sm-btn.sm-btn--ghost:nth-of-type(2) "購入者に連絡する"
```

`<selector>` is the shortest CSS selector, relative to the preview's light DOM element (`[data-preview-id]`), that matched only that element when the reader clicked it, and `<text>` is what the element said (its text, `aria-label`, placeholder or alt). Find the element by either, and answer in the next version of that preview. A `ui` comment stays valid as long as its preview exists, even after the markup changes — whether the preview is a screen's rendition or a step's material.

### Preview address

The browser chrome shows a real-looking address instead of an internal id:

```text
https://kumoma.example.com/signin-mobile    # title slug -> ${name}.example.com
https://app.kumoma.example.com/signin        # preview.url, resolved against baseUrl
```

`preview.url` wins, then `${baseUrl}/${preview.id}`, then the placeholder domain derived from `title`. A `baseUrl` without a scheme gets `https://` prepended.

### A step's panes

A screen's `previews` are **renditions of the same page** — the mobile and the desktop version of one screen, say, or a page and its loading state — and the reader switches between them with tabs. A step's `panes` say what the step shows, **left to right**:

- `{ "screen": "<id>" }` — a screen of the product. With several renditions it gets tabs; add `"preview": "<rendition id>"` to pin the one this moment of the story is about, and the pane shows that rendition alone. A step may show two screens side by side (the buyer's phone next to the admin console), and the same screen twice only when each pane pins a different rendition.
- `{ "material": { …preview fields } }` — **what the user has at hand that is not the product**: the memo next to the admin page, the FAX that starts a story. It has its own `kind`, `viewport` and `label` (its caption), and never appears in the app view, which shows a screen's renditions alone.

There is no `layout` to set: one pane fills the stage, with its rendition tabs in the bar above it, and several are laid side by side in the order given, each screen pane captioned by its `title` and its own tabs.

```json
{
  "id": "admin-refund-stuck",
  "name": "失敗が続く返金を調べる",
  "panes": [
    { "material": { "id": "admin-refund-stuck-memo", "kind": "plain", "label": "手元のメモ" } },
    { "screen": "admin-refund" }
  ]
}
```

```json
{
  "id": "admin-buyer-view",
  "name": "購入者に見えている状態と照らし合わせる",
  "panes": [{ "screen": "admin-order-detail" }, { "screen": "refunded-detail", "preview": "refunded-detail-mobile" }]
}
```

A fixed viewport keeps its width while the row has room and a `fluid` one takes what is left; a row wider than the canvas scrolls sideways (or maximize the stage). The hash's `preview` key only ever names screen renditions — a material is never selected through the hash.

### Situation

A screen alone does not say when, where or why the user is looking at it. Write that in `situation`, one or two sentences, whenever it is not obvious from the flow: `朝 8 時、事務所の FAX に決済代行から 1 枚届く`, `レジ待ちの列で、片手でスマホを操作している`. It is shown just above the previews as a stage direction, and the reader comments on it like any other part of the step. Keep what the UI does in the preview and what the step is for in `description`.

### Step naming

A step is an experience state reached by an action, so name it as a verb phrase: `LP に到達する` → `Google でログインする` → `初期画面に到達する`. Names that describe a screen (`ランディング`) hide the intent and make the flow read as a list of pages instead of a user journey.
