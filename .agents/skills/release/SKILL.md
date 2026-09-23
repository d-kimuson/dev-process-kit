---
name: release
description: Run the dev-process-kit release flow end-to-end. Use when the user asks to release patch, minor, major, beta, or an explicit semver; bumps the version with `npm version`, pushes the signed tag, watches the Release workflow that publishes to npm, and publishes the GitHub Release.
---

# dev-process-kit Release

A release is a version of the npm package `dev-process-kit`. Pages load it from jsDelivr pinned to that exact version, and its documentation is `docs/` at the `v<version>` tag, so a published version is never changed: a fix is a new version.

## Inputs

Interpret the user's argument as the release version spec:

| Spec                        | `npm version` argument    | Example                                           |
| --------------------------- | ------------------------- | ------------------------------------------------- |
| `patch` / `minor` / `major` | the same                  | `0.1.0` → `0.1.1`; `0.1.1-beta.2` → `0.1.1`       |
| `beta`                      | `prerelease --preid beta` | `0.1.0` → `0.1.1-beta.0`; `…-beta.0` → `…-beta.1` |
| an explicit semver          | the version               | `0.2.0`, `0.2.0-beta.0`                           |

If no version spec is present, ask the user which one to use. A `beta` goes to the npm dist-tag `beta`, so `@latest` is untouched; use it to try a build from a real Artifact before releasing it.

## Preconditions

1. Work from the repository root on `main`, with a clean working tree:

```bash
git branch --show-current
git status --short
```

2. If there are unrelated uncommitted changes, stop and ask the user how to handle them. Commit release-related changes first: `npm version` refuses a dirty tree.
3. The commit and the tag are signed with SSH:

```bash
git config --get gpg.format    # ssh
git config --get commit.gpgsign # true
git config --get tag.gpgsign    # true
```

4. The npm package exists and has a trusted publisher for `.github/workflows/release.yml`. The first version is published by hand, because npm cannot configure a trusted publisher for a package that does not exist yet.

## Release command

```bash
npm version <argument> -m "chore: release v%s"
git push --follow-tags
```

`npm version` runs the `preversion` script first (lint, typecheck, test, build), then updates `package.json`, creates the signed commit `chore: release v<version>` and the signed annotated tag `v<version>`. `--follow-tags` pushes the commit together with that tag.

If the push fails, the commit and the tag already exist locally. Fix the cause and push again; do not rerun `npm version`.

## Monitor GitHub Actions

The tag triggers the Release workflow, which builds, strips the development fields from `package.json` (`clean-pkg-json`) and publishes with provenance under the dist-tag of the version (`latest`, or `beta` for a prerelease).

```bash
TAG="v0.0.0" # replace
RUN_ID="$(gh run list --workflow Release --limit 20 --json databaseId,headBranch,event --jq ".[] | select(.headBranch == \"$TAG\" and .event == \"push\") | .databaseId" | head -n 1)"
test -n "$RUN_ID" && gh run watch "$RUN_ID" --exit-status
```

If the workflow fails, inspect the logs before taking corrective action:

```bash
gh run view "$RUN_ID" --log-failed
```

A version npm has not published can be retried by rerunning the workflow. Once npm has it, the number is spent: release the fix as the next version.

## Verify publish

```bash
VERSION="0.0.0" # replace
npm view "dev-process-kit@$VERSION" version
npm dist-tag ls dev-process-kit
curl -sfI "https://cdn.jsdelivr.net/npm/dev-process-kit@$VERSION/dist/index.js" | head -n 1
curl -sfI "https://raw.githubusercontent.com/d-kimuson/dev-process-kit/v$VERSION/docs/index.md" | head -n 1
```

The last two are what a consumer loads: the bundle from jsDelivr and the documentation at the tag.

## GitHub Release

Create the release from the tag with generated notes as a draft, then rewrite the notes:

```bash
TAG="v0.0.0" # replace
gh release create "$TAG" --verify-tag --draft --generate-notes $([[ "$TAG" == *-* ]] && echo --prerelease)
gh release view "$TAG" --json body --jq .body
```

Rewrite the notes for people who generate pages with dev-process-kit:

- Use concise, user-focused English.
- Prefer these sections when relevant: `Features`, `Bug Fixes`, `Breaking Changes`, `Internal`.
- Describe the impact on pages and on the public contract (elements, attributes, events, slots), not implementation details.
- Remove trivial items such as formatting, typo-only, dependency-only and purely internal refactors unless they affect users.
- Merge intermediate same-release fixes into their related feature or fix.

Publish the draft with the rewritten notes:

```bash
NOTES_FILE="/tmp/dev-process-kit-$TAG-release-notes.md" # write it with the file tool
gh release edit "$TAG" --notes-file "$NOTES_FILE" --draft=false
gh release view "$TAG" --json tagName,isDraft,isPrerelease,url
```

## Final report

Report:

- released tag/version and its npm dist-tag
- the `npm version` command used
- GitHub Actions run ID and result
- npm and jsDelivr verification results
- GitHub Release URL and draft/public state
- any follow-up commits created for release automation or this skill
