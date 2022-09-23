import { basename, dirname, join } from 'path';
import enhancedResolve from 'enhanced-resolve';
import { exists } from '../util.js';
import type { Resolver } from './index.js';

export type WebpackResolverOptions = {
  /**
   * The option compatible with sass's `--load-path`. It is an array of absolute paths.
   * @example ['/home/user/repository/src/styles']
   */
  sassLoadPaths?: string[] | undefined;
};

// TODO: Support `resolve.alias` for Node.js API
export const createWebpackResolver: (webpackResolverOptions?: WebpackResolverOptions | undefined) => Resolver = (
  webpackResolverOptions,
) => {
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
    modules: ['node_modules', ...(webpackResolverOptions?.sassLoadPaths ?? [])],
  });

  /**
   * A resolver compatible with less-loader.
   *
   * @see https://github.com/webpack-contrib/less-loader/blob/d74f740c100c4006b00dfb3e02c6d5aaf8713519/src/utils.js#L35-L42
   */
  const lessLoaderResolver = enhancedResolve.create.sync({
    dependencyType: 'less',
    conditionNames: ['less', 'style'],
    mainFields: ['less', 'style', 'main', '...'],
    mainFiles: ['index', '...'],
    extensions: ['.less', '.css'],
    preferRelative: true,
  });

  // NOTE: In theory, `sassLoaderResolver` should only be used when the resolver is called from `sassTransformer`.
  // However, we do not implement such behavior because it is cumbersome. If someone wants it, we will implement it.
  const resolvers = [cssLoaderResolver, sassLoaderResolver, lessLoaderResolver];

  return async (specifier, options) => {
    // `~` prefix is optional.
    // ref: https://github.com/webpack-contrib/css-loader/blob/5e6cf91fd3f0c8b5fb4b91197b98dc56abdef4bf/src/utils.js#L92-L95
    // ref: https://github.com/webpack-contrib/sass-loader/blob/49a578a218574ddc92a597c7e365b6c21960717e/src/utils.js#L368-L370
    // ref: https://github.com/webpack-contrib/less-loader/blob/d74f740c100c4006b00dfb3e02c6d5aaf8713519/src/utils.js#L72-L75
    if (specifier.startsWith('~')) specifier = specifier.slice(1);

    for (const resolver of resolvers) {
      const specifierVariants =
        resolver === sassLoaderResolver
          ? // Support partial import for sass
            // https://sass-lang.com/documentation/at-rules/import#partials
            // https://github.com/webpack-contrib/sass-loader/blob/0e9494074f69a6b6d47efea6c083a02a31a5ae84/test/sass/import-with-underscore.sass
            [join(dirname(specifier), '_' + basename(specifier)), specifier]
          : [specifier];

      for (const specifierVariant of specifierVariants) {
        try {
          const resolved = resolver(dirname(options.request), specifierVariant);
          if (resolved !== false) {
            const isExists = await exists(resolved);
            if (isExists) return resolved;
          }
        } catch (e) {
          // noop
        }
      }
    }

    return false;
  };
};
