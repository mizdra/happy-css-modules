import { fileURLToPath, pathToFileURL } from 'url';
import postcss from 'postcss';
import type { Resolver } from '../resolver/index.js';
import { createDefaultResolver } from '../resolver/index.js';
import { createDefaultTransformer, type Transformer } from '../transformer/index.js';
import { unique, uniqueBy } from '../util.js';
import {
  getOriginalLocation,
  generateLocalTokenNames,
  parseAtImport,
  type Location,
  parseComposesDeclarationWithFromUrl,
  collectNodes,
} from './postcss.js';
import { fetchContent, fetchRevision, isURL } from './util.js';

export { collectNodes, type Location } from './postcss.js';

/**
 * Whether the specifier should be ignored.
 * For example, specifiers starting with `http://` or `https://` should be ignored.
 */
function isIgnoredSpecifier(specifier: string): boolean {
  return specifier.startsWith('http://') || specifier.startsWith('https://');
}

/** The exported token. */
export type Token = {
  /** The token name. */
  name: string;
  /** The original locations of the token in the source file. */
  originalLocations: Location[];
};

type CacheEntry = {
  revision: string;
  result: LoadResult;
};

/** The result of `Loader#load`. */
export type LoadResult = {
  /**
   * The URL of the file imported from the source file with `@import` or `composes`.
   * This includes both direct imports and indirect imports by the file.
   * */
  dependencies: string[];
  /** The tokens exported by the source file. */
  tokens: Token[];
};

function normalizeTokens(tokens: Token[]): Token[] {
  const tokenNameToOriginalLocations = new Map<string, Location[]>();
  for (const token of tokens) {
    tokenNameToOriginalLocations.set(
      token.name,
      uniqueBy([...(tokenNameToOriginalLocations.get(token.name) ?? []), ...token.originalLocations], (location) =>
        JSON.stringify(location),
      ),
    );
  }
  return Array.from(tokenNameToOriginalLocations.entries()).map(([name, originalLocations]) => ({
    name,
    originalLocations,
  }));
}

export type LoaderOptions = {
  /** The function to transform source code. */
  transformer?: Transformer | undefined;
  /** The function to resolve the path of the imported file. */
  resolver?: Resolver | undefined;
};

/** The resolver that throws an exception if resolving fails. */
export type StrictlyResolver = (...args: Parameters<Resolver>) => Promise<string>;

/** This class collects information on tokens exported from CSS Modules files. */
export class Loader {
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly transformer: Transformer | undefined;
  private readonly resolver: StrictlyResolver;

  constructor(options?: LoaderOptions) {
    this.transformer = options?.transformer ?? createDefaultTransformer();
    this.resolver = async (specifier, resolverOptions) => {
      const resolver = options?.resolver ?? createDefaultResolver();
      const resolved = await resolver(specifier, resolverOptions);
      if (resolved === false) throw new Error(`Could not resolve '${specifier}' in '${resolverOptions.request}'.`);
      return resolved;
    };
  }

  /** Returns `true` if the cache is outdated. */
  private async isCacheOutdated(fileURL: string): Promise<boolean> {
    const entry = this.cache.get(fileURL);
    if (!entry) return true;
    const revision = await fetchRevision(fileURL);
    if (entry.revision !== revision) return true;

    const { dependencies } = entry.result;
    for (const dependency of dependencies) {
      const entry = this.cache.get(dependency);
      if (!entry) return true;
      const revision = await fetchRevision(dependency);
      if (entry.revision !== revision) return true;
    }
    return false;
  }

  /**
   * Reads the source file and returns the code.
   * If transformer is specified, the code is transformed before returning.
   */
  private async fetchCSS(
    fileURL: string,
  ): Promise<
    | { css: string; map: undefined; dependencies: string[] }
    | { css: string; map: string | object | undefined; dependencies: string[] }
  > {
    const css = await fetchContent(fileURL);
    if (!this.transformer) return { css, map: undefined, dependencies: [] };
    const result = await this.transformer(css, {
      // TODO: Support http/https protocol in Transformer.
      from: fileURLToPath(fileURL),
      resolver: this.resolver,
      isIgnoredSpecifier,
    });
    if (result === false) return { css, map: undefined, dependencies: [] };
    return {
      css: result.css,
      map: result.map,
      dependencies: result.dependencies.map((dep) => {
        if (typeof dep === 'string') {
          if (isURL(dep)) {
            return dep;
          } else {
            return pathToFileURL(dep).href;
          }
        } else {
          return dep.href;
        }
      }),
    };
  }

  /** Returns information about the tokens exported from the CSS Modules file. */
  async load(fileURL: string): Promise<LoadResult> {
    // NOTE: Loader does not support concurrent calls.
    // TODO: Throw an error if called concurrently.
    if (!(await this.isCacheOutdated(fileURL))) {
      const cacheEntry = this.cache.get(fileURL)!;
      return cacheEntry.result;
    }

    const revision = await fetchRevision(fileURL);

    const { css, map, dependencies } = await this.fetchCSS(fileURL);

    const ast = postcss.parse(css, { from: fileURL, map: map ? { inline: false, prev: map } : { inline: false } });

    // Get the local tokens exported by the source file.
    // The tokens are fetched using `postcss-modules` plugin.
    const localTokenNames = await generateLocalTokenNames(ast);

    const tokens: Token[] = [];

    const { atImports, classSelectors, composesDeclarations } = collectNodes(ast);

    // Load imported sheets recursively.
    for (const atImport of atImports) {
      const importedSheetPath = parseAtImport(atImport);
      if (!importedSheetPath) continue;
      const importedFileURL = await this.resolver(importedSheetPath, { request: fileURL });
      const result = await this.load(importedFileURL);
      const externalTokens = result.tokens;
      dependencies.push(importedFileURL, ...result.dependencies);
      tokens.push(...externalTokens);
    }

    // Traverse the source file to find a class selector that matches the local token.
    for (const { rule, classSelector } of classSelectors) {
      // Consider a class selector to be the origin of a token if it matches a token fetched by postcss-modules.
      // NOTE: This method has false positives. However, it works as expected in many cases.
      if (!localTokenNames.includes(classSelector.value)) continue;

      const originalLocation = getOriginalLocation(rule, classSelector);

      tokens.push({
        name: classSelector.value,
        originalLocations: [originalLocation],
      });
    }

    // Load imported tokens by the names recursively.
    for (const composesDeclaration of composesDeclarations) {
      const declarationDetail = parseComposesDeclarationWithFromUrl(composesDeclaration);
      if (!declarationDetail) continue;
      const importedFileURL = await this.resolver(declarationDetail.from, { request: fileURL });
      const result = await this.load(importedFileURL);
      const externalTokens = result.tokens.filter((token) => declarationDetail.tokenNames.includes(token.name));
      dependencies.push(importedFileURL, ...result.dependencies);
      tokens.push(...externalTokens);
    }

    const result: LoadResult = {
      dependencies: unique(dependencies).filter((dep) => dep !== fileURL),
      tokens: normalizeTokens(tokens),
    };
    this.cache.set(fileURL, { revision, result });
    return result;
  }
}
