import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';
import type { Root, Rule } from 'postcss';
import selectorParser, { type ClassName } from 'postcss-selector-parser';
import { SourceMapConsumer } from 'source-map';
import type stylelint from 'stylelint';
import { utils } from 'stylelint';
import { Project, Node } from 'ts-morph';
import { NAMESPACE } from '../constant';
import type { Option } from '../util/validateTypes';
import { isBoolean, isOption } from '../util/validateTypes';

const ruleName = `${NAMESPACE}/no-unused-selectors`;

const messages = utils.ruleMessages(ruleName, {
  unused: (selector: string) => `\`${selector}\` is defined but not used.`,
});

function walkClassSelectors(root: Root, callback: (rule: Rule, classSelector: ClassName) => void): void {
  root.walkRules((rule) => {
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
          callback(rule, selector);
        }
      });
    }).processSync(rule);
  });
}

export const noUnusedSelectors: stylelint.Rule<boolean> = (primaryOption, secondaryOptions, _context) => {
  return async (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      { actual: primaryOption, possible: isBoolean },
      { actual: secondaryOptions, possible: isOption },
    );
    if (!validOptions || !primaryOption) {
      return;
    }

    const project = new Project({ tsConfigFilePath: (secondaryOptions as Option).tsConfigFilePath });

    if (root.source?.input.file === undefined) return;

    const cssFilePath = root.source.input.file;
    const dtsFilePath = `${cssFilePath}.d.ts`;
    const sourceMapFilePath = `${dtsFilePath}.map`;

    const sourceMapContent = await readFile(sourceMapFilePath, 'utf-8');
    const smc = await new SourceMapConsumer(sourceMapContent, pathToFileURL(sourceMapFilePath).href);

    walkClassSelectors(root, (rule, classSelector) => {
      // postcss's line and column are 1-based
      if (rule?.source?.start?.line === undefined || rule.source.start.column === undefined)
        throw new Error(`Invalid rule's source position: ${JSON.stringify(rule)}`);
      if (classSelector?.source?.start?.line === undefined || classSelector.source.start.column === undefined)
        throw new Error(`Invalid class selector's source position: ${JSON.stringify(classSelector)}`);

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

      // TODO: If you use `--localsConvention camelCase` or `--localsConvention dashes`,
      // the type definitions of up to two forms of properties will be written to .d.ts.
      // ref: https://github.com/mizdra/happy-css-modules/blob/b7822b5924bd0fa0c0a1457af16fa40bd6ceb1ec/src/emitter/dts.test.ts#L156-L157
      // ref: https://github.com/mizdra/happy-css-modules/blob/b7822b5924bd0fa0c0a1457af16fa40bd6ceb1ec/src/emitter/dts.test.ts#L202-L203
      // Therefore, we need to use `smc.allGeneratedPositionsFor` to get the positions of all form properties.
      const generatedPosition = smc.generatedPositionFor({
        source: pathToFileURL(cssFilePath).href,
        line: classSelectorStartPosition.line, // mozilla/source-map is 1-based
        column: classSelectorStartPosition.column - 1, // mozilla/source-map is 0-based
      });
      const generatedPositions = [generatedPosition];

      let isReferenced = false;
      for (const generatedPosition of generatedPositions) {
        const sourceFile = project.getSourceFile(dtsFilePath);
        if (sourceFile === undefined) throw new Error(`Cannot find ${dtsFilePath}'s source file. ${process.cwd()}`);
        // TODO: The combination of postcss and happy-css-modules breaks sourcemap with a selector list containing newlines.
        // In such cases `generatedPosition.line` and `generatedPosition.column` may become null. These cases must also be handled.
        if (generatedPosition.line === null || generatedPosition.column === null)
          throw new Error('Invalid generated position.');

        // TODO: Support Dependent Type Definition File
        // ref: https://github.com/mizdra/happy-css-modules/pull/121
        const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(
          generatedPosition.line - 1, // TypeScript Compiler API is 0-based
          generatedPosition.column, // TypeScript Compiler API is 0-based
        );
        const stringLiteralNode = sourceFile.getDescendantAtPos(pos);
        if (!Node.isStringLiteral(stringLiteralNode))
          throw new Error(
            `Unexpected node type \`${
              stringLiteralNode?.getKindName?.() ?? 'undefined'
            }\`. Expected \`StringLiteral\`.`,
          );
        const propertySignatureNode = stringLiteralNode.getParent();
        if (!Node.isPropertySignature(propertySignatureNode))
          throw new Error(
            `Unexpected node type \`${
              propertySignatureNode?.getKindName?.() ?? 'undefined'
            }\`. Expected \`PropertySignature\`.`,
          );
        const refs = propertySignatureNode.findReferencesAsNodes();
        if (refs.length > 0) {
          isReferenced = true;
          break;
        }
      }

      if (!isReferenced) {
        utils.report({
          result,
          ruleName,
          node: rule,
          start: classSelectorStartPosition,
          end: classSelectorEndPosition,
          message: messages.unused(rule.toString()),
        });
      }
    });
  };
};

noUnusedSelectors.ruleName = ruleName;
noUnusedSelectors.messages = messages;
