# Commit Guideline

A commit is a reviewable and reversible unit of intent, not a snapshot of everything currently changed in the working tree.

## Scope

Keep one logical change in each commit. Separate unrelated behavior, refactoring, documentation, and release work so each commit can be understood and reverted independently. When two changes are inseparable, make that dependency evident in the commit message.

Inspect the staged diff before committing. Include only files required by the stated intent, especially when the working tree already contains unrelated work. Do not discard, rewrite, or accidentally stage changes that belong to another task.

`public/` is tracked release output and belongs in a commit only when that commit intentionally creates or updates a release. `public-dev/` is temporary development output and never belongs in a commit.

## Message

Write commit messages in English, regardless of the language used in conversation or in other documents.

Use [Conventional Commits](https://www.conventionalcommits.org/) with the form:

```text
<type>(<optional scope>): <concise summary>
```

Choose the type and scope from the change's purpose rather than the files it happens to touch. Use a body when the motivation, trade-off, migration, or relationship to another change would otherwise be unclear. Mark breaking changes explicitly.

Do not repeat a file list, test transcript, or implementation walkthrough in the message; Git and the diff already preserve those details.

## Before committing

Run the checks appropriate to the changed boundary and resolve failures attributable to the change. A hook is a final guard, not a substitute for deliberate verification.

Review both the staged diff and the remaining working tree. The staged diff must express the commit's complete intent, while unstaged work must remain intact and clearly outside that intent.
