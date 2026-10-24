// Resolved via pnpm workspace install (`pnpm install`).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'dev/**/*.test.{js,ts}'],
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    // Several tests drive a full DOM simulation for 1–2s on an idle machine;
    // under Vitest's parallel file workers they can exceed the 5s default and
    // fail as a timeout while passing in isolation. The tests are behavioural,
    // not timing ratchets, so give them room.
    testTimeout: 15_000,
  },
});
