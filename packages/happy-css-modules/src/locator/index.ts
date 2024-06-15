import { readFile, stat } from 'fs/promises';
import postcss from 'postcss';
import type { Resolver } from '../resolver/index.js';
import { createDefaultResolver } from '../resolver/index.js';
import { createDefaultTransformer, type Transformer } from '../transformer/index.js';
import { unique } from '../util.js';
import { getOriginalLocation, generateLocalTokenNames, parseAtImport, type Location, collectNodes } from './postcss.js';

export { collectNodes, type Location } from './postcss.js';

/**
 * Whether the specifier should be ignored.
 * For example, specifiers starting with `http://` or `https://` should be ignored.
 */
function isIgnoredSpecifier(specifier: string): boolean {
  return specifier.startsWith('http://') || specifier.startsWith('https://');
}

/**
 * The token defined in the file.
 * @example 'class' of `.class {}`
 * @example 'val' of `@value val: #000;`
 */
export type LocalToken = {
  type: 'localToken';
  name: string;
  /** The original location of the token in the source file. */
  originalLocation: Location;
};

/**
 * The all tokens imported from other CSS Modules files.
 * @example `@import './file.css';`.
 */
export type ImportedAllTokensFromModule = {
  type: 'importedAllTokensFromModule';
  filePath: string;
};

/** The exported token info. */
export type TokenInfo = LocalToken | ImportedAllTokensFromModule;

type CacheEntry = {
  mtime: number; // TODO: `--cache-strategy` option will allow you to switch between `content` and `metadata` modes.
  result: LoadResult;
};

/** The result of `Locator#load`. */
export type LoadResult = {
  /** The information of the exported tokens from CSS Modules files. */
  tokenInfos: TokenInfo[];
  /** The path to the dependent files needed to transpile that file. */
  transpileDependencies: string[];
};

export type LocatorOptions = {
  /** The function to transform source code. */
  transformer?: Transformer | undefined;
  /** The function to resolve the path of the imported file. */
  resolver?: Resolver | undefined;
};

/** The resolver that throws an exception if resolving fails. */
export type StrictlyResolver = (...args: Parameters<Resolver>) => Promise<string>;

/** This class collects information on tokens exported from CSS Modules files. */
export class Locator {
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly transformer: Transformer | undefined;
  private readonly resolver: StrictlyResolver;

  constructor(options?: LocatorOptions) {
    this.transformer = options?.transformer ?? createDefaultTransformer();
    this.resolver = async (specifier, resolverOptions) => {
      const resolver = options?.resolver ?? createDefaultResolver();
      const resolved = await resolver(specifier, resolverOptions);
      if (resolved === false) throw new Error(`Could not resolve '${specifier}' in '${resolverOptions.request}'.`);
      return resolved;
    };
  }

  /**
   * Reads the source file and returns the code.
   * If transformer is specified, the code is transformed before returning.
   */
  private async readCSS(
    filePath: string,
  ): Promise<
    | { css: string; map: undefined; dependencies: string[] }
    | { css: string; map: string | object | undefined; dependencies: string[] }
  > {
    const css = await readFile(filePath, 'utf-8');
    if (!this.transformer) return { css, map: undefined, dependencies: [] };
    const result = await this.transformer(css, { from: filePath, resolver: this.resolver, isIgnoredSpecifier });
    if (result === false) return { css, map: undefined, dependencies: [] };
    return {
      css: result.css,
      map: result.map,
      dependencies: result.dependencies
        .map((dep) => {
          if (typeof dep === 'string') return dep;
          if (dep.protocol !== 'file:') throw new Error(`Unsupported protocol: ${dep.protocol}`);
          return dep.pathname;
        })
        .filter((dep) => {
          // less makes a remote module inline, so it may be included in dependencies.
          // However, the dependencies field of happy-css-modules is not yet designed to store http protocol URLs.
          // Therefore, we exclude them from the dependencies field for now.
          return !isIgnoredSpecifier(dep);
        }),
    };
  }

  /** Returns information about the tokens exported from the CSS Modules file. */
  async load(filePath: string): Promise<LoadResult> {
    const mtime = (await stat(filePath)).mtime.getTime();

    const { css, map, dependencies: transpileDependencies } = await this.readCSS(filePath);

    const ast = postcss.parse(css, { from: filePath, map: map ? { inline: false, prev: map } : { inline: false } });

    // Get the local tokens exported by the source file.
    // The tokens are fetched using `postcss-modules` plugin.
    const localTokenNames = await generateLocalTokenNames(ast);

    const tokenInfos: TokenInfo[] = [];

    const { atImports, classSelectors } = collectNodes(ast);

    // Handle `@import`.
    for (const atImport of atImports) {
      const importedSheetPath = parseAtImport(atImport);
      if (!importedSheetPath) continue;
      if (isIgnoredSpecifier(importedSheetPath)) continue;
      // eslint-disable-next-line no-await-in-loop
      const from = await this.resolver(importedSheetPath, { request: filePath });
      tokenInfos.push({
        type: 'importedAllTokensFromModule',
        filePath: from,
      });
    }

    // Handle `.class {}` and `@value val: #000;`.
    // Traverse the source file to find a class selector that matches the local token.
    for (const { rule, classSelector } of classSelectors) {
      // Consider a class selector to be the origin of a token if it matches a token fetched by postcss-modules.
      // NOTE: This method has false positives. However, it works as expected in many cases.
      if (!localTokenNames.includes(classSelector.value)) continue;

      const originalLocation = getOriginalLocation(rule, classSelector);

      tokenInfos.push({
        type: 'localToken',
        name: classSelector.value,
        originalLocation,
      });
    }

    const result: LoadResult = {
      transpileDependencies: unique(transpileDependencies).filter((dep) => dep !== filePath),
      tokenInfos,
    };
    this.cache.set(filePath, { mtime, result });
    return result;
  }
}
