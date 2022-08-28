// @ts-check

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  // for ESM
  // @ts-expect-error
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Map `./**/xxx.js` to `./**/xxx` (for ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globals: {
    /**
     * I have a problem with dart-sass not working in Jest (ref: https://github.com/sass/dart-sass/issues/1692).
     * The community believes that JS Symbols inserted by Jest triggers https://github.com/dart-lang/sdk/issues/47670,
     * which in turn causes a problem with dart-sass.
     *
     * A known workaround for this problem is to switch Jest's test environment to
     * https://github.com/kayahr/jest-environment-node-single-context. The problem is solved,
     * perhaps because the Symbol is no longer inserted. However, this test environment is also known
     * to not work in some situations (ref: https://github.com/kayahr/jest-environment-node-single-context/issues/10).
     *
     * So we use another workaround. For reasons unknown, dart-sass does not cause https://github.com/dart-lang/sdk/issues/47670
     * in the browser environment. So first, we implement a fake `window` object to disguise the browser environment.
     * (ref: https://github.com/mbullington/node_preamble.dart/blob/3c83ba0887fb64424d3336338da393e4f0eecbf4/lib/preamble.js#L4)
     *
     * Next, we implement a fake `location.href`, which is necessary because dart-sass gets base path from `location.href`.
     *
     * Finally, we pass a importer when we call `sass.compileString`. Since we are disguising the test environment as a browser,
     * as is, dart-sass will try to resolve the path with the browser's path resolution algorithm. However, it fails.
     * Therefore, we need to pass an importer that resolves the path with the Node.js's path resolution algorithm.
     *
     * This is a very dirty workaround, but we think it is a good one until https://github.com/dart-lang/sdk/issues/47670
     * resolves the issue. :)
     */
    // NOTE: The workaround for using sass's modern API. enhanced-typed-css-modules used to use this API.
    // However, due to the implementation of custom resolvers, we have switched to the legacy API.
    // Therefore, the workaround is now disabled. See
    // https://github.com/mizdra/enhanced-typed-css-modules/issues/65#issuecomment-1229471950 for more information.
    // window: {},
    // location: {
    //   href: 'http://localhost',
    // },
  },
  // for ESM
  resolver: join(dir, 'src/test/jest/resolver.cjs'),
};

// eslint-disable-next-line import/no-default-export
export default config;
