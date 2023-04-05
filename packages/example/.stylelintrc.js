const { resolve } = require('path');

module.exports = {
  plugins: ['stylelint-happy-css-modules'],
  rules: {
    'happy-css-modules/no-unused-selectors': [true, { tsConfigFilePath: resolve(__dirname, 'tsconfig.json') }],
  },
};
