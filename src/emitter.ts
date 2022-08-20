import { EOL } from 'os';
import { basename, dirname, join, relative } from 'path';
import camelcase from 'camelcase';
import { writeFileIfChanged } from './file-system';
import { CodeWithSourceMap, SourceNode } from './library/source-map';
import { Token } from './loader';

export type CamelCaseOption = boolean | 'dashes' | undefined;

function getRelativePath(fromFilePath: string, toFilePath: string): string {
  return relative(dirname(fromFilePath), toFilePath);
}

/**
 * Get .d.ts file path.
 * @param rootDir Root directory.
 * @param outDir The path to the output directory. It is relative to `rootDir`.
 * @param filePath The path to the source file. It is relative to `rootDir`.
 * @returns
 */
export function getDtsFilePath(rootDir: string, outDir: string | undefined, filePath: string): string {
  return outDir ? join(rootDir, outDir, filePath + '.d.ts') : join(rootDir, filePath + '.d.ts');
}

/**
 * Get .d.ts.map file path.
 * @param rootDir Root directory.
 * @param outDir The path to the output directory. It is relative to `rootDir`.
 * @param filePath The path to the source file. It is relative to `rootDir`.
 * @returns
 */
export function getSourceMapFilePath(rootDir: string, outDir: string | undefined, filePath: string): string {
  return getDtsFilePath(rootDir, outDir, filePath) + '.map';
}

export function generateSourceMappingURLComment(dtsFilePath: string, sourceMapFilePath: string): string {
  return `//# sourceMappingURL=${getRelativePath(dtsFilePath, sourceMapFilePath)}` + EOL;
}

function dashesCamelCase(str: string): string {
  return str.replace(/-+(\w)/g, function (match, firstLetter) {
    return firstLetter.toUpperCase();
  });
}

function getConvertKeyMethod(camelCaseOption: CamelCaseOption): (str: string) => string {
  switch (camelCaseOption) {
    case true:
      return camelcase;
    case 'dashes':
      return (str: string) => dashesCamelCase(str);
    default:
      return (key) => key;
  }
}

function generateTokenDeclarations(
  sourceMapFilePath: string,
  tokens: Token[],
  dtsFormatOptions: DtsFormatOptions,
): typeof SourceNode[] {
  const convertKey = getConvertKeyMethod(dtsFormatOptions.camelCase);
  const result: typeof SourceNode[] = [];

  for (const token of tokens) {
    const key = convertKey(token.name);

    // Only one original position can be associated with one generated position.
    // This is due to the sourcemap specification. Therefore, we output multiple type definitions
    // with the same name and assign a separate original position to each.

    // NOTE: `--namedExport` does not support multiple jump destinations
    // TODO: Support multiple jump destinations with `--namedExport`
    for (const originalLocation of token.originalLocations) {
      if (dtsFormatOptions.namedExport) {
        result.push(
          new SourceNode(null, null, null, [
            'export const ',
            new SourceNode(
              originalLocation.start.line ?? null,
              // The SourceNode's column is 0-based, but the originalLocation's column is 1-based.
              originalLocation.start.column - 1 ?? null,
              getRelativePath(sourceMapFilePath, originalLocation.filePath),
              `${key}`,
              token.name,
            ),
            ': string;',
          ]),
        );
      } else {
        result.push(
          new SourceNode(null, null, null, [
            'readonly ',
            new SourceNode(
              originalLocation.start.line ?? null,
              // The SourceNode's column is 0-based, but the originalLocation's column is 1-based.
              originalLocation.start.column - 1 ?? null,
              getRelativePath(sourceMapFilePath, originalLocation.filePath),
              `"${key}"`,
              token.name,
            ),
            ': string;',
          ]),
        );
      }
    }
  }
  return result;
}

export type DtsFormatOptions = {
  camelCase: CamelCaseOption;
  namedExport?: boolean;
};

export function generateDtsContentWithSourceMap(
  filePath: string,
  dtsFilePath: string,
  sourceMapFilePath: string,
  tokens: Token[],
  dtsFormatOptions: DtsFormatOptions,
): { dtsContent: CodeWithSourceMap['code']; sourceMap: CodeWithSourceMap['map'] } {
  const tokenDeclarations = generateTokenDeclarations(sourceMapFilePath, tokens, dtsFormatOptions);

  let sourceNode: typeof SourceNode;
  if (!tokenDeclarations || !tokenDeclarations.length) {
    sourceNode = new SourceNode(null, null, null, '');
  } else if (dtsFormatOptions.namedExport) {
    sourceNode = new SourceNode(1, 0, getRelativePath(sourceMapFilePath, filePath), [
      'export const __esModule: true;' + EOL,
      ...tokenDeclarations.map((tokenDeclaration) => [tokenDeclaration, EOL]),
    ]);
  } else {
    sourceNode = new SourceNode(1, 0, getRelativePath(sourceMapFilePath, filePath), [
      'declare const styles: {' + EOL,
      ...tokenDeclarations.map((tokenDeclaration) => ['  ', tokenDeclaration, EOL]),
      '};' + EOL,
      'export = styles;' + EOL,
    ]);
  }
  const codeWithSourceMap = sourceNode.toStringWithSourceMap({
    // Since sourcemap and type definitions are in the same directory, they can be referenced by relative paths.
    file: basename(dtsFilePath),
    sourceRoot: '',
  });
  return {
    dtsContent: codeWithSourceMap.code,
    sourceMap: codeWithSourceMap.map,
  };
}

export async function emitGeneratedFiles(
  rootDir: string,
  outDir: string | undefined,
  filePath: string,
  tokens: Token[],
  emitDeclarationMap: boolean | undefined,
  dtsFormatOptions: DtsFormatOptions,
): Promise<void> {
  const dtsFilePath = getDtsFilePath(rootDir, outDir, filePath);
  const sourceMapFilePath = getSourceMapFilePath(rootDir, outDir, filePath);
  const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
    filePath,
    dtsFilePath,
    sourceMapFilePath,
    tokens,
    dtsFormatOptions,
  );

  if (emitDeclarationMap) {
    const sourceMappingURLComment = generateSourceMappingURLComment(dtsFilePath, sourceMapFilePath);
    await writeFileIfChanged(dtsFilePath, dtsContent + sourceMappingURLComment);
    // NOTE: tsserver does not support inline declaration maps. Therefore, sourcemap files must be output.
    await writeFileIfChanged(sourceMapFilePath, sourceMap.toString());
  } else {
    await writeFileIfChanged(dtsFilePath, dtsContent);
  }
}
