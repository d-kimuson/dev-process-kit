/**
 * Compile-time guard for the DOM lib replacement.
 *
 * `package.json` aliases `@typescript/lib-dom` to `modern-web-types`, so `"DOM"`
 * in `tsconfig.json` resolves to a lib generated with a one-engine threshold.
 * The APIs below exist in that lib and are deliberately absent from TypeScript's
 * built-in `lib.dom.d.ts` (which only includes APIs shipped in two or more
 * engines), so this file stops type-checking the moment the alias is dropped.
 *
 * The types are referenced from the generated libs rather than pinned to a
 * hand-written shape: a change in an upstream signature surfaces here, and the
 * reference is type-only, so there is no runtime cost.
 */
export type ModernWebTypesGuard = {
  /** Long Animation Frame timing (LoAF) — Chromium-only. */
  readonly longAnimationFrameScripts: PerformanceLongAnimationFrameTiming['scripts'];
  /** Deferred analytics beacon — Chromium-only. */
  readonly deferredBeacon: Window['fetchLater'];
  /** Element-scoped view transitions — Chromium-only. */
  readonly elementViewTransition: Element['startViewTransition'];
};
