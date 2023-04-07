// @ts-check

const { resolve } = require('path');

/** @type {import('stylelint').Config} */
module.exports = {
  plugins: ['stylelint-happy-css-modules'],
  overrides: [
    { files: ['**/*.scss'], customSyntax: require('postcss-scss') },
    { files: ['**/*.less'], customSyntax: require('postcss-less') },
  ],
  rules: {
    'happy-css-modules/no-unused-selectors': [true, { tsConfigFilePath: resolve(__dirname, 'tsconfig.json') }],
  },
};
