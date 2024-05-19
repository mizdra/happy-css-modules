import postcss, { type Rule, type AtRule, type Root, type Node } from 'postcss';
import modules from 'postcss-modules';
import selectorParser, { type ClassName } from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

/** The pair of line number and column number. */
export type Position = {
  /** The line number in the source file. It is 1-based (compatible with postcss). */
  line: number;
  /** The column number in the source file. It is 1-based (compatible with postcss). */
  column: number;
};

/** The original location of class selector. If the original location is not found, all fields are `undefined`. */
export type Location =
  | {
      filePath: string;
      /** The inclusive starting position of the node's source (compatible with postcss). */
      start: Position;
      /** The inclusive ending position of the node's source (compatible with postcss). */
      end: Position;
    }
  | {
      filePath: undefined;
      start: undefined;
      end: undefined;
    };

/**
 * Traverses a local token from the AST and returns its name.
 * @param ast The AST to traverse.
 * @returns The name of the local token.
 */
export async function generateLocalTokenNames(ast: Root): Promise<string[]> {
  class EmptyLoader {
    async fetch(_file: string, _relativeTo: string, _depTrace: string): Promise<{ [key: string]: string }> {
      // Return an empty object because we do not want to load external tokens in `generateLocalTokenNames`.
      return Promise.resolve({});
    }
  }
  return new Promise((resolve, reject) => {
    postcss
      .default()
      .use(
        modules({
          // `@import`, `@value`, and `composes` can read tokens from external files.
          // However, we want to collect only local tokens. So we will fake that
          // an empty token is exported from the external file.
          Loader: EmptyLoader,
          getJSON: (_cssFileName, json) => {
            resolve(Object.keys(json));
          },
        }),
      )
      // NOTE: `process` modifies ast, so clone it.
      .process(ast.clone())
      .catch(reject);
  });
}

/**
 * Get the original location of the class selector.
 * @param rule The rule node that contains the token.
 * @param classSelector The class selector node that contains the token.
 * @returns The original location of the class selector.
 */
export function getOriginalLocationOfClassSelector(rule: Rule, classSelector: ClassName): Location {
  // The node derived from `postcss.parse` always has `source` property. Therefore, this line is unreachable.
  if (rule.source === undefined || classSelector.source === undefined) throw new Error('Node#source is undefined');
  // The node derived from `postcss.parse` always has `start` and `end` property. Therefore, this line is unreachable.
  if (rule.source.start === undefined || classSelector.source.start === undefined)
    throw new Error('Node#start is undefined');
  if (rule.source.end === undefined || classSelector.source.end === undefined) throw new Error('Node#end is undefined');
  if (rule.source.input.file === undefined) throw new Error('Node#input.file is undefined');

  const classSelectorStartPosition = {
    // The line is 1-based.
    line: rule.source.start.line + (classSelector.source.start.line - 1),
    // The column is 1-based.
    column: rule.source.start.column + (classSelector.source.start.column - 1),
  };
  const classSelectorEndPosition = {
    line: classSelectorStartPosition.line,
    // The column is inclusive.
    column: classSelectorStartPosition.column + classSelector.value.length,
  };
  const classSelectorLocation = {
    filePath: rule.source.input.file,
    start: classSelectorStartPosition,
    end: classSelectorEndPosition,
  };

  if (!rule.source.input.map) return classSelectorLocation;

  const classSelectorOrigin = rule.source.input.origin(
    classSelectorLocation.start.line,
    // The column of `Input#origin` is 0-based. This behavior is undocumented and probably a postcss's bug.
    // TODO: Open PR to postcss/postcss
    classSelectorLocation.start.column - 1,
  );
  if (classSelectorOrigin === false || classSelectorOrigin.file === undefined) {
    return { filePath: undefined, start: undefined, end: undefined };
  }
  return {
    filePath: classSelectorOrigin.file,
    start: {
      line: classSelectorOrigin.line,
      column: classSelectorOrigin.column + 1,
    },
    end: {
      line: classSelectorOrigin.line,
      column: classSelectorOrigin.column + classSelector.value.length + 1,
    },
  };
}

/**
 * Get the original location of `@value`.
 * @param atValue The `@value` rule.
 * @returns The location of the `@value` rule.
 */
export function getOriginalLocationOfAtValue(atValue: AtRule, valueDeclaration: ValueDeclaration): Location {
  // The node derived from `postcss.parse` always has `source` property. Therefore, this line is unreachable.
  if (atValue.source === undefined) throw new Error('Node#source is undefined');
  // The node derived from `postcss.parse` always has `start` and `end` property. Therefore, this line is unreachable.
  if (atValue.source.start === undefined) throw new Error('Node#start is undefined');
  if (atValue.source.end === undefined) throw new Error('Node#end is undefined');
  if (atValue.source.input.file === undefined) throw new Error('Node#input.file is undefined');

  return {
    filePath: atValue.source.input.file,
    start: {
      line: atValue.source.start.line,
      column: atValue.source.start.column + 7, // Add for `@value `
    },
    end: {
      line: atValue.source.start.line,
      column: atValue.source.start.column + 7 + valueDeclaration.tokenName.length, // Add for `@value ` and token name
    },
  };
}

function isAtRuleNode(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function isAtImportNode(node: Node): node is AtRule {
  return isAtRuleNode(node) && node.name === 'import';
}

function isAtValueNode(node: Node): node is AtRule {
  return isAtRuleNode(node) && node.name === 'value';
}

function isRuleNode(node: Node): node is Rule {
  return node.type === 'rule';
}

type CollectNodesResult = {
  atImports: AtRule[];
  classSelectors: { rule: Rule; classSelector: ClassName }[];
};

/**
 * Collect nodes from the AST.
 * @param ast The AST.
 */
export function collectNodes(ast: Root): CollectNodesResult {
  const atImports: AtRule[] = [];
  const classSelectors: { rule: Rule; classSelector: ClassName }[] = [];
  ast.walk((node) => {
    if (isAtImportNode(node)) {
      atImports.push(node);
    } else if (isRuleNode(node)) {
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
            classSelectors.push({ rule: node, classSelector: selector });
          }
        });
      }).processSync(node);
    }
  });
  return { atImports, classSelectors };
}

/**
 * Parse the `@import` rule.
 * @param atImport The `@import` rule to parse.
 * @returns The imported sheet path.
 */
export function parseAtImport(atImport: AtRule): string | undefined {
  const firstNode = valueParser(atImport.params).nodes[0];
  if (firstNode === undefined) return undefined;
  if (firstNode.type === 'string') return firstNode.value;
  if (firstNode.type === 'function' && firstNode.value === 'url') {
    if (firstNode.nodes[0] === undefined) return undefined;
    if (firstNode.nodes[0].type === 'string') return firstNode.nodes[0].value;
    if (firstNode.nodes[0].type === 'word') return firstNode.nodes[0].value;
  }
  return undefined;
}

type ValueDeclaration = {
  type: 'valueDeclaration';
  tokenName: string;
  // value: string; // unneeded
};
type ValueImportDeclaration = {
  type: 'valueImportDeclaration';
  imports: { importedTokenName: string; localTokenName: string }[];
  from: string;
};

type ParsedAtValue = ValueDeclaration | ValueImportDeclaration;

const matchImports = /^(.+?|\([\s\S]+?\))\s+from\s+("[^"]*"|'[^']*'|[\w-]+)$/u;
const matchValueDefinition = /(?:\s+|^)([\w-]+):?(.*?)$/u;
const matchImport = /^([\w-]+)(?:\s+as\s+([\w-]+))?/u;

/**
 * Parse the `@value` rule.
 * Forked from https://github.com/css-modules/postcss-modules-values/blob/v4.0.0/src/index.js.
 *
 * @license
 * ISC License (ISC)
 * Copyright (c) 2015, Glen Maddern
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted,
 * provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING
 * ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
 * WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH
 * THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
export function parseAtValue(atValue: AtRule): ParsedAtValue {
  const matchesForImports = atValue.params.match(matchImports);
  if (matchesForImports) {
    const [, aliases, path] = matchesForImports;

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    if (aliases === undefined || path === undefined) throw new Error(`unreachable`);

    const imports = aliases
      .replace(/^\(\s*([\s\S]+)\s*\)$/u, '$1')
      .split(/\s*,\s*/u)
      .map((alias) => {
        const tokens = matchImport.exec(alias);

        if (tokens) {
          const [, theirName, myName] = tokens;
          if (theirName === undefined) throw new Error(`unreachable`);
          return { importedTokenName: theirName, localTokenName: myName ?? theirName };
        } else {
          throw new Error(`@import statement "${alias}" is invalid!`);
        }
      });

    // Remove quotes from the path.
    // NOTE: This is a restriction unique to "happy-css-modules" and not a specification of CSS Modules.
    const normalizedPath = path.replace(/^['"]|['"]$/gu, '');

    return { type: 'valueImportDeclaration', imports, from: normalizedPath };
  }

  const matchesForValueDefinitions = `${atValue.params}${atValue.raws.between!}`.match(matchValueDefinition);
  if (matchesForValueDefinitions) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [, key, value] = matchesForValueDefinitions;
    if (key === undefined) throw new Error(`unreachable`);
    return { type: 'valueDeclaration', tokenName: key };
  }
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(`@value statement "${atValue.source!}" is invalid!`);
}
