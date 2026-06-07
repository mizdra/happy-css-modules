import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Resolver } from './index.js';

export const createNodeResolver: () => Resolver = () => (specifier, options) => {
  return fileURLToPath(import.meta.resolve(specifier, pathToFileURL(options.request).href));
};
