import { exists } from '../util.js';
import { createNodeResolver } from './node-resolver.js';
import { createRelativeResolver } from './relative-resolver.js';
import { createWebpackResolver } from './webpack-resolver.js';

export type ResolverOptions = {
  request: string;
};

/**
 * The function to resolve the path of the imported file.
 * @returns The resolved path of the imported file. `false` means to skip resolving.
 * */
export type Resolver = (specifier: string, options: ResolverOptions) => string | false | Promise<string | false>;

/**
 * The Default resolver.
 *
 * This resolver implements a resolve algorithm that is as compatible as possible with the major toolchains,
 * including Node.js, webpack (css-loader, sass-loader, less-loader) and vite. It is difficult to completely
 * mimic the behavior of these toolchains, so the behavior may differ in some cases.
 *
 * @param specifier The specifier to resolve (i.e. './foo.css', '~bootstrap', etc.)
 * @param options The options to resolve
 * @returns The resolved path (absolute). `false` means to skip resolving.
 */
export const createDefaultResolver: () => Resolver = () => {
  const relativeResolver = createRelativeResolver();
  const nodeResolver = createNodeResolver();
  const webpackResolver = createWebpackResolver();

  // In less-loader, `relativeResolver` has priority over `webpackResolver`.
  // happy-css-modules follows suit.
  // ref: https://github.com/webpack-contrib/sass-loader/blob/49a578a218574ddc92a597c7e365b6c21960717e/src/utils.js#L588-L596
  // ref: https://github.com/webpack-contrib/less-loader/tree/454e187f58046356c3d383d67fda763db8bfc528#webpack-resolver
  const resolvers = [relativeResolver, nodeResolver, webpackResolver];

  return async (specifier, options) => {
    for (const resolver of resolvers) {
      try {
        const resolved = await resolver(specifier, options);
        if (resolved !== false) {
          const isExists = await exists(resolved);
          if (isExists) return resolved;
        }
      } catch (e) {
        // noop
      }
    }
    return false;
  };
};
