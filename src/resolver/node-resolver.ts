import { resolve as importMetaResolve } from 'import-meta-resolve';
import type { Resolver } from './index.js';

export const createNodeResolver: () => Resolver = () => async (specifier, options) => {
  try {
    return await importMetaResolve(specifier, options.request);
  } catch (error) {
    return false;
  }
};
