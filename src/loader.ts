import { readFile, stat } from 'fs/promises';
import postcss from 'postcss';
import { getOriginalLocation, generateLocalTokenNames, parseAtImport, Location, walkByMatcher } from './postcss';

/** The value returned from the transformer. */
export type TransformResult = {
  /** The transformed code. */
  css: string;
  /** The source map from the transformed code to the original code. */
  map?: string;
};

/** The function to transform source code. */
export type Transformer = (source: string, from: string) => TransformResult | Promise<TransformResult>;

/** The exported token. */
export type Token = {
  /** The token name. */
  name: string;
  /** The original locations of the token in the source file. */
  originalLocations: Location[];
};

type CacheEntry = {
  mtime: number;
  result: LoadResult;
};

/** The result of `Loader#load`. */
export type LoadResult = {
  /** The file path of the source file. */
  filePath: string;
  /** The stylesheets imported by the source file. */
  importedSheets: LoadResult[];
  /** The tokens exported by the source file. */
  localTokens: Token[];
};

/**
 * A class inspired by `css-modules-loader-core` to collect information about css modules.
 */
export class Loader {
  private cache: Map<string, CacheEntry> = new Map();
  async load(filePath: string, transform?: Transformer): Promise<LoadResult> {
    // If cache available, return it.
    // TODO: use `@file-cache/core`
    const mtime = (await stat(filePath)).mtime.getTime();
    const cacheEntry = this.cache.get(filePath);
    if (cacheEntry && cacheEntry.mtime === mtime) return cacheEntry.result;

    let css = await readFile(filePath, 'utf-8');
    let map: string | undefined;
    if (transform) {
      const result = await transform(css, filePath);
      css = result.css;
      map = result.map;
    }

    const ast = postcss.parse(css, { from: filePath, map: { inline: false, prev: map ?? true } });

    // Get the local tokens exported by the source file.
    // The tokens are fetched using `postcss-modules` plugin.
    const localTokenNames = await generateLocalTokenNames(ast);

    const importedSheetPaths: string[] = [];
    const localTokens: Token[] = [];

    walkByMatcher(ast, {
      // Collect the sheets imported by `@import` rule.
      atImport: (atImport) => {
        const importedSheetPath = parseAtImport(atImport);
        if (importedSheetPath) importedSheetPaths.push(importedSheetPath);
      },
      // Traverse the source file to find a class selector that matches the local token.
      classSelector: (rule, classSelector) => {
        // Consider a class selector to be the origin of a token if it matches a token fetched by postcss-modules.
        // NOTE: This method has false positives. However, it works as expected in many cases.
        if (!localTokenNames.includes(classSelector.value)) return;

        const originalLocation = getOriginalLocation(rule, classSelector);

        const localToken = localTokens.find((token) => token.name === classSelector.value);
        if (localToken) {
          localToken.originalLocations.push(originalLocation);
        } else {
          localTokens.push({
            name: classSelector.value,
            originalLocations: [originalLocation],
          });
        }
      },
    });

    // Load imported sheets recursively.
    const importedSheets: LoadResult[] = [];
    for (const importedSheetPath of importedSheetPaths) {
      importedSheets.push(await this.load(importedSheetPath));
    }

    const result: LoadResult = {
      filePath,
      importedSheets,
      localTokens,
    };
    this.cache.set(filePath, { mtime, result });
    return result;
  }
}
