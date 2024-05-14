import type ts from 'typescript/lib/tsserverlibrary';
import { getStylesPropertyAccessExpression } from './ast.cjs';
import { parseConfig } from './config.cjs';
import { getCssFileName, getCssImportStatement, getCssModuleSpecifier } from './source.cjs';

function init(modules: { typescript: typeof import('typescript/lib/tsserverlibrary') }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    // Set up decorator object
    const proxy: ts.LanguageService = Object.create(null);

    const config = parseConfig(info.config);

    for (const k of Object.keys(info.languageService) as (keyof ts.LanguageService)[]) {
      const x = info.languageService[k]!;
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/ban-types
      proxy[k] = (...args: {}[]) => x.apply(info.languageService, args);
    }

    // eslint-disable-next-line max-params
    proxy.getCompletionEntryDetails = (fileName, position, itemName, formatOptions, source, preferences, data) => {
      const cssModuleSpecifier = getCssModuleSpecifier(fileName, config);
      if (itemName !== config.exportedStylesName || source !== cssModuleSpecifier) {
        return info.languageService.getCompletionEntryDetails(
          fileName,
          position,
          itemName,
          formatOptions,
          source,
          preferences,
          data,
        );
      }
      const cssFileName = getCssFileName(fileName, config);
      return {
        name: config.exportedStylesName,
        kind: ts.ScriptElementKind.alias,
        kindModifiers: 'declare,export',
        sourceDisplay: [{ text: cssModuleSpecifier, kind: 'text' }],
        displayParts: [{ text: config.exportedStylesName, kind: 'aliasName' }],
        codeActions: [
          {
            description: `Add an import statement from "${cssModuleSpecifier}".`,
            changes: [
              // Add an import statement.
              // TODO: Prefer `typescript.preferences.importModuleSpecifier` of VS Code settings. Should I use Volar.js?
              {
                fileName,
                textChanges: [
                  {
                    span: { start: 0, length: 0 },
                    newText: `${getCssImportStatement(fileName, config)}\n`,
                  },
                ],
              },
              // Create a new css file.
              // FIXME: This doesn't work. Why?
              {
                fileName: cssFileName,
                textChanges: [
                  {
                    span: { start: 0, length: 0 },
                    newText: '',
                  },
                ],
                isNewFile: true,
              },
            ],
          },
        ],
      };
    };
    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);

      const cssModuleSpecifier = getCssModuleSpecifier(fileName, config);
      prior?.entries.push({
        name: config.exportedStylesName,
        kind: ts.ScriptElementKind.alias,
        kindModifiers: 'declare,export',
        source: cssModuleSpecifier,
        sourceDisplay: [{ text: cssModuleSpecifier, kind: 'text' }],
        hasAction: true,
        data: {
          exportName: 'default',
          fileName: getCssFileName(fileName, config),
          moduleSpecifier: cssModuleSpecifier,
        },
        sortText: '0',
      });
      return prior;
    };
    proxy.getApplicableRefactors = (fileName, positionOrRange, preferences) => {
      const prior = info.languageService.getApplicableRefactors(fileName, positionOrRange, preferences) ?? [];

      const sourceFile = info.project.getSourceFile(info.project.projectService.toPath(fileName));
      if (!sourceFile) throw new Error('unreachable: sourceFile is undefined');
      const stylesNode = getStylesPropertyAccessExpression(sourceFile, positionOrRange, config);
      if (!stylesNode) return prior;

      prior.push({
        name: 'Define new css rule',
        description: 'Define new css rule',
        actions: [
          {
            name: 'Define new css rule',
            description: 'Define new css rule',
          },
        ],
      });

      return prior;
    };
    // eslint-disable-next-line max-params
    proxy.getEditsForRefactor = (fileName, formatOptions, positionOrRange, refactorName, actionName, preferences) => {
      const prior = info.languageService.getEditsForRefactor(
        fileName,
        formatOptions,
        positionOrRange,
        refactorName,
        actionName,
        preferences,
      ) ?? { edits: [] };

      if (refactorName !== 'Define new css rule' || actionName !== 'Define new css rule') return prior;

      const sourceFile = info.project.getSourceFile(info.project.projectService.toPath(fileName));
      if (!sourceFile) throw new Error('unreachable: sourceFile is undefined');
      const stylesNode = getStylesPropertyAccessExpression(sourceFile, positionOrRange, config);
      if (!stylesNode) throw new Error('unreachable: stylesNode is undefined');

      const className = stylesNode.name.getText();

      prior.edits.push({
        fileName: getCssFileName(fileName, config),
        textChanges: [
          {
            span: {
              start: 0,
              length: 0,
            },
            // TODO: Focus on CSS rule after insertion. But, that is technically feasible?
            newText: `.${className} {\n  \n}\n\n`,
          },
        ],
        // For some reason, adding a rule to an already existing file also requires `isNewFile: true`.
        isNewFile: true,
      });

      return prior;
    };

    return proxy;
  }

  return { create };
}

export = init;
