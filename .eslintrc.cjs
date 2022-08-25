// @ts-check

/** @type import('eslint').Linter.BaseConfig */
module.exports = {
  root: true,
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.src.json', './tsconfig.test.json'],
      },
    },
  },
  overrides: [
    {
      files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}'],
      extends: ['@mizdra/mizdra', '@mizdra/mizdra/+prettier'],
      env: {
        node: true,
      },
      rules: {
        'import/no-internal-modules': [
          'error',
          {
            allow: [
              '**/util.js',
              '**/loader/index.js',
              '**/emitter/index.js',
              '**/library/*/index.js',
              '**/dist/index.js',
              'yargs/*',
            ],
          },
        ],
      },
    },
    {
      files: ['*.{ts,tsx,cts,mts}'],
      extends: ['@mizdra/mizdra/+typescript', '@mizdra/mizdra/+prettier'],
      parserOptions: {
        project: ['./tsconfig.src.json', './tsconfig.test.json'],
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 2,
        '@typescript-eslint/consistent-type-imports': 2,
      },
    },
    {
      files: ['test/**/*.{ts,tsx,cts,mts}'],
      env: {
        jest: true,
      },
    },
  ],
};
