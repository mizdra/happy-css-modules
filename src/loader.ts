import { readFile, stat } from 'fs/promises';
import { dirname, resolve } from 'path';
import postcss from 'postcss';
import {
  getOriginalLocation,
  generateLocalTokenNames,
  parseAtImport,
  Location,
  walkByMatcher,
  parseComposesDeclarationWithFromUrl,
} from './postcss';
import { unique } from './util';

/** The value returned from the transformer. */
export type TransformResult = {
  /** The transformed code. */
  css: string;
  /** The source map from the transformed code to the original code. */
  map?: string | object;
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

type TokenImport =
  | {
      /** The `LoadResult` of the imported file. */
      fromResult: LoadResult;
      /** The import method. if `all`, import all tokens from the file. */
      type: 'all';
    }
  | {
      /** The `LoadResult` of the imported file. */
      fromResult: LoadResult;
      /** The import method. if `byNames`, import tokens from the file by the names. */
      type: 'byNames';
      /** The name of imported token. */
      names: string[];
    };

/** The result of `Loader#load`. */
export type LoadResult = {
  /** The file path of the source file. */
  filePath: string;
  /** The external tokens imported from the source file. */
  tokenImports: TokenImport[];
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
    let map: string | object | undefined;
    if (transform) {
      const result = await transform(css, filePath);
      css = result.css;
      map = result.map;
    }

    const ast = postcss.parse(css, { from: filePath, map: { inline: false, prev: map } });

    // Get the local tokens exported by the source file.
    // The tokens are fetched using `postcss-modules` plugin.
    const localTokenNames = await generateLocalTokenNames(ast);

    const importedSheetPaths: string[] = [];
    const filePathToImportedTokenNames = new Map<string, string[]>();
    const localTokens: Token[] = [];

    walkByMatcher(ast, {
      // Collect the sheets imported by `@import` rule.
      atImport: (atImport) => {
        const importedSheetPath = parseAtImport(atImport);
        if (importedSheetPath) importedSheetPaths.push(resolve(dirname(filePath), importedSheetPath));
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
      composesDeclaration: (composesDeclaration) => {
        const result = parseComposesDeclarationWithFromUrl(composesDeclaration);
        if (result) {
          const from = resolve(dirname(filePath), result.from);
          const oldTokenNames = filePathToImportedTokenNames.get(from) ?? [];
          filePathToImportedTokenNames.set(from, [...oldTokenNames, ...result.tokenNames]);
        }
      },
    });

    const filePathToTokenImport = new Map<string, TokenImport>();

    // Load imported sheets recursively.
    for (const importedSheetPath of importedSheetPaths) {
      if (filePathToTokenImport.has(importedSheetPath)) continue;
      const fromResult = await this.load(importedSheetPath, transform);
      filePathToTokenImport.set(importedSheetPath, {
        fromResult,
        type: 'all',
      });
    }

    // Load imported tokens by the names.
    for (const [filePath, tokenNames] of filePathToImportedTokenNames) {
      const tokenImport = filePathToTokenImport.get(filePath);
      if (tokenImport) {
        if (tokenImport.type === 'all') {
          // noop
        } else {
          filePathToTokenImport.set(filePath, {
            fromResult: tokenImport.fromResult,
            type: 'byNames',
            names: unique([...tokenImport.names, ...tokenNames]),
          });
        }
      } else {
        filePathToTokenImport.set(filePath, {
          fromResult: await this.load(filePath, transform),
          type: 'byNames',
          names: unique(tokenNames),
        });
      }
    }

    const result: LoadResult = {
      filePath,
      tokenImports: [...filePathToTokenImport.values()],
      localTokens,
    };
    this.cache.set(filePath, { mtime, result });
    return result;
  }
}
