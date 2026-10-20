/**
 * The `package.json` version this bundle was built from. Imported rather than injected by `define`, so the file is in
 * the module graph: `pnpm dev` (`vite build --watch`) rebuilds when a release bumps it, and only `version` is bundled.
 */
export { version as FRAMEWORK_VERSION } from '../../package.json';
