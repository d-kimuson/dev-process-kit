// Global vitest setup, wired via `test.setupFiles` in `vitest.config.ts`.
import { afterEach } from 'vitest';

/**
 * Tests mount custom elements straight into `document.body` and rarely remove
 * them again, so an element can still be connected, with a Lit update it
 * scheduled still pending, when its test file finishes. Several `src/**`
 * files run under `@vitest-environment jsdom` (overriding the default
 * happy-dom), which makes vitest tear that environment down once the file's
 * tests are done; a pending update that resolves after the teardown then
 * throws `ReferenceError`s (`getComputedStyle`, `HTMLSlotElement`, …) against
 * globals that no longer exist, surfacing as unhandled errors that fail the
 * run even though every test passed.
 *
 * Clearing `document.body` disconnects any mounted element (synchronously
 * invoking `disconnectedCallback`, which stops the controllers it owns), and
 * waiting a macrotask lets the microtask queue — including Lit's own update
 * scheduling and any `queueMicrotask` callback a controller queued — drain
 * while the environment backing `document` is still alive, rather than after.
 */
afterEach(async () => {
  // Pure-logic tests opt out of a DOM with `@vitest-environment node`; nothing to settle there.
  if (typeof document === 'undefined') return;
  document.body.innerHTML = '';
  await new Promise((resolve) => setTimeout(resolve, 0));
});
