import path from 'path';
import type ts from 'typescript/lib/tsserverlibrary';

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

    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
      prior?.entries.push({
        name: 'Hello',
        kind: ts.ScriptElementKind.variableElement,
        kindModifiers: '',
        sortText: '0',
      });
      return prior;
    };
    proxy.getApplicableRefactors = (fileName, position, preferences) => {
      const prior = info.languageService.getApplicableRefactors(fileName, position, preferences);
      prior?.push({
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
      if (!(refactorName === 'Define new css rule' && actionName === 'Define new css rule')) {
        return info.languageService.getEditsForRefactor(
          fileName,
          formatOptions,
          positionOrRange,
          refactorName,
          actionName,
          preferences,
        );
      }
      let prior = info.languageService.getEditsForRefactor(
        fileName,
        formatOptions,
        positionOrRange,
        refactorName,
        actionName,
        preferences,
      );

      const { dir, name } = path.parse(fileName);

      prior ??= { edits: [] };
      prior.edits.push({
        fileName: `${dir}/${name}.module.css`,
        textChanges: [
          {
            span: {
              start: 0,
              length: 0,
            },
            newText: '.content {\n  \n}\n\n',
          },
        ],
        // isNewFile: true,
      });
      return prior;
    };

    return proxy;
  }

  return { create };
}

export = init;
