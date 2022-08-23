// @ts-check

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // for ESM
  // @ts-expect-error
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Map `./**/xxx.js` to `./**/xxx` (for ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
};

// eslint-disable-next-line import/no-default-export
export default config;
