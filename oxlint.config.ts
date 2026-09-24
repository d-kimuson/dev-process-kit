import { defineConfig } from 'oxlint';

/**
 * Lint is the enforcement point for the project's architectural rules.
 *
 * `dev/lints/conventions.js` holds the rules that encode boundaries the type
 * system cannot express (see `dev-docs/guidelines/architecture.md`); everything else
 * here is a general correctness or type-safety rule. Rules that a document could
 * state but lint can decide live here instead of in prose.
 */
export default defineConfig({
  jsPlugins: ['./dev/lints/conventions.js'],
  plugins: ['typescript', 'oxc', 'import', 'unicorn', 'promise', 'node', 'vitest'],
  categories: {
    correctness: 'error',
  },
  rules: {
    /* Type safety: `as` and `any` are the escape hatches this project avoids. */
    'typescript/no-explicit-any': 'error',
    'typescript/no-unsafe-assignment': 'error',
    'typescript/no-unsafe-member-access': 'error',
    'typescript/no-unsafe-call': 'error',
    'typescript/no-unsafe-return': 'error',
    'typescript/no-unsafe-argument': 'error',
    'typescript/no-unsafe-type-assertion': 'error',
    'typescript/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
    'typescript/consistent-type-definitions': ['error', 'type'],

    /* Correctness that is easy to get wrong without a compiler error. */
    eqeqeq: ['error', 'always'],
    'no-console': 'off',
    'no-duplicate-imports': 'error',
    'typescript/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],

    /* Style */
    'func-style': ['error', 'expression'],
    'no-var': 'error',
    'prefer-const': 'error',
    'typescript/prefer-for-of': 'error',
    'import/no-cycle': 'error',

    /*
     * Opinionated test-style rules are off: this suite asserts with focused
     * expectations and does not benefit from mandatory throw messages or
     * explicitly typed `vi.fn()` mocks.
     */
    'vitest/require-to-throw-message': 'off',
    'vitest/require-mock-type-parameters': 'off',

    /* Project conventions (dev/lints/conventions.js) */
    'conventions/core-template-boundaries': 'error',
    'conventions/lib-boundaries': 'error',
    'conventions/template-isolation': 'error',
    'conventions/pure-layer-boundaries': 'error',
    'conventions/entrypoint-imports': 'error',
    'conventions/colocated-tests': 'error',
    'conventions/element-naming': 'error',
    'conventions/localized-text': 'error',
  },
  overrides: [
    {
      /*
       * The lint plugin is plain JavaScript walking a dynamic AST, so the
       * type-aware rules written for typed application code do not apply.
       */
      files: ['dev/lints/**'],
      rules: {
        'typescript/no-unsafe-argument': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-call': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-return': 'off',
        'typescript/no-unsafe-type-assertion': 'off',
      },
    },
    {
      /*
       * Declaration merging and module augmentation require `interface`.
       * Everywhere else the codebase uses `type` aliases.
       */
      files: ['src/@types/**/*.d.ts'],
      rules: {
        'typescript/consistent-type-definitions': 'off',
      },
    },
    {
      // The public entrypoint exists to re-export and register; that is its job.
      files: ['src/index.ts'],
      rules: {
        'import/no-cycle': 'off',
      },
    },
    {
      // Dev scripts run in Node and legitimately use process/console.
      files: ['dev/**/*.js'],
      rules: {
        'conventions/entrypoint-imports': 'off',
      },
    },
    {
      //
      // Layer boundaries are enforced on production code. A test may legitimately
      // compose layers (for example the core shell test mounts a real template),
      // which is the same exemption the reference harness makes for integration
      // tests. The rules still apply to every non-test module.
      //
      files: ['**/*.test.ts', 'dev/**/*.test.js'],
      rules: {
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-type-assertion': 'off',
        'conventions/core-template-boundaries': 'off',
        'conventions/lib-boundaries': 'off',
        'conventions/entrypoint-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/**', 'dist/**', 'coverage/**'],
});
