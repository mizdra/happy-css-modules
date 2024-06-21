import type { LanguagePlugin } from '@volar/language-core';
import type ts from 'typescript/lib/tsserverlibrary';

export function createTsxLanguagePlugin(info: ts.server.PluginCreateInfo): LanguagePlugin<string> {
  return {
    getLanguageId(scriptId) {
      if (scriptId.endsWith('.tsx')) {
        return 'typescriptreact';
      }
      return undefined;
    },
    typescript: {
      extraFileExtensions: [
        {
          extension: 'module.css',
          isMixedContent: true,
          scriptKind: 7,
        },
      ],
      resolveLanguageServiceHost(host) {
        return {
          ...host,
          getScriptFileNames() {
            const fileNames = host.getScriptFileNames();
            info.project.projectService.logger.info(`getScriptFileNames: ${JSON.stringify(fileNames)}`);
            const addedFileNames: string[] = [];
            for (const fileName of fileNames) {
              if (fileName.endsWith('.tsx')) {
                addedFileNames.push(`${fileName}.module.css`);
              }
            }
            return [...fileNames, ...addedFileNames];
          },
        };
      },
      getServiceScript(virtualCode) {
        return {
          code: virtualCode,
          extension: '.ts',
          scriptKind: 3,
        };
      },
    },
  };
}

function getCssModulesText() {
  return `
declare const styles: {};
export default styles;
  `.trim();
}
