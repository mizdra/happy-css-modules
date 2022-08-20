// @ts-check

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  moduleFileExtensions: ['js', 'ts', 'json'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  globals: {
    // TODO: Use ESM + babel-jest
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};

module.exports = config;
