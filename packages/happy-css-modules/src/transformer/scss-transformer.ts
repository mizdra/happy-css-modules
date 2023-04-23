// NOTE: The workaround for using sass's modern API. happy-css-modules used to use this API.
// However, due to the implementation of custom resolvers, we have switched to the legacy API.
// Therefore, the workaround is now disabled. See
// https://github.com/mizdra/happy-css-modules/issues/65#issuecomment-1229471950 for more information.

import type { LegacyOptions, LegacyResult } from 'sass';
import type { Transformer } from './index.js';
import { handleImportError } from './index.js';

// For some reason, `util.promisify` does not work. Therefore, use the original promisify.
function promisifySassRender(sass: typeof import('sass')) {
  return async (options: LegacyOptions<'async'>) => {
    return new Promise<LegacyResult>((resolve, reject) => {
      sass.render(options, (exception, result) => {
        if (exception) reject(exception);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        else resolve(result!);
      });
    });
  };
}

export const createScssTransformer: () => Transformer = () => {
  let sass: typeof import('sass');
  return async (source, options) => {
    sass ??= (await import('sass').catch(handleImportError('sass'))).default;
    const render = promisifySassRender(sass);
    const result = await render({
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
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { css: result.css.toString(), map: result.map!.toString(), dependencies: result.stats.includedFiles };
  };
};
