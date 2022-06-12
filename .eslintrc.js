// @ts-check

/** @type import('eslint').Linter.BaseConfig */
module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.{ts,tsx,cts,mts}'],
      extends: ['@mizdra/mizdra', '@mizdra/mizdra/+typescript', '@mizdra/mizdra/+prettier'],
      env: {
        node: true,
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
