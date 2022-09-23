// @ts-check

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  // for ESM
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Map `./**/xxx.js` to `./**/xxx` (for ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // for ESM
  resolver: join(dir, 'src/test/jest/resolver.cjs'),
};

// eslint-disable-next-line import/no-default-export
export default config;
