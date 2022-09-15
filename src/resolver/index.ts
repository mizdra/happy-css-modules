import { createNodeResolver } from './node-resolver.js';
import { createRelativeResolver } from './relative-resolver.js';
import { isAbsoluteURL } from './util.js';
import { createWebpackResolver } from './webpack-resolver.js';

export type ResolverOptions = {
  /**
   * The absolute URL of importing file.
   * @example 'file:///path/to/file.css'
   * @example 'https://example.com/path/to/file.css'
   * */
  request: string;
};

/**
 * The function to resolve the specifier of import statement.
 * @param specifier The specifier to resolve (i.e. './foo.css', '~bootstrap', etc.)
 * @param options The options to resolve
 * @returns The absolute URL. `false` means to skip resolving.
 * */
export type Resolver = (specifier: string, options: ResolverOptions) => string | false | Promise<string | false>;

/**
 * The Default resolver.
 *
 * This resolver implements a resolve algorithm that is as compatible as possible with the major toolchains,
 * including Node.js, webpack (css-loader, sass-loader, less-loader) and vite. It is difficult to completely
 * mimic the behavior of the toolchain, so the behavior may differ in some cases.
 */
export const createDefaultResolver: () => Resolver = () => async (specifier, options) => {
  if (isAbsoluteURL(specifier)) return specifier;

  const relativeResolver = createRelativeResolver();
  const nodeResolver = createNodeResolver();
  const webpackResolver = createWebpackResolver();

  // In less-loader, `relativeResolver` has priority over `webpackResolver`.
  // happy-css-modules follows suit.
  // ref: https://github.com/webpack-contrib/less-loader/tree/454e187f58046356c3d383d67fda763db8bfc528#webpack-resolver
  const resolvers = [relativeResolver, nodeResolver, webpackResolver];
  for (const resolver of resolvers) {
    const resolved = await resolver(specifier, options);
    if (resolved !== false) return resolved;
  }
  return false;
};
