// Resolved via pnpm workspace install (`pnpm install`).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'dev/**/*.test.{js,ts}'],
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
