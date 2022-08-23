import postcss, { type Rule, type AtRule, type Root, type Node, type Declaration, type Plugin } from 'postcss';
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

/** The location of class selector. */
export type Location = {
  filePath: string;
  /** The inclusive starting position of the node's source (compatible with postcss). */
  start: Position;
  /** The inclusive ending position of the node's source (compatible with postcss). */
  end: Position;
};

function removeDependenciesPlugin(): Plugin {
  return {
    postcssPlugin: 'remove-dependencies',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    AtRule(atRule) {
      if (isAtImportNode(atRule)) {
        atRule.remove();
      }
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Declaration(declaration) {
      if (isComposesDeclaration(declaration)) {
        declaration.remove();
      }
    },
  };
}

/**
 * Traverses a local token from the AST and returns its name.
 * @param ast The AST to traverse.
 * @returns The name of the local token.
 */
export async function generateLocalTokenNames(ast: Root): Promise<string[]> {
  return new Promise((resolve, reject) => {
    postcss
      .default()
      // postcss-modules collects tokens (i.e., includes external tokens) by following
      // the dependencies specified in the @import and composes properties.
      // However, we do not want `generateLocalTokenNames` to return external tokens.
      // So we remove the @import and composes properties beforehand.
      .use(removeDependenciesPlugin())
      .use(
        modules({
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

  const start = {
    // The line is 1-based.
    line: rule.source.start.line + (classSelector.source.start.line - 1),
    // The column is 1-based.
    column: rule.source.start.column + (classSelector.source.start.column - 1),
  };
  const end = {
    line: start.line,
    // The column is inclusive.
    column: start.column + (classSelector.value.length - 1),
  };
  let location = {
    filePath: rule.source.input.file,
    start,
    end,
  };

  if (rule.source.input.map) {
    const origin = rule.source.input.origin(
      location.start.line,
      // The column of `Input#origin` is 0-based. This behavior is undocumented and probably a postcss's bug.
      // TODO: Open PR to postcss/postcss
      location.start.column - 1,
    );
    if (origin === false) throw new Error('`Input#origin` returned false');
    if (origin.file === undefined) throw new Error('`FilePosition#file` is undefined');

    location = {
      filePath: origin.file,
      start: {
        line: origin.line,
        // The column of `Input#origin` is 0-based.
        column: origin.column + 1,
      },
      end: {
        line: origin.line,
        // The column of `Input#origin` is 0-based. Also, the column of checkable-css-modules is inclusive.
        column: origin.column + 1 + (classSelector.value.length - 1),
      },
    };
  }

  return location;
}

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

type CollectNodesResult = {
  atImports: AtRule[];
  classSelectors: { rule: Rule; classSelector: ClassName }[];
  composesDeclarations: Declaration[];
};

/**
 * Collect nodes from the AST.
 * @param ast The AST.
 */
export function collectNodes(ast: Root): CollectNodesResult {
  const atImports: AtRule[] = [];
  const classSelectors: { rule: Rule; classSelector: ClassName }[] = [];
  const composesDeclarations: Declaration[] = [];
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
    } else if (isComposesDeclaration(node)) {
      composesDeclarations.push(node);
    }
  });
  return { atImports, classSelectors, composesDeclarations };
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
    if (firstNode.nodes[0].type === 'word') return firstNode.nodes[0].value;
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
