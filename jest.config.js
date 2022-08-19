// @ts-check

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/test/**/*.spec.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '\\.d\\.ts$', 'dist/', 'example/', 'coverage/'],
  watchPathIgnorePatterns: ['\\.d\\.ts$'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};

module.exports = config;
