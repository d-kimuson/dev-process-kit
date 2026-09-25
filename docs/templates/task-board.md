# Template: task-board (`<dpk-template-task-board>`)

Where one task shared by an agent and a person stands. Use it when the agent works on something over a while and the person needs to follow it without reading the conversation: why the task is done and what it changes, which todos are open and who has them, what the agent has produced so far, what the two have said to each other, what the agent thinks should also be done, and what it needs to ask.

The agent rewrites the base data as the work goes on. The person replies to questions, accepts or declines proposals, ticks off their own todos and asks for more work; all of it is draft actions the review hands back.

```text
dpk-template-task-board
  header   template label + task title, the task status, draft / note counts
  main     tabs, one shown at a time (Context is shown first):
           Context     Why / What / Goals / Non-goals, then the author's
                       diagrams (slot="main": ER, sequence, …)
           Work log    the conversation, newest first (tab counts it);
                       the newest entry carries the status and last update
           Questions   Blockers first (the agent waits on them),
                       then the ones it works on under an assumption
                       (tab counts the unanswered ones; red while a blocker is open)
  side     Outputs     one tight row each: open a URL, copy a URL or file path
  (right)  Todos       progress, All / People filter, the done ones folded
                       (above the rest), the todo list with proposals
                       marked "?", add a todo
  review   Review notes, opened from the floating button (top right);
           it floats over the side, not beside it
```

The main area and the right-hand side scroll separately, so the outputs and the todo list stay in view while the person reads a tab. The tab bar stays at the top of the main area. On a narrow screen the side comes after the main area, the page scrolls as one, and the review takes the whole screen.

In the todo list:

- The status of a todo a **person** has (`members[].kind: "human"`) is a select the person changes. The agent's own todos, unassigned ones and proposals show their status as a label: the agent reports its progress by rewriting the board.
- The assignee is a label. Who does what is the agent's to write; a person who wants it otherwise says so in a comment.
- Todos already `done` in the base data fold into a closed "Done (n)" group at the top of the list. A todo the person marks done in the draft stays where it is.
- When the board names a person, an All / People toggle narrows the list to the todos people have.

## Base data

```json
{
  "title": "注文一覧 API のページング対応",
  "status": "waiting",
  "updatedAt": "2026-09-25 14:10",
  "context": {
    "why": "注文が多い店舗で、一覧の後ろのページが 2 秒近くかかる。",
    "what": "GET /orders を offset 方式から cursor 方式にする。",
    "goals": ["どのページも 100 ms 以内に返る"],
    "nonGoals": ["検索条件を増やすこと"]
  },
  "members": [
    { "id": "claude", "name": "Claude", "kind": "agent" },
    { "id": "kaito", "name": "Kaito", "kind": "human" }
  ],
  "todos": [
    { "id": "design", "title": "cursor の形式を決める", "status": "done", "assignee": "claude" },
    {
      "id": "impl",
      "title": "GET /orders を cursor 方式にする",
      "status": "doing",
      "assignee": "claude",
      "note": "上限件数は Q2 の仮回答で実装中"
    },
    { "id": "review", "title": "PR をレビューする", "assignee": "kaito" },
    {
      "id": "index",
      "title": "(created_at, id) の複合 index を張る",
      "assignee": "claude",
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
  "log": [
    { "id": "kickoff", "from": "kaito", "at": "09-25 10:02", "body": "一覧が遅いので、方式から任せたい。" },
    {
      "id": "plan",
      "from": "claude",
      "at": "09-25 11:45",
      "title": "cursor 方式で進めます",
      "points": ["offset は深いページで 1.8 秒"]
    }
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

| Field                       | Required | Meaning                                                                                                                                                         |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                     | no       | The task. Defaults to `Task Context Board`.                                                                                                                     |
| `status`                    | no       | The task as a whole: `working`, `waiting` (on the person), `blocked` or `done`. Shown in the header and on the newest log entry.                                |
| `updatedAt`                 | no       | When the agent last rewrote the board, as display text. Shown on the newest log entry.                                                                          |
| `context`                   | no       | What the task is about, design-doc style. Only the parts given are shown.                                                                                       |
| `context.why` / `.what`     | no       | Why it is done (the problem, who has it) and what it changes (the approach in a paragraph).                                                                     |
| `context.goals[]`           | no       | What counts as done.                                                                                                                                            |
| `context.nonGoals[]`        | no       | What is deliberately left out.                                                                                                                                  |
| `members[]`                 | no       | Who can take a todo. Without members there is no assignee to pick for a new todo, and no People filter.                                                         |
| `members[].id` / `.name`    | yes      | Stable id (what `assignee` refers to) and display name.                                                                                                         |
| `members[].kind`            | no       | `agent` (default) or `human`. Only a `human` member's todos take a status from the board.                                                                       |
| `todos[]`                   | no       | The todo list, in the agent's order.                                                                                                                            |
| `todos[].id` / `.title`     | yes      | Stable id and the todo.                                                                                                                                         |
| `todos[].status`            | no       | `todo` (default), `doing`, `blocked` or `done`.                                                                                                                 |
| `todos[].assignee`          | no       | A member id. An id not in `members` is an error.                                                                                                                |
| `todos[].note`              | no       | One line under the todo (what is left, what it waits on).                                                                                                       |
| `todos[].proposed`          | no       | `true` for something the agent was not asked to do but thinks should be done. It shows with a "?" until the person accepts it.                                  |
| `todos[].reason`            | no       | Why the agent proposes it.                                                                                                                                      |
| `outputs[]`                 | no       | What the agent produced.                                                                                                                                        |
| `outputs[].id` / `.href`    | yes      | Stable id and where it is: a URL (`https://…`, opened in a new tab) or a file path (`docs/paging.md`, shown as text).                                           |
| `outputs[].label`           | no       | Display name. Without one the row shows the href itself.                                                                                                        |
| `outputs[].kind`            | no       | A short tag (`PR`, `Doc`, `CI`).                                                                                                                                |
| `outputs[].description`     | no       | One line under the output.                                                                                                                                      |
| `log[]`                     | no       | The conversation between the person and the agent, **oldest first** (the board shows the newest first).                                                         |
| `log[].id`                  | yes      | Stable id.                                                                                                                                                      |
| `log[].from`                | no       | A member id: who said it. Without one it is the agent. An id not in `members` is an error.                                                                      |
| `log[].title` / `.body`     | see note | A headline and the message. **At least one** of the two is required.                                                                                            |
| `log[].at` / `.points[]`    | no       | When it was said (display text) and bullet points under it.                                                                                                     |
| `questions[]`               | no       | What the agent needs the person to answer.                                                                                                                      |
| `questions[].id` / `.title` | yes      | Stable id and the question.                                                                                                                                     |
| `questions[].ref`           | no       | Display reference. Defaults to `Q1`, `Q2`, … by position.                                                                                                       |
| `questions[].description`   | no       | Context for the answer.                                                                                                                                         |
| `questions[].blocking`      | no       | `true` when the agent cannot go on until the person decides. Defaults to `false`.                                                                               |
| `questions[].assumption`    | see note | What the agent works on until it hears otherwise. **Required** unless `blocking`; on a blocking question it is the agent's recommendation, and may be left out. |

Ids follow the common id rule (letters, digits, `_`, `-`); a duplicate id, an unknown status or an unknown key is an error, and so is a non-blocking question without an assumption or a log entry with neither a title nor a body. An empty string reads as "not given". A minimal document is `{}`.

## Context and diagrams

The Context tab is what anyone coming back to the task reads first — the agent picking up where it left off, or the person asking "what were we doing again?". Keep `why` and `what` short and current, and draw what prose explains badly: put diagram elements in `slot="main"` and they show under the design doc. Load `components.js` alongside `templates/task-board.js` (or use the all-in-one `index.js`), and give each diagram a stable `id` so its elements take comments:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/templates/task-board.js"
></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/components.js"></script>

<dpk-template-task-board storage-key="orders-paging">
  <script type="application/json">
    { "title": "注文一覧 API のページング対応", "context": { "why": "…", "what": "…" } }
  </script>
  <dpk-component-er-diagram id="orders-schema" slot="main" heading="ERD">
    <script type="application/json">
      { "after": { "tables": [] } }
    </script>
  </dpk-component-er-diagram>
</dpk-template-task-board>
```

## The log is a conversation

`log` records what the person and the agent said to each other — what was asked, agreed, reported or handed back — not each step of the work; the todos carry that. The newest entry is where the reader starts, so it also shows `status` and `updatedAt`: when the agent needs something, say it there.

Replies, decisions and the person's todo changes never go in the base data. When the agent has acted on them, it writes the result into the base data: a todo change the base already has drops out of the draft, and a reply or decision whose question or proposal the agent removed or settled stays as **stale**, listed apart in the brief.

## Questions never stop the work

Ask a question with the assumption the agent goes ahead on. The person either approves it or writes what they expect instead; the agent then corrects course. Only a question the agent truly cannot get past is `blocking`: the board lists those first, as blockers. A blocker can still carry a recommendation to approve; without one, the person writes the answer.

## Action vocabulary

| Action            | Target     | Payload                                                                                              |
| ----------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `ANSWER_QUESTION` | `question` | `{ kind: 'approve' }` \| `{ kind: 'answer', text }` \| `{ kind: 'clear' }`                           |
| `DECIDE_PROPOSAL` | `todo`     | `{ decision: 'accept' \| 'decline' \| 'clear' }` — only on a proposed todo                           |
| `SET_TODO_STATUS` | `todo`     | `{ status: 'todo' \| 'doing' \| 'blocked' \| 'done' }` — only on a planned todo a `human` member has |
| `ADD_TODO`        | `page`     | `{ id, title, assignee: <member id> \| null }`                                                       |
| `DELETE_TODO`     | `todo`     | `{}` — only a todo the person added in this draft                                                    |

One reply per question and one decision per proposal: a later one replaces the earlier, and `clear` takes it back. `approve` means "the assumption (or recommendation) is right"; `answer` carries what the person expects instead. An accepted proposal counts as a regular todo (it counts toward progress, and its status takes a change when a person has it); a declined one stays in the list, dimmed. A todo the person adds is a request to the agent; its id is taken from its title. The agent's own todos cannot be deleted from the board — a comment asks the agent to drop one.

An unknown question, todo or member, `approve` on a question without an assumption, a decision on a todo that is not proposed, or a status on a todo no person has (the agent reassigned it) makes the action **stale** instead of being dropped.

```text
ANSWER_QUESTION question:limit {"kind":"approve"}
ANSWER_QUESTION question:legacy {"kind":"answer","text":"今回で 400 を返してよい"}
DECIDE_PROPOSAL todo:index {"decision":"accept"}
SET_TODO_STATUS todo:review {"status":"doing"}
ADD_TODO page:task-board {"id":"release-note","title":"リリースノートを書く","assignee":"claude"}
```

When the agent reads an accepted proposal, it drops `proposed` (and `reason`) from the todo. When it has taken a reply into account, it removes the question or rewrites it.

## Comment targets

| Target            | How the person reaches it                                         |
| ----------------- | ----------------------------------------------------------------- |
| `page:task-board` | The review composer with nothing attached ("Whole board")         |
| `question:<id>`   | The comment button on the question, or the composer's target list |
| `todo:<id>`       | The comment button on the todo or proposal                        |
| `log:<id>`        | The comment button on the log entry                               |
| `context:<part>`  | The comment button on `why`, `what`, `goals` or `nonGoals`        |
| `element:<id>/…`  | A diagram in `slot="main"` (see the diagram's own page)           |

Outputs take no comments: the person opens or copies them, and comments on the work go on the todo or log entry it belongs to. A comment on an item that disappears from the base data stays in the draft as **stale**. Keep ids stable across revisions so replies, decisions and comments keep their targets.

## Navigation

The board is one page and has no navigation state: the open tab and the todo filter are the reader's view, not part of the draft.

Give the host a height (for example `dpk-template-task-board { display: block; height: 100dvh; }`): the main area and the side scroll inside the shell.

## Writing the board

- Rewrite the whole board each time: `status` and `updatedAt` say where things stand now, and `log` keeps the conversation. Add an entry when something is said or handed over (a question answered, a plan agreed, a PR ready), not for every step.
- Write `context` at the start and keep it true: when the approach changes, change `what` (and the diagrams), not only the log.
- Give every question an assumption and keep working on it. Mark a question `blocking` only when no reasonable assumption lets the work go on, and set `status` to `waiting` while one is open.
- Put what the agent was not asked to do in the todo list as `proposed: true` with a `reason`. Work the person asked for is a plain todo.
- List every output the person may want to open or copy: PRs, documents, runs, preview URLs, and the files the agent wrote (as paths).
