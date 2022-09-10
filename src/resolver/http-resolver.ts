import type { Resolver } from './index.js';

export const createHTTPResolver: () => Resolver = () => (specifier) => {
  if (!(specifier.startsWith('http://') || specifier.startsWith('https://'))) return false;
  return specifier;
};
