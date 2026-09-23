/**
 * Minifies the JavaScript of a release with esbuild.
 *
 * Vite's ES library build minifies identifiers and syntax but deliberately keeps whitespace
 * (`minifyWhitespace: false` on Vite's lib path), on the assumption that a library is re-bundled
 * by whatever consumes it. This framework is delivered to a browser as-is, and its release
 * directory is committed, so a published release is minified fully: the bytes are what a page
 * downloads and what the repository stores, and neither wants the formatting.
 *
 * Only the bytes change. The module graph is untouched — a chunk keeps its relative imports and
 * the entries keep their exports — so a release is still mirrored as a whole directory, which is
 * what `scripts/verify-release.ts` verifies.
 *
 * The development tree is not minified: `vite build --watch` rewrites it while a dev session
 * runs, and it is what a developer reads in the browser.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';

/** The release's root, relative to this file (`scripts/`). */
const MINIFY_OPTIONS = {
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  target: 'es2022',
  // The output has to stay an ES module: the entries import their chunks by relative path.
  format: 'esm',
} as const;

/** Minifies every `.js` file of a release in place and returns the files it rewrote. */
export const minifyRelease = async (releaseRoot: string): Promise<readonly string[]> => {
  const files = (await readdir(releaseRoot, { recursive: true })).filter((file) => file.endsWith('.js')).sort();
  const minified: string[] = [];
  for (const file of files) {
    const path = `${releaseRoot}/${file}`;
    const source = await readFile(path, 'utf8');
    const result = await transformWithEsbuild(source, file, MINIFY_OPTIONS);
    if (result.code !== source) {
      await writeFile(path, result.code);
      minified.push(file);
    }
  }
  return minified;
};
