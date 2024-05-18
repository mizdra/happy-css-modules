import { fileURLToPath, pathToFileURL } from 'url';
import { resolve } from 'import-meta-resolve';
import type { Resolver } from './index.js';

export const createNodeResolver: () => Resolver = () => (specifier, options) => {
  return fileURLToPath(resolve(specifier, pathToFileURL(options.request).href));
};
