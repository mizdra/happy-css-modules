import { dirname } from 'path';
import enhancedResolve from 'enhanced-resolve';
import { exists } from '../util.js';
import type { Resolver } from './index.js';

/**
 * A resolver compatible with css-loader.
 *
 * @see https://github.com/webpack-contrib/css-loader/blob/897e7dd250ccdb0d31e6c66d4cd0d009f2022a85/src/plugins/postcss-import-parser.js#L228-L235
 */
const cssLoaderResolver = enhancedResolve.create.sync({
  dependencyType: 'css',
  conditionNames: ['style'],
  // We are not sure how "..." affects behavior...
  mainFields: ['css', 'style', 'main', '...'],
  mainFiles: ['index', '...'],
  extensions: ['.css', '...'],
  preferRelative: true,
});

/**
 * A resolver compatible with sass-loader.
 *
 * @see https://github.com/webpack-contrib/sass-loader/blob/49a578a218574ddc92a597c7e365b6c21960717e/src/utils.js#L531-L539
 */
const sassLoaderResolver = enhancedResolve.create.sync({
  dependencyType: 'sass',
  conditionNames: ['sass', 'style'],
  mainFields: ['sass', 'style', 'main', '...'],
  mainFiles: ['_index', 'index', '...'],
  extensions: ['.sass', '.scss', '.css'],
  restrictions: [/\.((sa|sc|c)ss)$/i],
  preferRelative: true,
});

// TODO: Support `resolve.alias` for Node.js API
export const webpackResolver: Resolver = async (specifier, options) => {
  // `~` prefix is optional.
  // ref: https://github.com/webpack-contrib/less-loader/tree/454e187f58046356c3d383d67fda763db8bfc528#webpack-resolver
  if (specifier.startsWith('~')) specifier = specifier.slice(1);

  // NOTE: In theory, `sassLoaderResolver` should only be used when the resolver is called from `sassTransformer`.
  // However, we do not implement such behavior because it is cumbersome. If someone wants it, we will implement it.
  // TODO: support resolve algorithm of less-loader
  const resolvers = [cssLoaderResolver, sassLoaderResolver];
  for (const resolver of resolvers) {
    try {
      const resolved = resolver(dirname(options.request), specifier);
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
