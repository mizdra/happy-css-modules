import { readFileSync } from 'fs';
import { mkdir, writeFile as nativeWriteFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import serverHarness from '@typescript/server-harness';
import { glob } from 'glob';
import { resolve } from 'import-meta-resolve';
import lineColumn from 'line-column';
import type { server } from 'typescript/lib/tsserverlibrary.js';
import { getFixturePath } from './util.js';

async function writeFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  return nativeWriteFile(path, content, 'utf8');
}

type Definition = {
  /** The path of the destination file */
  file: string;
  /** The text at definition destination */
  text: string;
  /** inclusive */
  start: {
    /** line, 1-based */
    line: number;
    /** column, 1-based */
    offset: number;
  };
  /** exclusive */
  end: {
    /** line, 1-based */
    line: number;
    /** column, 1-based */
    offset: number;
  };
};

export function createTSServer() {
  const server = serverHarness.launchServer(fileURLToPath(resolve('typescript/lib/tsserver.js', import.meta.url)), [
    // ATA generates some extra network traffic and isn't usually relevant when profiling
    '--disableAutomaticTypingAcquisition',
  ]);

  return {
    async getIdentifierDefinitions(filePath: string, identifier: string): Promise<Definition[]> {
      const results = await this.getMultipleIdentifierDefinitions(filePath, [identifier]);
      return results[0]!.definitions;
    },
    async getMultipleIdentifierDefinitions(
      filePath: string,
      identifiers: string[],
    ): Promise<{ identifier: string; definitions: Definition[] }[]> {
      const tmpFilePath = getFixturePath('/server-harness/tmp.ts');
      const tmpFileContent = [
        `import styles from '${filePath}';`,
        ...identifiers.map((identifier) => `styles.${identifier};`),
      ].join('\n');
      await writeFile(tmpFilePath, tmpFileContent);

      await this.refreshCache();

      const results: { identifier: string; definitions: Definition[] }[] = [];

      for (let i = 0; i < identifiers.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const response: server.protocol.DefinitionResponse = await server.message({
          seq: 0,
          type: 'request',
          command: 'definition',
          arguments: {
            file: tmpFilePath,
            line: i + 2, // line, 1-based
            offset: 8, // column, 1-based
          },
        } as server.protocol.DefinitionRequest);
        const definitions: Definition[] = response.body!.map((definition) => {
          const { file, start, end } = definition;
          const fileContent = readFileSync(file, 'utf-8');
          const startIndex = lineColumn(fileContent).toIndex(start.line, start.offset);
          const endIndex = lineColumn(fileContent).toIndex(end.line, end.offset);
          const text = fileContent.slice(startIndex, endIndex);
          return { file, text, start, end };
        });
        results.push({ identifier: identifiers[i]!, definitions });
      }
      return results;
    },
    async getModuleDefinitions(filePath: string): Promise<Definition[]> {
      await this.refreshCache();

      const tmpFilePath = getFixturePath('/server-harness/tmp.ts');
      const tmpFileContent = `import styles from '${filePath}';`;

      await writeFile(tmpFilePath, tmpFileContent);

      await this.refreshCache();

      const response: server.protocol.DefinitionResponse = await server.message({
        seq: 0,
        type: 'request',
        command: 'definition',
        arguments: {
          file: tmpFilePath,
          line: 1, // line, 1-based
          offset: 20, // column, 1-based
        },
      } as server.protocol.DefinitionRequest);
      const definitions: Definition[] = response.body!.map((definition) => {
        const { file, start, end } = definition;
        const fileContent = readFileSync(file, 'utf-8');
        const startIndex = lineColumn(fileContent).toIndex(start.line, start.offset);
        const endIndex = lineColumn(fileContent).toIndex(end.line, end.offset);
        const text = fileContent.slice(startIndex, endIndex);
        return { file, text, start, end };
      });
      return definitions;
    },
    async refreshCache() {
      // tsserver caches the contents of opened files.
      // When a file is updated, its cache remains with the old content.
      // Therefore we need to overwrite the cache with the latest content.

      const fixtureFilePaths = await glob(getFixturePath('/**/*.ts'), { dot: true });
      // latest contents
      const openFiles: server.protocol.UpdateOpenRequest['arguments']['openFiles'] = fixtureFilePaths.map(
        (filePath) => ({
          file: filePath,
          fileContent: readFileSync(filePath, 'utf-8'),
          projectRootPath: getFixturePath('/server-harness'),
          scriptKindName: 'TS', // It's easy to get this wrong when copy-pasting
        }),
      );

      // override the cache
      await server.message({
        seq: 0,
        type: 'request',
        command: 'updateOpen',
        arguments: {
          changedFiles: [],
          closedFiles: [],
          openFiles,
        },
      } as server.protocol.UpdateOpenRequest);
    },
    exit: async () => {
      await server.message({ command: 'exit' });
    },
  };
}
