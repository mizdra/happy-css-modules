import { dirname, resolve } from 'path';
import type { Resolver } from './index.js';

export const createRelativeResolver: () => Resolver = () => (specifier, options) => {
  return resolve(dirname(options.request), specifier);
};
