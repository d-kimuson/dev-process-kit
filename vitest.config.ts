// Resolved via pnpm workspace install (`pnpm install`).
import { defineConfig } from 'vitest/config';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __DPK_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'dev/**/*.test.{js,ts}'],
    restoreMocks: true,
  },
});
