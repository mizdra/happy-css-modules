import { readFile, stat } from 'fs/promises';
import { dirname, resolve } from 'path';
import postcss, { AtRule, Declaration } from 'postcss';
import {
  getOriginalLocation,
  generateLocalTokenNames,
  parseAtImport,
  Location,
  walkByMatcher,
  parseComposesDeclarationWithFromUrl,
} from './postcss';
import { unique, uniqueBy } from './util';

/**
 * The value returned from the transformer.
 * `false` means to skip transpiling on that file.
 * */
export type TransformResult =
  | {
      /** The transformed code. */
      css: string;
      /** The source map from the transformed code to the original code. */
      map: string | object;
      dependencies: (string | URL)[];
    }
  | false;

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

/** This class collects information on tokens exported from CSS Modules files. */
export class Loader {
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly transform: Transformer | undefined;

  constructor(transform?: Transformer) {
    this.transform = transform;
  }

  /** Returns `true` if the cache is outdated. */
  private async isCacheOutdated(filePath: string): Promise<boolean> {
    const entry = this.cache.get(filePath);
    if (!entry) return true;
    const mtime = (await stat(filePath)).mtime.getTime();
    if (entry.mtime !== mtime) return true;
    return (await Promise.all(entry.result.dependencies.map(async (dep) => this.isCacheOutdated(dep)))).some(Boolean);
  }

  /** Returns information about the tokens exported from the CSS Modules file. */
  async load(filePath: string): Promise<LoadResult> {
    if (!(await this.isCacheOutdated(filePath))) {
      const cacheEntry = this.cache.get(filePath)!;
      return cacheEntry.result;
    }

    const dependencies: string[] = [];
    const mtime = (await stat(filePath)).mtime.getTime();

    // TODO: Refactor the following as `const { css, map, dependencies } = await readCSS(transform);`
    let css = await readFile(filePath, 'utf-8');
    let map: string | object | undefined;
    if (this.transform) {
      const result = await this.transform(css, filePath);
      if (result) {
        css = result.css;
        map = result.map;
        dependencies.push(
          ...result.dependencies.map((dep) => {
            if (typeof dep === 'string') return dep;
            if (dep.protocol !== 'file:') throw new Error('Unsupported protocol: ' + dep.protocol);
            return dep.pathname;
          }),
        );
      }
    }

    const ast = postcss.parse(css, { from: filePath, map: { inline: false, prev: map } });

    // Get the local tokens exported by the source file.
    // The tokens are fetched using `postcss-modules` plugin.
    const localTokenNames = await generateLocalTokenNames(ast);

    const tokens: Token[] = [];

    const atImports: AtRule[] = [];
    const composesDeclarations: Declaration[] = [];
    // TODO: Refactor with async `walkByMatcher`
    walkByMatcher(ast, {
      // Collect the sheets imported by `@import` rule.
      atImport: (atImport) => {
        atImports.push(atImport);
      },
      // Traverse the source file to find a class selector that matches the local token.
      classSelector: (rule, classSelector) => {
        // Consider a class selector to be the origin of a token if it matches a token fetched by postcss-modules.
        // NOTE: This method has false positives. However, it works as expected in many cases.
        if (!localTokenNames.includes(classSelector.value)) return;

        const originalLocation = getOriginalLocation(rule, classSelector);

        tokens.push({
          name: classSelector.value,
          originalLocations: [originalLocation],
        });
      },
      composesDeclaration: (composesDeclaration) => {
        composesDeclarations.push(composesDeclaration);
      },
    });

    // Load imported sheets recursively.
    for (const atImport of atImports) {
      const importedSheetPath = parseAtImport(atImport);
      if (!importedSheetPath) continue;
      const from = resolve(dirname(filePath), importedSheetPath);
      const result = await this.load(from);
      const externalTokens = result.tokens;
      dependencies.push(from);
      tokens.push(...externalTokens);
    }

    // Load imported tokens by the names recursively.
    for (const composesDeclaration of composesDeclarations) {
      const declarationDetail = parseComposesDeclarationWithFromUrl(composesDeclaration);
      if (!declarationDetail) continue;
      const from = resolve(dirname(filePath), declarationDetail.from);
      const result = await this.load(from);
      const externalTokens = result.tokens.filter((token) => declarationDetail.tokenNames.includes(token.name));
      dependencies.push(from);
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
