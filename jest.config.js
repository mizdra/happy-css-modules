// @ts-check

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(test/.*|(src/.*\\.test))\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '\\.d\\.ts$', 'lib/', 'example/', 'coverage/'],
  watchPathIgnorePatterns: ['\\.d\\.ts$'],
  moduleFileExtensions: ['js', 'ts', 'json'],
};

module.exports = config;
