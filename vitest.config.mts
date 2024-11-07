import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts?(x)'],
    setupFiles: ['vitest.setup.ts'],
    globals: true,
  },
});
