import mizdra from '@mizdra/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [mizdra.base, mizdra.typescript, mizdra.node],
  ignorePatterns: [
    '**/*.css.d.ts',
    'packages/example',
    'docs/how-does-definition-jumps-work',
    'packages/happy-css-modules/bin/**',
  ],
  rules: {
    'no-console': 'error',
    'typescript/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
  },
  overrides: [
    {
      files: ['**/*.test.{ts,tsx,cts,mts}', '**/test-util/**/*.{ts,tsx,cts,mts}'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['packages/happy-css-modules/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              './*/*',
              '../*/*',
              '!./*.js',
              '!../*.js',
              '!./*/index.js',
              '!../*/index.js',
              '!./*/util.js',
              '!../*/util.js',
              '!./library/*',
              '!../library/*',
              '!./test-util/*',
              '!../test-util/*',
            ],
          },
        ],
      },
    },
  ],
});
