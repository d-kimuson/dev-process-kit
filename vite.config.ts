// Resolved via pnpm workspace install (`pnpm install`).
import { defineConfig, transformWithEsbuild, type Plugin } from 'vite';

import pkg from './package.json' with { type: 'json' };

/**
 * The entry points the package ships, as `<output name> -> <source>`. A page loads one of them
 * from jsDelivr, pinned to an exact version:
 * `https://cdn.jsdelivr.net/npm/dev-process-kit@<version>/dist/<name>.js`.
 *
 * A page that uses one template downloads that template, not every template and every diagram;
 * `index` stays the union of all of them. The entries share the core, the components and their
 * dependencies, which Rollup emits once as chunks next to them.
 */
const ENTRIES = {
  index: 'src/index.ts',
  components: 'src/entries/components.ts',
  'templates/prototype': 'src/entries/prototype.ts',
  'templates/usm': 'src/entries/usm.ts',
  'templates/event-storming': 'src/entries/event-storming.ts',
  'templates/example-mapping': 'src/entries/example-mapping.ts',
  'templates/grill': 'src/entries/grill.ts',
  'templates/plain': 'src/entries/plain.ts',
  'templates/slides': 'src/entries/slides.ts',
  'templates/task-board': 'src/entries/task-board.ts',
} as const satisfies Record<string, string>;

// `exports` in package.json is the same list seen from a bundler; keep the two from drifting.
const expectedExports = Object.fromEntries(
  Object.keys(ENTRIES).map((name) => [name === 'index' ? '.' : `./${name}`, `./dist/${name}.js`]),
);
if (JSON.stringify(pkg.exports) !== JSON.stringify(expectedExports)) {
  throw new Error(`package.json "exports" must be ${JSON.stringify(expectedExports, null, 2)}`);
}

/**
 * Vite's ES library build keeps whitespace, assuming a library is re-bundled by its consumer.
 * This one is loaded by the browser as-is, so the published build is minified fully.
 */
const minifyFully = (): Plugin => ({
  name: 'dpk:minify-fully',
  apply: 'build',
  // After every `renderChunk`, so no later pass reformats the output.
  generateBundle: {
    order: 'post',
    async handler(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const result = await transformWithEsbuild(chunk.code, chunk.fileName, {
          minify: true,
          target: 'es2022',
          format: 'esm',
        });
        chunk.code = result.code;
      }
    },
  },
});

/**
 * Licenses the bundle may contain. The package is MIT, so everything bundled into it has to be
 * permissive too. Apache-2.0 is deliberately absent: it can require reproducing a `NOTICE` file,
 * which the generated notice does not do, so adding such a dependency needs a decision first.
 */
const ALLOWED_LICENSES = new Set(['MIT', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense']);

/** Fails the build when the generated third-party notice lists a license outside the allowlist. */
const checkLicenses = (): Plugin => ({
  name: 'dpk:check-licenses',
  apply: 'build',
  generateBundle: {
    order: 'post',
    handler(_options, bundle) {
      const notice = bundle['THIRD_PARTY_LICENSES.md'];
      if (notice?.type !== 'asset') return this.error('THIRD_PARTY_LICENSES.md was not generated');
      const text = typeof notice.source === 'string' ? notice.source : new TextDecoder().decode(notice.source);
      // Vite writes one heading per package: `## <name> - <version> (<SPDX identifier>)`.
      const disallowed = [...text.matchAll(/^## (\S+) - (\S+) \(([^)]+)\)$/gm)].filter(
        ([, , , license]) => !ALLOWED_LICENSES.has(license ?? ''),
      );
      if (disallowed.length > 0) {
        this.error(`bundled under a license that is not allowed: ${disallowed.map(([heading]) => heading).join(', ')}`);
      }
    },
  },
});

/**
 * `pnpm build` writes the published package (minified, no source maps). `pnpm dev` builds with
 * `--mode dev` into the same `dist/`, readable and with source maps, and serves it to the samples
 * from a separate origin. (Not `development`: that would also switch the dependencies, Lit among
 * them, to their development builds, which the published package never runs.)
 */
export default defineConfig(({ mode }) => {
  const production = mode === 'production';
  return {
    define: {
      __DPK_VERSION__: JSON.stringify(pkg.version),
    },
    publicDir: false,
    plugins: [...(production ? [minifyFully()] : []), checkLicenses()],
    build: {
      outDir: 'dist',
      target: 'es2022',
      // `minifyFully` minifies the published build as a whole.
      minify: false,
      // The published package ships no source maps: the bytes are what a page downloads.
      sourcemap: !production,
      // Attribution for the packages that actually end up in the bundle, derived from the module
      // graph. It is emitted next to the bundle, so it travels with it.
      license: { fileName: 'THIRD_PARTY_LICENSES.md' },
      lib: {
        entry: ENTRIES,
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        output: {
          // Nothing but the entries is a contract; the chunk names say "internal".
          chunkFileNames: 'chunks/shared-[hash].js',
        },
      },
    },
  };
});
