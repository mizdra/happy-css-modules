import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Some tests have snapshots containing a `//# sourceMappingURL=*.css.d.ts.map` magic comment.
// Vite misinterprets it as a real source map reference and warns that it cannot read the
// (non-existent) map file. Suppress this false-positive warning.
//
// `customLogger` option cannot be used because Vitest overwrites it internally, so wrap the resolved
// logger in `configResolved` instead.
const suppressSourceMapWarning: Plugin = {
  name: 'suppress-source-map-warning',
  configResolved(config) {
    const originalWarn = config.logger.warn.bind(config.logger);
    config.logger.warn = (msg, options) => {
      if (msg.includes('Failed to load source map') && msg.includes('.css.d.ts.map')) {
        return;
      }
      originalWarn(msg, options);
    };
  },
};

export default defineConfig({
  plugins: [suppressSourceMapWarning],
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
