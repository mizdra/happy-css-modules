import { fileURLToPath, pathToFileURL } from 'url';
import { resolve } from 'import-meta-resolve';
import type { Resolver } from './index.js';

export const nodeResolver: Resolver = async (specifier, options) => {
  return fileURLToPath(await resolve(specifier, pathToFileURL(options.request).href));
};
