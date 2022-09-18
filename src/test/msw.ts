import { createRequire } from 'node:module';
import type { SetupServerApi } from 'msw/node';

const require = createRequire(import.meta.url);

// NOTE: ESM edition of msw does not work in ESM environment, so import CJS edition
// ref: https://github.com/mswjs/msw/pull/1399
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { setupServer } = require('msw/node') as typeof import('msw/node');

export const server: SetupServerApi = setupServer();
