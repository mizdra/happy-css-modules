import { dirname } from 'path';
import enhancedResolve from 'enhanced-resolve';
import type { Resolver } from './index.js';

/**
 * A resolver compatible with css-loader.
 *
 * @see https://github.com/webpack-contrib/css-loader/blob/897e7dd250ccdb0d31e6c66d4cd0d009f2022a85/src/plugins/postcss-import-parser.js#L228-L235
 */
// TODO: support resolve algorithm of sass-loader and less-loader
const resolve = enhancedResolve.create.sync({
  dependencyType: 'css',
  conditionNames: ['style'],
  // We are not sure how "..." affects behavior...
  mainFields: ['css', 'style', 'main', '...'],
  mainFiles: ['index', '...'],
  extensions: ['.css', '...'],
  preferRelative: true,
});

// TODO: Support `resolve.alias` for Node.js API
export const webpackResolver: Resolver = (specifier, options) => {
  // `~` prefix is optional.
  // ref: https://github.com/webpack-contrib/less-loader/tree/454e187f58046356c3d383d67fda763db8bfc528#webpack-resolver
  if (specifier.startsWith('~')) specifier = specifier.slice(1);

  return resolve(dirname(options.request), specifier);
};
