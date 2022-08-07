import postcss, { Rule, AtRule, Root, Node, Declaration } from 'postcss';
import modules from 'postcss-modules';
import selectorParser, { ClassName } from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

/** The pair of line number and column number. */
export type Position = {
  /** The line number in the source file. It is 1-based. */
  line: number;
  /** The column number in the source file. It is 0-based. */
  column: number;
};

/** The location of class selector. */
export type Location = {
  filePath: string;
  /** The starting position of the node's source. */
  start: Position;
  /** The ending position of the node's source. */
  end: Position;
};

/**
 * The name of exported token by the source file excluding the imported from other sheets.
 * @param ast The root node of the source file.
 * @returns The exported token names.
 */
export async function generateLocalTokenNames(ast: Root): Promise<string[]> {
  return new Promise((resolve, reject) => {
    postcss()
      .use(
        modules({
          getJSON: (_cssFileName, json) => {
            resolve(Object.keys(json));
          },
        }),
      )
      .process(ast)
      .catch(reject);
  });
}

/**
 * Get the token's location on the source file.
 * @param rule The rule node that contains the token.
 * @param classSelector The class selector node that contains the token.
 * @returns The token's location on the source file.
 */
export function getOriginalLocation(rule: Rule, classSelector: ClassName): Location {
  // The node derived from `postcss.parse` always has `source` property. Therefore, this line is unreachable.
  if (rule.source === undefined || classSelector.source === undefined) throw new Error('Node#source is undefined');
  // The node derived from `postcss.parse` always has `start` and `end` property. Therefore, this line is unreachable.
  if (rule.source.start === undefined || classSelector.source.start === undefined)
    throw new Error('Node#start is undefined');
  if (rule.source.end === undefined || classSelector.source.end === undefined) throw new Error('Node#end is undefined');
  if (rule.source.input.file === undefined) throw new Error('Node#input.file is undefined');

  return {
    filePath: rule.source.input.file,
    start: {
      // The line is 1-based.
      line: rule.source.start.line + classSelector.source.start.line - 1,
      // Postcss's column is 1-based but our column is 0-based.
      column: rule.source.start.column - 1 + (classSelector.source.start.column - 1),
    },
    end: {
      line: rule.source.start.line + classSelector.source.end.line - 1,
      column: rule.source.start.column - 1 + (classSelector.source.end.column - 1),
    },
  };
}

type Matcher = {
  atImport?: (atImport: AtRule) => void;
  classSelector?: (rule: Rule, classSelector: ClassName) => void;
  composesDeclaration?: (composesDeclaration: Declaration) => void;
};

function isAtRuleNode(node: Node): node is AtRule {
  return node.type === 'atrule';
}

function isAtImportNode(node: Node): node is AtRule {
  return isAtRuleNode(node) && node.name === 'import';
}

function isRuleNode(node: Node): node is Rule {
  return node.type === 'rule';
}

function isDeclaration(node: Node): node is Declaration {
  return node.type === 'decl';
}

function isComposesDeclaration(node: Node): node is Declaration {
  return isDeclaration(node) && node.prop === 'composes';
}

/**
 * Walk the AST and call the matcher functions.
 * @param ast The AST to walk.
 * @param matcher The matcher functions to call.
 */
export function walkByMatcher(ast: Root, matcher: Matcher): void {
  ast.walk((node) => {
    if (isAtImportNode(node)) {
      matcher.atImport?.(node);
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
            matcher.classSelector?.(node, selector);
          }
        });
      }).processSync(node);
    } else if (isComposesDeclaration(node)) {
      matcher.composesDeclaration?.(node);
    }
  });
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
    if (firstNode.nodes[0].type === 'string') return firstNode.nodes[0].value;
  }
}

/**
 * Parse `composes` declaration with `from <url>`.
 * If the declaration is not found or do not have `from <url>`, return `undefined`.
 * @param composesDeclaration The `composes` declaration to parse.
 * @returns The information of the declaration.
 */
export function parseComposesDeclarationWithFromUrl(
  composesDeclaration: Declaration,
): { from: string; tokenNames: string[] } | undefined {
  // NOTE: `composes` property syntax is...
  // - syntax: `composes: <class-name> [...<class-name>] [from <url>];`
  // - variables:
  //   - `<class-name>`: `<sting>`
  //   - `<url>`: `<string>`
  // - ref:
  //   - https://github.com/css-modules/css-modules#composition
  //   - https://github.com/css-modules/css-modules#composing-from-other-files
  //   - https://github.com/css-modules/postcss-modules-extract-imports#specification

  const nodes = valueParser(composesDeclaration.value).nodes;
  if (nodes.length < 5) return undefined;

  const classNamesOrSpaces = nodes.slice(0, -3);
  const [from, , url] = nodes.slice(-3);

  const classNames = classNamesOrSpaces.filter((node) => node.type === 'word');

  // validate nodes
  if (from.type !== 'word' || from.value !== 'from') return undefined;
  if (url.type !== 'string') return undefined;
  if (classNames.length === 0) return undefined;

  return { from: url.value, tokenNames: classNames.map((node) => node.value) };
}
