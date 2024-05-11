// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const nativeModule = require('node:module');

// workaround for https://github.com/facebook/jest/issues/12270#issuecomment-1194746382

/**
 * @typedef {{
 * basedir: string;
 * conditions?: Array<string>;
 * defaultResolver: (path: string, options: ResolverOptions) => string;
 * extensions?: Array<string>;
 * moduleDirectory?: Array<string>;
 * paths?: Array<string>;
 * packageFilter?: (pkg: any, file: string, dir: string) => any;
 * pathFilter?: (pkg: any, path: string, relativePath: string) => string;
 * rootDir?: string;
 * }} ResolverOptions
 */

/** @type {(path: string, options: ResolverOptions) => string} */
function resolver(module, options) {
  const { basedir, defaultResolver } = options;
  try {
    return defaultResolver(module, options);
    // eslint-disable-next-line no-unused-vars
  } catch (_error) {
    return nativeModule.createRequire(basedir).resolve(module);
  }
}

module.exports = resolver;
