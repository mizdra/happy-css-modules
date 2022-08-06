import postcss, { Rule, AtRule, Root, Node } from 'postcss';
import modules from 'postcss-modules';
import selectorParser, { ClassName } from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

/** The position of node. */
export type Position = {
  filePath: string;
  /** The line number in the source file. It is 1-based. */
  line?: number;
  /** The column number in the source file. It is 0-based. */
  column?: number;
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
 * Generate the token's position on the source file.
 * @param rule The rule node that contains the token.
 * @param classSelector The class selector node that contains the token.
 * @returns The token's position on the source file.
 */
export function generateOriginalPosition(rule: Rule, classSelector: ClassName): Position {
  // The node derived from `postcss.parse` always has `source` property. Therefore, this line is unreachable.
  if (rule.source === undefined || classSelector.source === undefined) throw new Error('Node#source is undefined');
  // The node derived from `postcss.parse` always has `start` property. Therefore, this line is unreachable.
  if (rule.source.start === undefined || classSelector.source.start === undefined)
    throw new Error('Node#start is undefined');
  if (rule.source.input.file === undefined) throw new Error('Node#input.file is undefined');

  return {
    filePath: rule.source.input.file,
    // The line is 1-based.
    // TODO: If `source` contains an inline sourcemap, use the sourcemap to get the line and column.
    // This allows support for scss and less users.
    line: rule.source.start.line + classSelector.source.start.line - 1,
    // Postcss's column is 1-based but our column is 0-based.
    column: rule.source.start.column - 1 + (classSelector.source.start.column - 1),
  };
}

type Matcher = {
  atImport: (atImport: AtRule) => void;
  classSelector: (rule: Rule, classSelector: ClassName) => void;
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

/**
 * Walk the AST and call the matcher functions.
 * @param ast The AST to walk.
 * @param matcher The matcher functions to call.
 */
export function walkByMatcher(ast: Root, matcher: Matcher): void {
  ast.walk((node) => {
    if (isAtImportNode(node)) {
      matcher.atImport(node);
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
            matcher.classSelector(node, selector);
          }
        });
      }).processSync(node);
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
  if (firstNode.type === 'string') return firstNode.value;
  if (firstNode.type === 'function' && firstNode.value === 'url') {
    if (firstNode.nodes[0].type === 'string') return firstNode.nodes[0].value;
  }
}
