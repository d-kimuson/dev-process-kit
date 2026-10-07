# Let the reader switch a page to another published version

Every entry checks the page URL for `?dpk-version=<exact version>` before it defines anything. When that names another version, the entry imports the same entry of that version from jsDelivr and defines nothing itself. The template header renders a select of the published versions that sets the parameter and reloads the page.

## Status

accepted

## Context

A generated page pins one exact version of the kit, and that stays the contract ([ADR](20260924_npm-jsdelivr-distribution.md)). Readers still want to look at the same page with another version: to check whether a newer release renders it better, or whether a regression came with an upgrade. Until now only the samples could do that, through their own loader (`sample/kit.js`), which decides which bundle to import before any of it runs. A normal page has no such loader: it loads one entry with a `<script type="module">`, and that entry defines the custom elements as soon as it is evaluated.

The forces:

- **A document defines a custom element once.** Swapping versions in place is impossible, so a switch is a reload, and the code that runs first has to decide which version defines the elements.
- **The page is the author's HTML, frozen when it was generated.** The switch has to live in the kit, not in markup the agent would have to write, and it has to work for pages that already exist once they are on a version that has it.
- **Old versions cannot change.** A version published before this decision neither delegates nor renders a select.
- **A Claude Artifact admits scripts from `cdn.jsdelivr.net/npm/` only**, and its CSP may block other requests.

Alternatives considered:

- **A separate loader script the page loads instead of the entry.** It would decide before importing, like `kit.js`, but every page would need a different `<script>` and the existing pages would never gain the switch.
- **Rewriting this module's own URL (`import.meta.url`).** It would keep self-hosted or mirrored copies on their host, but it fails for a local build, whose URL names no version, and for any host that does not carry every version. jsDelivr does, and is the one host an Artifact may load from.
- **Reusing the samples' `?version=`.** Shorter and continuous with existing sample links, but the page's query belongs to its author, and a generic name is the one most likely to collide.

## Decision

- **The entry decides.** Each entry, when evaluated, reads `?dpk-version`. Only an exact semver that differs from its own version delegates; the delegated-to version sees its own version and runs, which is what ends the chain. An invalid value, or the running version, changes nothing. When the import fails, the pinned version runs the page after all, so a typo never leaves a blank page.
- **The target is always jsDelivr**, at `dev-process-kit@<version>/dist/<same entry>`, whatever the delegating entry was loaded from. The entry names its own path explicitly instead of deriving it from its URL.
- **The parameter is `dpk-version`**, namespaced like every public name of the kit ([ADR](20260924_dpk-naming.md)). The samples' former `?version=` is still read, so links already shared keep working.
- **The shell renders the select** in the header's version label. The published versions come from jsDelivr's package API, fetched only when the reader first hovers or focuses the select, never on page load; when it cannot be fetched the select lists the running version alone. While the URL overrides the version, the select offers going back to the pinned one.
- **A version without the select gets one from the version that delegated to it.** After the import, the delegating entry checks whether the version that ran announced `versionParam` on `window.devProcessKit`. When it did not, it puts a plain select into each template's `header` slot, a public slot every version has, so the reader can always come back.
- **The samples keep their loader** for what only they need (the local build under `pnpm dev`, the latest release on GitHub Pages) and read the same parameter. They add their own select only when the loaded version renders none.

## Consequences

- Every page on a version with this decision gains the switch without changing its HTML; pages on older versions do not, until they are regenerated.
- The only version a page ever runs by itself is still the one it pins. The parameter is a reader's experiment, and the docs tell agents never to write it into links.
- A page that loads two entries (a template and `components.js`) delegates each of them separately; both go to the same version, and a version that lacks one of the entries falls back to the pinned version for that entry only, which can mix versions on one page. That is accepted for an opt-in experiment, and it is logged.
- A page's own imports from the entry module (`import { … } from '…/templates/x.js'`) still get the pinned version's exports; only the custom element definitions switch.
- The select adds one request to jsDelivr's API, on demand. Hosts that block it degrade to the running version only.
- The marker `versionParam` on `window.devProcessKit` is now a cross-version contract: future versions have to keep announcing it, or an older version that delegates to them would add a second select.
- Whether a host lets the page reload itself with a new query (an Artifact runs in a sandboxed frame) is the host's decision; where it does not, the select has no effect.

## References

- [ADR: Publish to npm and load from jsDelivr](20260924_npm-jsdelivr-distribution.md)
- [ADR: Ship one entry per template](20260920_per-template-entries.md)
- [jsDelivr data API](https://github.com/jsdelivr/data.jsdelivr.com)
