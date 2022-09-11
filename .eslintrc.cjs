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
              '!./test/*',
              '!../test/*',
            ],
          },
        ],
      },
    },
    {
      files: ['*.{ts,tsx,cts,mts}'],
      extends: ['@mizdra/mizdra/+typescript', '@mizdra/mizdra/+prettier'],
      parserOptions: {
        project: ['./tsconfig.src.json', './tsconfig.config.json', './tsconfig.example.json'],
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 2,
        '@typescript-eslint/consistent-type-imports': 2,
      },
    },
    {
      files: ['src/test/**/*.{ts,tsx,cts,mts}', '*.test.{ts,tsx,cts,mts}'],
      env: {
        jest: true,
      },
    },
  ],
};
