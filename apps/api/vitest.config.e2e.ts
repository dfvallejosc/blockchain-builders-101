import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Runs the pending migrations once, so every e2e suite finds its tables.
    globalSetup: ['./test/setup-database.ts'],
  },
});
