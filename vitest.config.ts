// Resolved via pnpm workspace install (`pnpm install`).
import { defineConfig } from 'vitest/config';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __DPK_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'happy-dom',
    // `scripts/**` holds the release tooling; its tests cover the channel decisions
    // (where a build goes, how it is cached, how its documentation is addressed).
    include: ['src/**/*.test.ts', 'dev/**/*.test.{js,ts}', 'scripts/**/*.test.ts'],
    restoreMocks: true,
  },
});
