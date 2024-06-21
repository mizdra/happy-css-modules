import type { LanguagePlugin } from '@volar/language-core';
import type * as ts from 'typescript/lib/tsserverlibrary';
import type { Config } from './config.cjs';

export function createCssModulesLanguagePlugin(sys: ts.System, config: Config): LanguagePlugin<string> {
  return {
    getLanguageId(scriptId) {
      if (isMatchFile(scriptId)) {
        return 'css';
      }
      return undefined;
    },
    createVirtualCode(fileId) {
      const fileName = fileId.includes('://') ? fileId.split('://')[1] ?? '' : fileId;
      if (isMatchFile(fileName)) {
        const text = getCssModulesText();
        return {
          id: 'main',
          mappings: [],
          embeddedCodes: [],
          languageId: 'typescript',
          snapshot: {
            getText: (start, end) => text.substring(start, end),
            getLength: () => text.length,
            getChangeRange: () => undefined,
          },
        };
      }
      return undefined;
    },
    updateVirtualCode(_fileId, virtualCode) {
      return virtualCode; // asset file content update does not affect virtual code
    },
    typescript: {
      extraFileExtensions: [
        {
          extension: 'module.css',
          isMixedContent: true,
          scriptKind: 7,
        },
      ],
      getServiceScript(virtualCode) {
        return {
          code: virtualCode,
          extension: '.ts',
          scriptKind: 3,
        };
      },
    },
  };

  function isMatchFile(fileName: string): boolean {
    return fileName.endsWith('.module.css') || fileName.endsWith('.module.css.d.ts');
  }
}

function getCssModulesText() {
  return `
declare const styles: {};
export default styles;
  `.trim();
}
