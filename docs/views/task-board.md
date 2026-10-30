# View: task-board (`<dpk-view-task-board>`)

Where a body of work shared by an agent and a person stands. Use it when the agent works on something over a while and the person needs to follow it without reading the conversation: what the work is for, which tasks carry it, what the agent has produced so far, and what it needs to ask.

A **design doc** states the intent and groups the tasks under it: one doc, many tasks. The **Kanban** board is where those tasks stand. The agent rewrites the base data as the work goes on. The person replies to questions, accepts or declines proposals, ticks off their own todos and asks for more work; all of it is draft actions the review hands back.

```text
dpk-view-task-board
  bar   the overall status; slot="header" for your own controls
  side  (left)  Outputs     one tight row each: open a URL, copy a URL or
                            file path — clear of the review's right-hand rail
  main  tabs, one shown at a time (Design Docs is shown first):
        Design Docs  a list of titles on the left; the open doc on the right as
                     Markdown, with its diagrams (slot="design:<id>": ER,
                     sequence, …) and the tasks it groups under it
        Questions    Blockers first (the agent waits on them),
                     then the ones it works on under an assumption
                     (tab counts the unanswered ones; red while a blocker is open)
        Tasks        the todos as a board, one column per status
                     (Todo / In progress / Blocked / Done), read left to
                     right; proposals are cards marked "?" until decided;
                     progress and the All / People filter above it, and
                     the add-a-todo form at the foot of the Todo column
```

The title in the header, the floating menu, the review and the hand-off are the page's ([page.md](../page.md)); the bar above the board is the view's own strip, under it. The outputs rail is on the **left**: the review floats over the page's right-hand edge, so a rail there would be covered by it. The main area and the left-hand rail scroll separately, so the outputs stay in view while the person reads a tab, and the tab bar stays at the top of the main area. On a narrow screen the rail folds into a drawer over the board — the board keeps the whole width, and its own button slides the outputs out — and the page scrolls as one.

## One design doc, many tasks

A design doc is the unit of intent. It carries a title and a Markdown body, so it can explain as much as the subject needs — background, approach, alternatives, measurements, open points — and a todo joins it with its `design` id. One doc therefore carries as many tasks as the work takes, and a task that belongs to no doc simply stands on its own.

The Design Docs tab is a master-detail view: the left-hand index lists the doc titles (with how many tasks each groups), and the right-hand side opens the selected doc — its title, its body as Markdown, and under it the tasks it groups, each with its status (and a "?" while it is a proposal). The first doc opens until the reader picks another; an index entry whose doc the agent has since removed falls back to the first. The Tasks tab keeps the whole Kanban across every doc, so the reader can see the work either way: by intent, or by where it stands. A card on the Kanban names the doc it belongs to.

## The Tasks tab is a board

The todos are drawn the way `dpk-board-kanban` draws a board ([kanban.md](../boards/kanban.md)): one lane per status in reading order — To do, In progress, Blocked, Done — each card titled, with its note, its reason (for a proposal), its assignee, its design doc, its tags and its own controls. A lane with nothing in it keeps its place, so the board's shape says where the work is. Lanes share the width of the column and, when they no longer fit side by side, scroll sideways on their own — never the page.

It is the view's own board, not a `<dpk-board-kanban>` element: the cards are this view's todos, so each keeps the actions the view already had, and every change is still the view's own draft action (`SET_TODO_STATUS`, `DECIDE_PROPOSAL`, `ADD_TODO`, `DELETE_TODO`) rather than a card move the agent would have to translate.

- The status of a todo a **person** has (`members[].kind: "human"`) is a select the person changes; dragging its card to another lane records the same change. The agent's own todos, unassigned ones and proposals show their status as a label: the agent reports its progress by rewriting the base data.
- A proposal is a card in the lane its status puts it in, marked "?" (violet) with Accept / Decline. Accepted, it is a regular todo and counts toward progress; declined, it stays where it is, dimmed, with Undo.
- The assignee is a label. Who does what is the agent's to write; a person who wants it otherwise says so in a comment.
- When the view names a person, an All / People toggle above the board narrows what is shown to the todos people have. Progress always covers the whole board.
- The add-a-todo form sits at the foot of the Todo column: a title, and — when the board names members — who should do it. A todo the person adds is a request to the agent and can be removed again until the agent takes it; the agent links it to a design doc when it knows which one it belongs to.

## Base data

```json
{
  "title": "注文一覧 API のページング対応",
  "status": "waiting",
  "designs": [
    {
      "id": "paging",
      "title": "注文一覧のカーソルページング",
      "body": "## 背景\n深いページほど offset は遅い。\n\n## 方針\n`GET /orders` を cursor 方式にする。"
    },
    {
      "id": "rollout",
      "title": "管理画面の切り替えとリリース",
      "body": "## 移行\n旧パラメータの扱いが決まるまで切り替えは保留する。"
    }
  ],
  "members": [
    { "id": "claude", "name": "Claude", "kind": "agent" },
    { "id": "d-kimuson", "name": "d-kimuson", "kind": "human" }
  ],
  "todos": [
    { "id": "design", "title": "cursor の形式を決める", "status": "done", "assignee": "claude", "design": "paging" },
    {
      "id": "impl",
      "title": "GET /orders を cursor 方式にする",
      "status": "doing",
      "assignee": "claude",
      "design": "paging",
      "note": "上限件数は Q2 の仮回答で実装中"
    },
    { "id": "review", "title": "PR をレビューする", "assignee": "d-kimuson", "design": "paging" },
    { "id": "client", "title": "管理画面の一覧を新しい API に切り替える", "design": "rollout" },
    {
      "id": "index",
      "title": "(created_at, id) の複合 index を張る",
      "assignee": "claude",
      "design": "paging",
      "proposed": true,
      "reason": "同時刻の注文が多い日に並べ替えが遅い"
    }
  ],
  "outputs": [
    {
      "id": "pr",
      "label": "#1284 注文一覧を cursor ページングにする",
      "href": "https://github.com/example/shop/pull/1284",
      "kind": "PR"
    },
    { "id": "handler", "href": "src/api/orders/list.ts" }
  ],
  "questions": [
    {
      "id": "legacy",
      "title": "旧パラメータ page / per_page はどう扱いますか？",
      "blocking": true,
      "assumption": "当面は両方受け付ける"
    },
    {
      "id": "limit",
      "title": "1 ページの上限件数はいくつにしますか？",
      "assumption": "100 件で進める"
    }
  ]
}
```

| Field                                                               | Required | Meaning                                                                                                                                                                                    |
| ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`                                                             | no       | The board. Defaults to `Task Context Board`.                                                                                                                                               |
| `status`                                                            | no       | The work as a whole: `working`, `waiting` (on the person), `blocked` or `done`. Shown in the header.                                                                                       |
| `designs[]`                                                         | no       | The design docs, in the agent's order.                                                                                                                                                     |
| `designs[].id` / `.title`                                           | yes      | Stable id (what `todos[].design` refers to) and the doc's title.                                                                                                                           |
| `designs[].body`                                                    | no       | The doc itself, in Markdown. Raw HTML is shown as text; links open in a new tab.                                                                                                           |
| `members[]`                                                         | no       | Who can take a todo. Without members there is no assignee to pick for a new todo, and no People filter.                                                                                    |
| `members[].id` / `.name`                                            | yes      | Stable id (what `assignee` refers to) and display name.                                                                                                                                    |
| `members[].kind`                                                    | no       | `agent` (default) or `human`. Only a `human` member's todos take a status from the page.                                                                                                   |
| `todos[]`                                                           | no       | The tasks, in the agent's order.                                                                                                                                                           |
| `todos[].id` / `.title`                                             | yes      | Stable id and the task.                                                                                                                                                                    |
| `todos[].status`                                                    | no       | `todo` (default), `doing`, `blocked` or `done`.                                                                                                                                            |
| `todos[].design`                                                    | no       | A design doc id: the doc this task belongs to. An id not in `designs` is an error.                                                                                                         |
| `todos[].assignee`                                                  | no       | A member id. An id not in `members` is an error.                                                                                                                                           |
| `todos[].note`                                                      | no       | One line under the task (what is left, what it waits on).                                                                                                                                  |
| `todos[].proposed`                                                  | no       | `true` for something the agent was not asked to do but thinks should be done. It shows with a "?" until the person accepts it.                                                             |
| `todos[].reason`                                                    | no       | Why the agent proposes it.                                                                                                                                                                 |
| `outputs[]`                                                         | no       | What the agent produced.                                                                                                                                                                   |
| `outputs[].id` / `.href`                                            | yes      | Stable id and where it is: a URL (`https://…`, opened in a new tab) or a file path (`docs/paging.md`, shown as text).                                                                      |
| `outputs[].label`                                                   | no       | Display name. Without one the row shows the href itself.                                                                                                                                   |
| `outputs[].kind`                                                    | no       | A short tag (`PR`, `Doc`, `CI`).                                                                                                                                                           |
| `outputs[].description`                                             | no       | One line under the output.                                                                                                                                                                 |
| `questions[]`                                                       | no       | What the agent needs the person to answer.                                                                                                                                                 |
| `questions[].id` / `.title`                                         | yes      | Stable id and the question.                                                                                                                                                                |
| `questions[].ref`                                                   | no       | Display reference. Defaults to `Q1`, `Q2`, … by position.                                                                                                                                  |
| `questions[].description`                                           | no       | Context for the answer.                                                                                                                                                                    |
| `questions[].blocking`                                              | no       | `true` when the agent cannot go on until the person decides. Defaults to `false`.                                                                                                          |
| `questions[].assumption`                                            | see note | What the agent works on until it hears otherwise. **Required** unless `blocking`; on a blocking question it is the agent's recommendation, and may be left out.                            |
| `designs[].questions` / `todos[].questions` / `outputs[].questions` | no       | Refs of the grill questions (`data-dpk-grill`, not this view's own `questions[]`) the item is about, space-separated (`"Q1 Q4"`); each gets a Q badge (`docs/index.md`, Questions (grill)) |

Ids follow the common id rule (letters, digits, `_`, `-`); a duplicate id, an unknown status or an unknown key is an error, and so is a non-blocking question without an assumption, a todo whose `design` is not in `designs`, or an `assignee` / `from` that is not in `members`. An empty string reads as "not given". A minimal document is `{}`.

## Design docs and diagrams

The Design Docs tab is what anyone coming back to the work reads first — the agent picking up where it left off, or the person asking "what were we doing again?". Write each doc as Markdown and keep it current. A board slotted with `slot="design:<id>"` shows inside that doc, after the prose and before its tasks. Load `boards.js` alongside `views/task-board.js` (or use the all-in-one `index.js`), and give each board a stable `id` so its elements take comments:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/views/task-board.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/boards.js"></script>

<dpk-app storage-key="orders-paging">
  <dpk-page name="task" label="注文一覧のページング">
    <dpk-view-task-board>
      <script type="application/json">
        {
          "title": "注文一覧 API のページング対応",
          "designs": [{ "id": "paging", "title": "カーソルページング", "body": "## 方針\n…" }],
          "todos": [{ "id": "impl", "title": "実装する", "design": "paging" }]
        }
      </script>
      <dpk-board-er-diagram id="orders-schema" slot="design:paging" heading="注文スキーマ">
        <script type="application/json">
          { "after": { "tables": [] } }
        </script>
      </dpk-board-er-diagram>
    </dpk-view-task-board>
  </dpk-page>
</dpk-app>
```

Each doc is the kit's own card, titled in its head; its body uses the prose atom, so headings, lists, tables and code read the way the doc was written. Its diagrams follow the prose inside the same card, and the tasks it groups are a plain list with their status below them.

## Questions never stop the work

Ask a question with the assumption the agent goes ahead on. The person either approves it or writes what they expect instead; the agent then corrects course. Only a question the agent truly cannot get past is `blocking`: the view lists those first, as blockers. A blocker can still carry a recommendation to approve; without one, the person writes the answer.

## Action vocabulary

| Action            | Target     | Payload                                                                                              |
| ----------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `ANSWER_QUESTION` | `question` | `{ kind: 'approve' }` \| `{ kind: 'answer', text }` \| `{ kind: 'clear' }`                           |
| `DECIDE_PROPOSAL` | `todo`     | `{ decision: 'accept' \| 'decline' \| 'clear' }` — only on a proposed todo                           |
| `SET_TODO_STATUS` | `todo`     | `{ status: 'todo' \| 'doing' \| 'blocked' \| 'done' }` — only on a planned todo a `human` member has |
| `ADD_TODO`        | `page`     | `{ id, title, assignee: <member id> \| null }`                                                       |
| `DELETE_TODO`     | `todo`     | `{}` — only a todo the person added in this draft                                                    |

One reply per question and one decision per proposal: a later one replaces the earlier, and `clear` takes it back. `approve` means "the assumption (or recommendation) is right"; `answer` carries what the person expects instead. An accepted proposal counts as a regular todo (it counts toward progress, and its status takes a change when a person has it); a declined one stays in the list, dimmed. A todo the person adds is a request to the agent; its id is taken from its title, and it starts without a design doc. The agent's own todos cannot be deleted from the view — a comment asks the agent to drop one.

An unknown question, todo or member, `approve` on a question without an assumption, a decision on a todo that is not proposed, or a status on a todo no person has (the agent reassigned it) makes the action **stale** instead of being dropped.

```text
ANSWER_QUESTION question:limit {"kind":"approve"}
ANSWER_QUESTION question:legacy {"kind":"answer","text":"今回で 400 を返してよい"}
DECIDE_PROPOSAL todo:index {"decision":"accept"}
SET_TODO_STATUS todo:review {"status":"doing"}
ADD_TODO page:task-board {"id":"release-note","title":"リリースノートを書く","assignee":"claude"}
```

In a page, each target is qualified by the page's name: `ADD_TODO page:task-board@task …`, `todo:review@task`.

When the agent reads an accepted proposal, it drops `proposed` (and `reason`) from the todo. When it has taken a reply into account, it removes the question or rewrites it. A task the person added starts without a design doc; the agent links it when it knows which doc it belongs to.

## Comment targets

| Target            | How the person reaches it                                         |
| ----------------- | ----------------------------------------------------------------- |
| `page:task-board` | The review composer with nothing attached ("Whole board")         |
| `question:<id>`   | The comment button on the question, or the composer's target list |
| `todo:<id>`       | The comment button on the card (the todo or proposal)             |
| `design:<id>`     | The comment button on the design doc                              |
| `element:<id>/…`  | A board slotted into a design doc (`slot="design:<id>"`)          |

Outputs take no comments: the person opens or copies them, and comments on the work go on the todo it belongs to. A comment on an item that disappears from the base data stays in the draft as **stale**. Keep ids stable across revisions so replies, decisions and comments keep their targets.

## Navigation

The view has no navigation state: the open tab, the open design doc and the todo filter are the reader's view, not part of the draft. The tabs are Design Docs / Questions / Tasks, and the selected tab and doc stay selected while the person works. A card dropped in another lane is the same `SET_TODO_STATUS` change its select makes.

Give `<dpk-app>` the page's height (`docs/index.md`, Page height): the main area and the rail scroll inside the shell.

## Writing the page

- Rewrite the whole page each time: `status` says where the work stands now.
- Write the design docs at the start and keep them true: when the approach changes, change the doc and its diagrams, not only the todo list. Put the background and the approach in the doc rather than in a task, so the intent outlives the tasks that carry it.
- Link every task that belongs to a doc with `design`; leave standalone chores without one. One doc may carry many tasks, and a task names only one doc.
- Give every question an assumption and keep working on it. Mark a question `blocking` only when no reasonable assumption lets the work go on, and set `status` to `waiting` while one is open.
- Put what the agent was not asked to do in the todo list as `proposed: true` with a `reason`. Work the person asked for is a plain todo.
- List every output the person may want to open or copy: PRs, documents, runs, preview URLs, and the files the agent wrote (as paths).

## Change notices

[Change notices](../index.md#change-notices)'s "Show" opens the tab the target lives on and highlights the entry:

| Target          | Tab                                                      |
| --------------- | -------------------------------------------------------- |
| `design:<id>`   | Design Docs                                              |
| `question:<id>` | Questions                                                |
| `todo:<id>`     | Tasks — clears the All/People filter so it is not hidden |
