// @ts-check

/** @type import('eslint').Linter.BaseConfig */
module.exports = {
  root: true,
  overrides: [
    {
      files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}'],
      extends: ['@mizdra/mizdra', '@mizdra/mizdra/+prettier'],
      env: {
        node: true,
      },
      reportUnusedDisableDirectives: true,
      rules: {
        'no-console': 2,
        // disable because this rule do not support ESM in TypeScript.
        // ref: https://github.com/import-js/eslint-plugin-import/issues/2170
        'import/no-unresolved': 'off',
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
    {
      files: ['*.{ts,tsx,cts,mts}'],
      extends: ['@mizdra/mizdra/+typescript', '@mizdra/mizdra/+prettier'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 2,
        '@typescript-eslint/consistent-type-imports': [2, { disallowTypeAnnotations: false }],
      },
    },
    {
      files: ['src/test-util/**/*.{ts,tsx,cts,mts}', '*.test.{ts,tsx,cts,mts}'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 0,
      },
    },
  ],
};
