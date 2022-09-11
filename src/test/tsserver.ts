import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import serverHarness from '@typescript/server-harness';
import { resolve } from 'import-meta-resolve';
import lineColumn from 'line-column';
import { getFixturePath } from './util.js';

// TODO: refactor this

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

type DefinitionResponse = {
  seq: number;
  type: 'response';
  command: 'definition';
  success: boolean;
  body: [
    {
      /** The path of the destination file */
      file: string;
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
    },
  ];
};

export async function getIdentifierDefinitions(filePath: string, identifier: string): Promise<Definition[]> {
  const results = await getMultipleIdentifierDefinitions(filePath, [identifier]);
  return results[0]!.definitions;
}

export async function getMultipleIdentifierDefinitions(
  filePath: string,
  identifiers: string[],
): Promise<{ identifier: string; definitions: Definition[] }[]> {
  const server = serverHarness.launchServer(
    fileURLToPath(await resolve('typescript/lib/tsserver.js', import.meta.url)),
    [
      // ATA generates some extra network traffic and isn't usually relevant when profiling
      '--disableAutomaticTypingAcquisition',
    ],
  );

  const tmpFilePath = getFixturePath('/server-harness/tmp.ts');
  const tmpFileContent = [
    `import styles from '${filePath}';`,
    ...identifiers.map((identifier) => `styles.${identifier};`),
  ].join('\n');

  await server.message({
    type: 'request',
    command: 'updateOpen',
    arguments: {
      changedFiles: [],
      closedFiles: [],
      openFiles: [
        {
          file: tmpFilePath,
          fileContent: tmpFileContent,
          projectRootPath: getFixturePath('/server-harness'),
          scriptKindName: 'TS', // It's easy to get this wrong when copy-pasting
        },
      ],
    },
  });

  const results: { identifier: string; definitions: Definition[] }[] = [];

  for (let i = 0; i < identifiers.length; i++) {
    const response: DefinitionResponse = await server.message({
      type: 'request',
      command: 'definition',
      arguments: {
        file: tmpFilePath,
        line: i + 2, // line, 1-based
        offset: 8, // column, 1-based
      },
    });
    const definitions: Definition[] = response.body.map((definition) => {
      const { file, start, end } = definition;
      const fileContent = readFileSync(file, 'utf-8');
      const startIndex = lineColumn(fileContent).toIndex(start.line, start.offset);
      const endIndex = lineColumn(fileContent).toIndex(end.line, end.offset);
      const text = fileContent.slice(startIndex, endIndex);
      return { file, text, start, end };
    });
    results.push({ identifier: identifiers[i]!, definitions });
  }

  await server.message({ command: 'exit' });

  return results;
}

export async function getModuleDefinitions(filePath: string): Promise<Definition[]> {
  const server = serverHarness.launchServer(
    fileURLToPath(await resolve('typescript/lib/tsserver.js', import.meta.url)),
    [
      // ATA generates some extra network traffic and isn't usually relevant when profiling
      '--disableAutomaticTypingAcquisition',
    ],
  );

  const tmpFilePath = getFixturePath('/server-harness/tmp.ts');
  const tmpFileContent = `import styles from '${filePath}';`;

  await server.message({
    type: 'request',
    command: 'updateOpen',
    arguments: {
      changedFiles: [],
      closedFiles: [],
      openFiles: [
        {
          file: tmpFilePath,
          fileContent: tmpFileContent,
          projectRootPath: getFixturePath('/server-harness'),
          scriptKindName: 'TS', // It's easy to get this wrong when copy-pasting
        },
      ],
    },
  });

  const response: DefinitionResponse = await server.message({
    type: 'request',
    command: 'definition',
    arguments: {
      file: tmpFilePath,
      line: 1, // line, 1-based
      offset: 20, // column, 1-based
    },
  });
  const definitions: Definition[] = response.body.map((definition) => {
    const { file, start, end } = definition;
    const fileContent = readFileSync(file, 'utf-8');
    const startIndex = lineColumn(fileContent).toIndex(start.line, start.offset);
    const endIndex = lineColumn(fileContent).toIndex(end.line, end.offset);
    const text = fileContent.slice(startIndex, endIndex);
    return { file, text, start, end };
  });

  await server.message({ command: 'exit' });

  return definitions;
}
