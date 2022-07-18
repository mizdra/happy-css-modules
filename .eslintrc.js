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
      rules: {
        'import/no-extraneous-dependencies': 'error',
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
