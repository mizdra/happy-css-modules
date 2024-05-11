// @ts-check

// @ts-expect-error
import { FlatCompat } from '@eslint/eslintrc';
// @ts-expect-error
import js from '@eslint/js';

const __dirname = new URL('.', import.meta.url).pathname;

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
// eslint-disable-next-line import/no-default-export
export default [
  { ignores: ['**/dist', '**/*.css.d.ts', 'packages/example', 'docs/how-does-definition-jumps-work'] },
  // NOTE: This is a hack that allows eslint-plugin-import to work with flat config.
  // ref: https://github.com/import-js/eslint-plugin-import/issues/2556#issuecomment-1419518561
  {
    languageOptions: {
      parserOptions: {
        // Eslint doesn't supply ecmaVersion in `parser.js` `context.parserOptions`
        // This is required to avoid ecmaVersion < 2015 error or 'import' / 'export' error
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    settings: {
      // This will do the trick
      'import/parsers': {
        espree: ['.js', '.cjs', '.mjs', '.jsx'],
      },
    },
  },
  ...compat.extends('@mizdra/mizdra', '@mizdra/mizdra/+typescript', '@mizdra/mizdra/+prettier'),
  ...compat.env({
    node: true,
  }),
  {
    rules: {
      // disable because this rule do not support ESM in TypeScript.
      // ref: https://github.com/import-js/eslint-plugin-import/issues/2170
      'import/no-unresolved': 'off',
      // MEMO: It doesn't work for some reason, so disable it...
      // 'import/no-extraneous-dependencies': [
      //   'error',
      //   {
      //     includeTypes: true,
      //     packageDir: [
      //       __dirname,
      //       join(__dirname, 'happy-css-modules'),
      //       join(__dirname, 'stylelint-happy-css-modules'),
      //       join(__dirname, 'example'),
      //     ],
      //   },
      // ],
      'no-console': 2,
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.json', 'example/tsconfig.json'],
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [2, { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [2, { disallowTypeAnnotations: false }],
      '@typescript-eslint/no-non-null-assertion': 0,
    },
  },
  ...compat.env({
    files: ['src/test-util/**/*.{ts,tsx,cts,mts}', '*.test.{ts,tsx,cts,mts}'],
    env: {
      jest: true,
    },
    rules: {
      'no-console': 0,
    },
  }),
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
];
