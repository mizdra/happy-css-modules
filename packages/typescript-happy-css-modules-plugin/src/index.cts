import path from 'path';
import ts from 'typescript/lib/tsserverlibrary';

function init(modules: { typescript: typeof import('typescript/lib/tsserverlibrary') }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    // Set up decorator object
    const proxy: ts.LanguageService = Object.create(null);

    for (const k of Object.keys(info.languageService) as (keyof ts.LanguageService)[]) {
      const x = info.languageService[k]!;
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/ban-types
      proxy[k] = (...args: {}[]) => x.apply(info.languageService, args);
    }

    // eslint-disable-next-line max-params
    proxy.getCompletionEntryDetails = (fileName, position, itemName, formatOptions, source, preferences, data) => {
      const { dir, name } = path.parse(fileName);
      if (itemName !== 'styles' || source !== `./${name}.module.css`) {
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
      return {
        name: 'styles',
        kind: ts.ScriptElementKind.alias,
        kindModifiers: 'declare,export',
        sourceDisplay: [{ text: `./${name}.module.css`, kind: 'text' }],
        displayParts: [{ text: 'styles', kind: 'aliasName' }],
        codeActions: [
          {
            description: `Add an import statement from "./${name}.module.css".`,
            changes: [
              // Add an import statement.
              // TODO: Prefer `typescript.preferences.importModuleSpecifier` of VS Code settings. Should I use Volar.js?
              {
                fileName,
                textChanges: [
                  {
                    span: { start: 0, length: 0 },
                    newText: `import styles from "./${name}.module.css";\n`,
                  },
                ],
              },
              // Create a new css file.
              // TODO: This doesn't work. Why?
              {
                fileName: `${dir}/${name}.module.css`,
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
      const { dir, name } = path.parse(fileName);
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
      prior?.entries.push({
        name: 'styles',
        kind: ts.ScriptElementKind.alias,
        kindModifiers: 'declare,export',
        source: `./${name}.module.css`,
        sourceDisplay: [{ text: `./${name}.module.css`, kind: 'text' }],
        hasAction: true,
        data: {
          exportName: 'default',
          fileName: `${dir}/${name}.module.css`,
          moduleSpecifier: `./${name}.module.css`,
        },
        sortText: '0',
      });
      return prior;
    };
    proxy.getApplicableRefactors = (fileName, positionOrRange, preferences) => {
      const prior = info.languageService.getApplicableRefactors(fileName, positionOrRange, preferences) ?? [];

      const sourceFile = info.project.getSourceFile(info.project.projectService.toPath(fileName));
      if (!sourceFile) throw new Error('unreachable: sourceFile is undefined');
      const stylesNode = getStylesPropertyAccessExpression(sourceFile, positionOrRange);
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
      const stylesNode = getStylesPropertyAccessExpression(sourceFile, positionOrRange);
      if (!stylesNode) throw new Error('unreachable: stylesNode is undefined');

      const className = stylesNode.name.getText();

      const { dir, name } = path.parse(fileName);
      const cssFileName = `${dir}/${name}.module.css`;
      prior.edits.push({
        fileName: cssFileName,
        textChanges: [
          {
            span: {
              start: 0,
              length: 0,
            },
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

function positionOrRangeToIndex(positionOrRange: number | ts.TextRange): number {
  return typeof positionOrRange === 'number' ? positionOrRange : positionOrRange.pos;
}

/**
 * Get the `styles` property access expression at the specified position or range. (e.g. `styles.foo`)
 */
function getStylesPropertyAccessExpression(
  sourceFile: ts.SourceFile,
  positionOrRange: number | ts.TextRange,
): ts.PropertyAccessExpression | undefined {
  const index = positionOrRangeToIndex(positionOrRange);
  function getStylesPropertyAccessExpressionImpl(node: ts.Node): ts.PropertyAccessExpression | undefined {
    if (
      node.pos <= index &&
      index <= node.end &&
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === 'styles'
    ) {
      return ts.forEachChild(node, getStylesPropertyAccessExpressionImpl) ?? node;
    }
    return ts.forEachChild(node, getStylesPropertyAccessExpressionImpl);
  }
  return getStylesPropertyAccessExpressionImpl(sourceFile);
}

export = init;
