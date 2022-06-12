/* this file is forked from https://raw.githubusercontent.com/css-modules/css-modules-loader-core/master/src/file-system-loader.js */

import Core from 'css-modules-loader-core';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import postcss, { Plugin, Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { fromComment } from 'convert-source-map';
import { SourceMapConsumer } from 'source-map';

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

function walkClassNames(source: string, callback: (className: selectorParser.ClassName, rule: Rule) => void): void {
  const ast = postcss.parse(source);
  ast.walkRules((rule) => {
    // In `rule.selector` comes the following string:
    // 1. ".foo"
    // 2. ".foo:hover"
    // 3. ".foo, .bar"
    selectorParser((selectors) => {
      selectors.walk((selector) => {
        if (selector.type === 'class') {
          // In `selector.value` comes the following string:
          // 1. "foo"
          // 2. "bar"
          callback(selector, rule);
        }
      });
    }).processSync(rule);
  });
}

/**
 * Generate the export tokens with original positions from the source file.
 * @param source The source file.
 * @param fileRelativePath The relative path to the source file.
 * @param exportTokenNames The names of the export tokens.
 * @returns The export tokens.
 */
async function generateExportTokensWithOriginalPositions(
  source: string,
  fileRelativePath: string,
  exportTokenNames: string[],
): Promise<ExportToken[]> {
  // It works as follows:
  // 1. Convert source code to AST with postcss
  // 2. Traverses AST and finds tokens matching `exportTokenNames`
  // 3. Extract the location information of the token

  const tokenToPositionsMap = new Map<string, Position[]>();

  let sourcemap: SourceMapConsumer | undefined;
  try {
    sourcemap = await new SourceMapConsumer(fromComment(source).toObject());
  } catch (e) {}

  walkClassNames(source, (className, rule) => {
    const matchTokenName = exportTokenNames.find((name) => className.value === name);
    if (!matchTokenName) return;

    // The node derived from `postcss.parse` always has `source` property. Therefore, this line is unreachable.
    if (rule.source === undefined || className.source === undefined) throw new Error('Node#source is undefined');
    // The node derived from `postcss.parse` always has `start` property. Therefore, this line is unreachable.
    if (rule.source.start === undefined || className.source.start === undefined)
      throw new Error('Node#start is undefined');

    const positions = tokenToPositionsMap.get(matchTokenName) || [];
    let newPosition: Position = {
      filePath: fileRelativePath,
      // The line is 1-based.
      // TODO: If `source` contains an inline sourcemap, use the sourcemap to get the line and column.
      // This allows support for scss and less users.
      line: rule.source.start.line + className.source.start.line - 1,
      // Postcss's column is 1-based but our column is 0-based.
      column: rule.source.start.column - 1 + (className.source.start.column - 1),
    };

    if (sourcemap && newPosition.line !== undefined && newPosition.column !== undefined) {
      const originalPosition = sourcemap.originalPositionFor({
        line: newPosition.line,
        column: newPosition.column,
      });
      newPosition = {
        filePath: originalPosition.source ?? fileRelativePath,
        line: originalPosition.line ?? undefined,
        column: originalPosition.column ?? undefined,
      };
    }
    tokenToPositionsMap.set(matchTokenName, [...positions, newPosition]);
  });

  return [...tokenToPositionsMap.entries()].map(([tokenName, positions]) => ({
    name: tokenName,
    originalPositions: positions,
  }));
}

function mergeTokens(a: ExportToken[], b: ExportToken[]): ExportToken[] {
  const result: ExportToken[] = [];
  const names = new Set([...a.map((token) => token.name), ...b.map((token) => token.name)]);
  for (const name of names) {
    const aToken = a.find((token) => token.name === name);
    const bToken = b.find((token) => token.name === name);
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
    transform?: (newPath: string) => Promise<string>,
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

    if (!transform) {
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
      source = await transform(newPath);
    }

    const { injectableSource, exportTokens: coreExportTokens } = await this.core.load(
      source,
      rootRelativePath,
      trace,
      this.fetch.bind(this),
    );
    const exportTokens: ExportToken[] = await generateExportTokensWithOriginalPositions(
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

        const localTokens = await this.fetch(importFilePath, relativeTo, undefined, transform);
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
