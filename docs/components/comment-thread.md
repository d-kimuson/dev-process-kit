# dpk-comment-thread

A thread of comments kept on one card or entity — part of the host template's own content, like a description or a label, not a review comment for the agent (`docs/components/comment-panel.md`'s composer handles those, and they travel with the hand-off instead of staying on the entity).

With `inline`, it renders the list and the add field directly, for a surface that is already open (a drawer, a panel). Without it, a small badge shows the comment count and opens the thread in a popover anchored to itself — the usual way to put a persisted comment thread directly on a card.

It owns no storage: the host passes `comments` and listens for `dpk-thread-comment-add` / `dpk-thread-comment-delete`, applying the change to its own data and calling `preventDefault()` once it has (the same protocol as `dpk-comment-panel`'s `onComment`). A rejected add keeps the reader's text and shows an error; a rejected delete is simply not reflected back in `comments`.

```html
<dpk-comment-thread id="story-thread" label="Sign in with Google"></dpk-comment-thread>

<script type="module">
  const thread = document.getElementById('story-thread');
  thread.comments = [{ id: 'c1', body: 'Needs a mobile mock', createdAt: '2026-01-01T12:00:00.000Z' }];
  thread.addEventListener('dpk-thread-comment-add', (event) => {
    // apply event.detail.body to your own data, then:
    event.preventDefault();
    thread.comments = [...thread.comments, { id: crypto.randomUUID(), body: event.detail.body }];
  });
  thread.addEventListener('dpk-thread-comment-delete', (event) => {
    thread.comments = thread.comments.filter((c) => c.id !== event.detail.id);
  });
</script>
```

## Contract

| Property/attribute | Type                                     | Meaning                                                                                                                |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `comments`         | `CommentThreadItem[]` (attribute: false) | `{ id, body, createdAt? }`, oldest first. The host's own data; this component never mutates it.                        |
| `label`            | `string \| null`                         | What the thread is about (a story's name, a task's title); used in the trigger's and the popover's accessible names.   |
| `inline`           | `boolean` (reflects)                     | Renders the list and the add field directly, without a trigger button or a popover.                                    |
| `draft-key`        | `string \| null`                         | Forwarded to the add field as `data-dpk-text-key`, so unsent text survives a reload (`docs/index.md`'s text recovery). |

| Event                       | `detail`           | Cancelable | Meaning                                                                                                                                                      |
| --------------------------- | ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dpk-thread-comment-add`    | `{ body: string }` | yes        | The reader submitted a non-blank comment. The host applies it and calls `preventDefault()` to accept; rejected, the field keeps the text and shows an error. |
| `dpk-thread-comment-delete` | `{ id: string }`   | yes        | The reader asked to delete one comment. The host removes it from `comments` it passes back down.                                                             |

## Where it is used today

The user story map keeps each story's comments as part of the map (`UserStory.comments`, `docs/templates/usm.md`); its story panel uses `<dpk-comment-thread inline>` for that thread, inside the already-open drawer. A card-level trigger (the default, non-`inline` mode) suits templates whose cards may host their own small tools.
