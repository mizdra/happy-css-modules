import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // oxlint-disable-next-line unicorn/no-useless-spread
      ...(process.env['LESS_VERSION'] ? { less: `less-${process.env['LESS_VERSION']}` } : {}),
    },
  },
  test: {
    include: ['src/**/*.test.ts?(x)'],
    globals: true,
  },
});
