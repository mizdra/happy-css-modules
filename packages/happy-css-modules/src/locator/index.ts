import { readFile, stat } from 'fs/promises';
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
  mtime: number; // TODO: `--cache-strategy` option will allow you to switch between `content` and `metadata` modes.
  result: LoadResult;
};

/** The result of `Locator#load`. */
export type LoadResult = {
  /** The path of the file imported from the source file with `@import` or `composes`. */
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
  private loading = false;

  constructor(options?: LocatorOptions) {
    this.transformer = options?.transformer ?? createDefaultTransformer();
    this.resolver = async (specifier, resolverOptions) => {
      const resolver = options?.resolver ?? createDefaultResolver();
      const resolved = await resolver(specifier, resolverOptions);
      if (resolved === false) throw new Error(`Could not resolve '${specifier}' in '${resolverOptions.request}'.`);
      return resolved;
    };
  }

  /** Returns `true` if the cache is outdated. */
  private async isCacheOutdated(filePath: string): Promise<boolean> {
    const entry = this.cache.get(filePath);
    if (!entry) return true;
    const mtime = (await stat(filePath)).mtime.getTime();
    if (entry.mtime !== mtime) return true;

    const { dependencies } = entry.result;
    for (const dependency of dependencies) {
      const entry = this.cache.get(dependency);
      if (!entry) return true;
      const mtime = (await stat(dependency)).mtime.getTime();
      if (entry.mtime !== mtime) return true;
    }
    return false;
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
    if (this.loading) throw new Error('Cannot call `Locator#load` concurrently.');
    this.loading = true;
    const result = await this._load(filePath).finally(() => {
      this.loading = false;
    });
    return result;
  }

  private async _load(filePath: string): Promise<LoadResult> {
    if (!(await this.isCacheOutdated(filePath))) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Checked to be non-null by `isCacheOutdated`.
      const cacheEntry = this.cache.get(filePath)!;
      return cacheEntry.result;
    }

    const mtime = (await stat(filePath)).mtime.getTime();

    const { css, map, dependencies } = await this.readCSS(filePath);

    const ast = postcss.parse(css, { from: filePath, map: map ? { inline: false, prev: map } : { inline: false } });

    // Get the local tokens exported by the source file.
    // The tokens are fetched using `postcss-modules` plugin.
    const localTokenNames = await generateLocalTokenNames(ast);

    const tokens: Token[] = [];

    const { atImports, classSelectors, composesDeclarations } = collectNodes(ast);

    // Load imported sheets recursively.
    for (const atImport of atImports) {
      const importedSheetPath = parseAtImport(atImport);
      if (!importedSheetPath) continue;
      if (isIgnoredSpecifier(importedSheetPath)) continue;
      const from = await this.resolver(importedSheetPath, { request: filePath });
      const result = await this._load(from);
      const externalTokens = result.tokens;
      dependencies.push(from, ...result.dependencies);
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
      if (isIgnoredSpecifier(declarationDetail.from)) continue;
      const from = await this.resolver(declarationDetail.from, { request: filePath });
      const result = await this._load(from);
      const externalTokens = result.tokens.filter((token) => declarationDetail.tokenNames.includes(token.name));
      dependencies.push(from, ...result.dependencies);
      tokens.push(...externalTokens);
    }

    const result: LoadResult = {
      dependencies: unique(dependencies).filter((dep) => dep !== filePath),
      tokens: normalizeTokens(tokens),
    };
    this.cache.set(filePath, { mtime, result });
    return result;
  }
}
