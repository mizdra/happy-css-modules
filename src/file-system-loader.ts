/* this file is forked from https://raw.githubusercontent.com/css-modules/css-modules-loader-core/master/src/file-system-loader.js */

import Core from 'css-modules-loader-core';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import postcss, { Plugin } from 'postcss';

type Dictionary<T> = {
  [key: string]: T | undefined;
};

export type ExportToken = {
  /** The name of the export token. */
  name: string;
  /**
   * The original positions of the export token in the source file.
   * Cascading tokens may have multiple positions.
   */
  originalPositions: Position[];
};

export type Position = {
  filePath: string;
  /** The line number in the source file. It is 1-based. */
  line?: number;
  /** The column number in the source file. It is 0-based. */
  column?: number;
};

const readFile = util.promisify(fs.readFile);

/**
 * Generate the export tokens with original positions from the source file.
 * @param source The source file.
 * @param fileRelativePath The relative path to the source file.
 * @param exportTokenNames The names of the export tokens.
 * @returns The export tokens.
 */
function generateExportTokensWithOriginalPositions(
  source: string,
  fileRelativePath: string,
  exportTokenNames: string[],
): ExportToken[] {
  // It works as follows:
  // 1. Convert source code to AST with postcss
  // 2. Traverses AST and finds tokens matching `exportTokenNames`
  // 3. Extract the location information of the token

  const tokenToPositionsMap = new Map<string, Position[]>();

  const ast = postcss.parse(source);

  ast.walkRules(ruleInSource => {
    exportTokenNames.forEach(tokenName => {
      // In `ruleInSource.selector` comes the following string:
      // 1. ".foo"
      // 2. ".foo:hover"
      // 3. ".foo, .bar"

      // For the time being, only pattern 1 is supported.
      // TODO: Support pattern 2 and 3.
      const tokenNameInSource = ruleInSource.selector.replace(/^\./, '');
      if (tokenNameInSource === tokenName) {
        // The rule node derived from `postcss.parse` always has a source property. Therefore, this line is unreachable.
        if (ruleInSource.source === undefined) throw new Error('ruleInSource.source is undefined');

        const positions = tokenToPositionsMap.get(tokenName) || [];
        const newPosition: Position = {
          filePath: fileRelativePath,
          // TODO: If `source` contains an inline sourcemap, use the sourcemap to get the line and column.
          // This allows support for scss and less users.
          line: ruleInSource.source.start?.line,
          // Postcss's column is 1-based but our column is 0-based.
          column: ruleInSource.source.start?.column ? ruleInSource.source.start.column - 1 : undefined,
        };
        tokenToPositionsMap.set(tokenName, [...positions, newPosition]);
      }
    });
  });
  return [...tokenToPositionsMap.entries()].map(([tokenName, positions]) => ({
    name: tokenName,
    originalPositions: positions,
  }));
}

function mergeTokens(a: ExportToken[], b: ExportToken[]): ExportToken[] {
  const result: ExportToken[] = [];
  const names = new Set([...a.map(token => token.name), ...b.map(token => token.name)]);
  for (const name of names) {
    const aToken = a.find(token => token.name === name);
    const bToken = b.find(token => token.name === name);
    result.push({
      name,
      originalPositions: [...(aToken?.originalPositions || []), ...(bToken?.originalPositions || [])],
    });
  }
  return result;
}

export default class FileSystemLoader {
  private root: string;
  private sources: Dictionary<string>;
  private importNr: number;
  private core: Core;
  public tokensByFile: Dictionary<ExportToken[]>;

  constructor(root: string, plugins?: Array<Plugin<any>>) {
    this.root = root;
    this.sources = {};
    this.importNr = 0;
    this.core = new Core(plugins);
    this.tokensByFile = {};
  }

  public async fetch(
    _newPath: string,
    relativeTo: string,
    _trace?: string,
    initialContents?: string,
  ): Promise<ExportToken[]> {
    const newPath = _newPath.replace(/^["']|["']$/g, '');
    const trace = _trace || String.fromCharCode(this.importNr++);

    const relativeDir = path.dirname(relativeTo);
    const rootRelativePath = path.resolve(relativeDir, newPath);
    let fileRelativePath = path.resolve(path.join(this.root, relativeDir), newPath);

    const isNodeModule = (fileName: string) => fileName[0] !== '.' && fileName[0] !== '/';

    // if the path is not relative or absolute, try to resolve it in node_modules
    if (isNodeModule(newPath)) {
      try {
        fileRelativePath = require.resolve(newPath);
      } catch (e) {}
    }

    let source: string;

    if (!initialContents) {
      const tokens = this.tokensByFile[fileRelativePath];
      if (tokens) {
        return tokens;
      }

      try {
        source = await readFile(fileRelativePath, 'utf-8');
      } catch (error) {
        if (relativeTo && relativeTo !== '/') {
          return [];
        }

        throw error;
      }
    } else {
      source = initialContents;
    }

    const { injectableSource, exportTokens: coreExportTokens } = await this.core.load(
      source,
      rootRelativePath,
      trace,
      this.fetch.bind(this),
    );
    const exportTokens: ExportToken[] = generateExportTokensWithOriginalPositions(
      source,
      fileRelativePath,
      Object.keys(coreExportTokens),
    );

    const re = new RegExp(/@import\s'(\D+?)';/, 'gm');

    let importTokens: ExportToken[] = [];

    let result;

    while ((result = re.exec(injectableSource))) {
      const importFile = result?.[1];

      if (importFile) {
        let importFilePath = isNodeModule(importFile)
          ? importFile
          : path.resolve(path.dirname(fileRelativePath), importFile);

        const localTokens = await this.fetch(importFilePath, relativeTo, undefined, initialContents);
        Object.assign(importTokens, localTokens);
      }
    }

    // `exportTokens` and `importTokens` may contain tokens with the same name.
    // Therefore, `originalPositions` of the tokens with the same name must be merged.
    const tokens = mergeTokens(exportTokens, importTokens);

    this.sources[trace] = injectableSource;
    this.tokensByFile[fileRelativePath] = tokens;
    return tokens;
  }
}
