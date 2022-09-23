// NOTE: The workaround for using sass's modern API. happy-css-modules used to use this API.
// However, due to the implementation of custom resolvers, we have switched to the legacy API.
// Therefore, the workaround is now disabled. See
// https://github.com/mizdra/happy-css-modules/issues/65#issuecomment-1229471950 for more information.

import type { LegacyResult } from 'sass';
import type { Transformer, TransformerOptions } from './index.js';
import { handleImportError } from './index.js';

async function renderSass(sass: typeof import('sass'), source: string, options: TransformerOptions) {
  return new Promise<LegacyResult>((resolve, reject) => {
    sass.render(
      {
        data: source,
        file: options.from,
        outFile: 'DUMMY', // Required for sourcemap output.
        sourceMap: true,
        importer: (url, prev, done) => {
          options
            .resolver(url, { request: prev })
            .then((resolved) => done({ file: resolved }))
            .catch((e) => done(e));
        },
      },
      (exception, result) => {
        if (exception) {
          reject(exception);
        } else {
          resolve(result!);
        }
      },
    );
  });
}

export const createScssTransformer: () => Transformer = () => {
  let sass: typeof import('sass');
  return async (source, options) => {
    sass ??= (await import('sass').catch(handleImportError('sass'))).default;
    const result = await renderSass(sass, source, options);
    return { css: result.css.toString(), map: result.map!.toString(), dependencies: result.stats.includedFiles };
  };
};
