import path from 'path';
import camelcase from 'camelcase';
import type { Root, Rule } from 'postcss';
import selectorParser, { type ClassName } from 'postcss-selector-parser';
import type stylelint from 'stylelint';
import { utils } from 'stylelint';
import type { SourceFile } from 'ts-morph';
import { Project, Node } from 'ts-morph';
import { NAMESPACE } from '../constant';
import type { Option } from '../util/validateTypes';
import { isBoolean, isOption } from '../util/validateTypes';

const ruleName = `${NAMESPACE}/no-unused-selectors`;

const messages = utils.ruleMessages(ruleName, {
  unused: (selector: string) => `\`${selector}\` is defined but not used.`,
  unsupportedSelector: (message: string) => message,
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

function dashesCamelCase(str: string): string {
  return str.replace(/-+(\w)/g, (match, firstLetter) => {
    return firstLetter.toUpperCase();
  });
}

function isEmpty<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

class SelectorTypeDefinitionNotFoundInDTSError extends Error {
  static {
    this.prototype.name = 'IgnoredSelectorError';
  }
}

function isReferencedSelector(classSelectorName: string, sourceFile: SourceFile): boolean {
  const defaultExportSymbol = sourceFile.getDefaultExportSymbol();
  if (!defaultExportSymbol) throw new Error(`\`styles\` is not exported. \`${sourceFile.getFilePath()}\` is invalid.`);
  const declaration = defaultExportSymbol.getDeclarations()[0];
  if (!Node.isExportAssignment(declaration))
    throw new Error(`\`styles\` is not exported. \`${sourceFile.getFilePath()}\` is invalid.`);
  const stylesType = declaration.getExpression().getType();

  const tokens = unique([classSelectorName, camelcase(classSelectorName), dashesCamelCase(classSelectorName)]);
  const props = tokens.map((token) => stylesType.getProperty(token)).filter(isEmpty);
  if (props.length === 0)
    throw new SelectorTypeDefinitionNotFoundInDTSError(
      `\`styles.${classSelectorName}\` is not found in \`${sourceFile.getFilePath()}\`.`,
    );
  for (const prop of props) {
    const declarations = prop.getDeclarations();
    for (const declaration of declarations) {
      if (!Node.isPropertySignature(declaration)) continue;
      const refs = declaration.findReferencesAsNodes();
      if (refs.length > 0) return true;
    }
  }
  return false;
}

type Lang = 'css' | 'scss' | 'less';
function getLang(cssFilePath: string): Lang {
  const lang = path.extname(cssFilePath);
  if (lang === '.css') return 'css';
  if (lang === '.scss') return 'scss';
  if (lang === '.less') return 'less';
  throw new Error(`Unsupported extension: ${cssFilePath}`);
}

class UnsupportedSelectorError extends Error {
  static {
    this.prototype.name = 'UnsupportedSelectorError';
  }
}
function checkUnsupportedSelector(classSelectorName: string, lang: Lang): void {
  if (lang === 'css') {
    // ref: https://github.com/postcss/postcss-simple-vars#interpolation
    // ref: https://github.com/postcss/postcss-simple-vars/blob/b045c1c60e19fb75d8c3b38822063b05c4685bf3/index.js#L59
    if (/\$\(\s*[\w\d-_]+\s*\)/.test(classSelectorName)) {
      throw new UnsupportedSelectorError(
        `postcss-simple-var's interpolation(\`$(...)\`) is not supported in stylelint-happy-css-modules.`,
      );
    }
  } else if (lang === 'scss') {
    // ref: https://lesscss.org/features/#parent-selectors-feature
    // ref: https://github.com/sass/dart-sass/blob/702a7ee7a18c0265f8f90ff1155268e477dd77cf/lib/src/parse/selector.dart#L228-L234
    if (/\$/.test(classSelectorName)) {
      throw new UnsupportedSelectorError(
        `Sass's parent selector(\`$\`) is not supported in stylelint-happy-css-modules.`,
      );
    }
  } else if (lang === 'less') {
    // ref: https://lesscss.org/features/#parent-selectors-feature
    // ref: https://github.com/less/less.js/blob/a917965340631f9a32b73726313cc91de08596b9/packages/less/src/less/tree/selector.js#L111
    if (/&/.test(classSelectorName)) {
      throw new UnsupportedSelectorError(
        `Less's parent selector(\`&\`) is not supported in stylelint-happy-css-modules.`,
      );
    }
  }
}

const projectCacheStore = new Map<string, Project>();

export const noUnusedSelectors: stylelint.Rule<boolean> = (primaryOption, secondaryOptions, _context) => {
  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      { actual: primaryOption, possible: isBoolean },
      { actual: secondaryOptions, possible: isOption },
    );
    if (!validOptions || !primaryOption) {
      return;
    }

    const tsConfigFilePath = (secondaryOptions as Option).tsConfigFilePath;

    const project = projectCacheStore.get(tsConfigFilePath) ?? new Project({ tsConfigFilePath });
    projectCacheStore.set(tsConfigFilePath, project);

    if (root.source?.input.file === undefined) return;

    const cssFilePath = root.source.input.file;
    const dtsFilePath = `${cssFilePath}.d.ts`;

    const lang = getLang(cssFilePath);

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

      const sourceFile = project.getSourceFile(dtsFilePath);
      if (sourceFile === undefined) throw new Error(`Cannot find ${dtsFilePath}'s source file. ${process.cwd()}`);

      try {
        checkUnsupportedSelector(classSelector.value, lang);
      } catch (e) {
        if (e instanceof UnsupportedSelectorError) {
          utils.report({
            result,
            ruleName,
            node: rule,
            start: classSelectorStartPosition,
            end: classSelectorEndPosition,
            message: messages.unsupportedSelector(e.message),
          });
          return;
        }
        throw e;
      }

      let isReferenced;
      try {
        isReferenced = isReferencedSelector(classSelector.value, sourceFile);
      } catch (e) {
        // In the following cases, the class selector's type definition may not be in .d.ts.
        //
        // - When there is a mixin definition of less (e.g. `.mixin-1() {...}`)
        // - When the contents of .d.ts are out of date
        //
        // In such cases, lint error should not be output.
        if (e instanceof SelectorTypeDefinitionNotFoundInDTSError) return;
        throw e;
      }

      if (!isReferenced) {
        utils.report({
          result,
          ruleName,
          node: rule,
          start: classSelectorStartPosition,
          end: classSelectorEndPosition,
          message: messages.unused(`.${classSelector.value}`),
        });
      }
    });
  };
};

noUnusedSelectors.ruleName = ruleName;
noUnusedSelectors.messages = messages;
