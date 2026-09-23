# Testing and QA Guideline

Verify acceptance criteria with the lightest reproducible method that exercises the relevant boundary. Static checks establish code consistency; QA establishes behavior.

## Verification layers

Use the lowest layer that can provide credible evidence:

1. **Pure unit tests** cover domain transitions, presentation derivation, navigation, and other behavior without effects.
2. **Custom Element integration tests** cover rendering, events, dispatch, rerendering, and persistence at the component boundary.
3. **Release verification** covers the assembled bundles, public documentation, headers, release metadata, and pinned sample URLs.
4. **Real-browser QA** covers behavior that simulated DOM environments cannot represent reliably, including drag gestures, popovers, slot routing, cross-origin module loading, and browser-specific APIs.
5. **Human QA** is reserved for visual judgment and product decisions that cannot be made reproducibly by an agent.

Do not move a check to a heavier layer merely because that layer is available. Conversely, do not use a unit test as evidence for integration behavior it never exercises.

## Real-browser QA

Follow the shared `browser-ops` skill for browser lifecycle, profiles, and authentication. Start development servers through `pueue`, and use the repository's browser smoke script for the repeatable baseline. Add direct browser interaction only for behavior outside that script's coverage.

Exercise the built bundle from the sample's separate origin. This preserves the deployment boundary and catches failures hidden by importing source modules directly. For a typical change, verify the affected scenarios among:

- the sample renders without an error banner or console error;
- the module loads across origins;
- the review rail accepts a comment;
- an authored action changes the visible state;
- draft state survives a reload;
- navigation is canonicalized;
- debug releases are not treated as immutable versioned releases.

When adopting an API with limited browser availability, verify both the supported path and the fallback or feature-detection path in the relevant engines.

Use HTTP-level checks for cache policy, redirects, CORS headers, and missing assets. These are protocol contracts and are more directly observed without a browser UI.

## Evidence

Do not commit session records to the repository. Report real-browser results in the ticket or pull request: the tested build or URL, scenarios, results, failures and reruns, and any remaining human judgment. Attach screenshots only when they add evidence that commands and assertions cannot capture. A check worth repeating belongs in an executable script such as `dev/qa/browser-smoke.ts`, not in prose.

In a ticket or pull request, map evidence to the acceptance criteria. Report unresolved failures rather than replacing them with a general statement that the checks passed.
