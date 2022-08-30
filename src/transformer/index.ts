import type { LegacyResult } from 'sass';
import { type Transformer } from '../loader/index.js';

// NOTE: The workaround for using sass's modern API. enhanced-typed-css-modules used to use this API.
// However, due to the implementation of custom resolvers, we have switched to the legacy API.
// Therefore, the workaround is now disabled. See
// https://github.com/mizdra/enhanced-typed-css-modules/issues/65#issuecomment-1229471950 for more information.

// const IS_JEST_ENVIRONMENT = process.env.JEST_WORKER_ID !== undefined;

// function verifyJestEnvironment() {
//   if (
//     !(
//       'window' in global &&
//       'location' in global &&
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       'href' in (global as any).location &&
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       typeof (global as any).location.href === 'string' &&
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       (global as any).location.href.startsWith('http://')
//     )
//   ) {
//     throw new Error(
//       'To use dart-sass with jest, dummy `global.window` and `global.location.href` must be set. See https://github.com/sass/dart-sass/issues/1692#issuecomment-1229219993 .',
//     );
//   }
// }

// const createImporterForJest: (from: string) => Importer<'async'> = (from) => ({
//   canonicalize(url) {
//     // NOTE: The format of `url` changes depending on the import source.
//     //
//     // - When `from === '/test/1.scss'` and `@import './2.scss'` in `/test/1.scss` is resolved, `url === '2.scss'`.
//     // - When `from === '/test/1.scss'` and `@import './3.scss'` in `/test/2.scss` is resolved, `url === 'file:///test/3.scss'`.
//     //
//     // That is, the paths of @import statements written to the `from` file is passed through unresolved,
//     // but paths written to other files is passed through resolved to absolute paths.
//     return new URL(url, pathToFileURL(from));
//   },
//   async load(canonicalUrl) {
//     return {
//       contents: await readFile(fileURLToPath(canonicalUrl.href), 'utf8'),
//       syntax: 'scss',
//       sourceMapUrl: canonicalUrl,
//     };
//   },
// });

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
async function renderSass(sass: typeof import('sass'), source: string, from: string) {
  return new Promise<LegacyResult>((resolve, reject) => {
    sass.render(
      {
        data: source,
        file: from,
        outFile: 'DUMMY', // Required for sourcemap output.
        sourceMap: true,
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

const handleImportError = (packageName: string) => (e: unknown) => {
  console.error(`${packageName} import failed. Did you forget to \`npm install -D ${packageName}\`?`);
  throw e;
};

export const defaultTransformer: Transformer = async (source, from) => {
  if (from.endsWith('.scss')) {
    const sass = await import('sass').catch(handleImportError('sass'));
    const result = await renderSass(sass.default, source, from);
    return { css: result.css.toString(), map: result.map!.toString(), dependencies: result.stats.includedFiles };

    // if (IS_JEST_ENVIRONMENT) verifyJestEnvironment();
    // const result = await sass.default.compileStringAsync(source, {
    //   url: pathToFileURL(from),
    //   sourceMap: true,
    //   importers: IS_JEST_ENVIRONMENT ? [createImporterForJest(from)] : [],
    // });
    // return { css: result.css, map: result.sourceMap!, dependencies: result.loadedUrls };
  } else if (from.endsWith('.less')) {
    const less = await import('less').catch(handleImportError('less'));
    const result = await less.default.render(source, {
      filename: from,
      sourceMap: {},
    });
    return { css: result.css, map: result.map, dependencies: result.imports };
  }
  // TODO: support postcss
  return false;
};
