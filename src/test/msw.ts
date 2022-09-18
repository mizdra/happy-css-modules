import type { SetupServerApi } from 'msw/node';
import { setupServer } from 'msw/node';

export const server: SetupServerApi = setupServer();
