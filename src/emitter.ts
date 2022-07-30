import { EOL } from 'os';
import { basename, dirname, join, relative } from 'path';
import camelcase from 'camelcase';
import { ExportToken } from './library/css-modules-loader-core/file-system-loader';
import { CodeWithSourceMap, SourceNode } from './library/source-map';

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
  rawTokenList: ExportToken[],
  dtsFormatOptions: DtsFormatOptions,
): typeof SourceNode[] {
  const convertKey = getConvertKeyMethod(dtsFormatOptions.camelCase);
  const result: typeof SourceNode[] = [];

  for (const rawToken of rawTokenList) {
    const key = convertKey(rawToken.name);

    // Only one original position can be associated with one generated position.
    // This is due to the sourcemap specification. Therefore, we output multiple type definitions
    // with the same name and assign a separate original position to each.

    // NOTE: `--namedExport` does not support multiple jump destinations
    // TODO: Support multiple jump destinations with `--namedExport`
    for (const originalPosition of rawToken.originalPositions) {
      if (dtsFormatOptions.namedExport) {
        result.push(
          new SourceNode(null, null, null, [
            'export const ',
            new SourceNode(
              originalPosition.line ?? null,
              originalPosition.column ?? null,
              getRelativePath(sourceMapFilePath, originalPosition.filePath),
              `${key}`,
            ),
            ': string;',
          ]),
        );
      } else {
        result.push(
          new SourceNode(null, null, null, [
            'readonly ',
            new SourceNode(
              originalPosition.line ?? null,
              originalPosition.column ?? null,
              getRelativePath(sourceMapFilePath, originalPosition.filePath),
              `"${key}"`,
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
  namedExport: boolean;
};

export function generateDtsContentWithSourceMap(
  filePath: string,
  dtsFilePath: string,
  sourceMapFilePath: string,
  rawTokenList: ExportToken[],
  dtsFormatOptions: DtsFormatOptions,
): { dtsContent: CodeWithSourceMap['code']; sourceMap: CodeWithSourceMap['map'] } {
  const tokenDeclarations = generateTokenDeclarations(sourceMapFilePath, rawTokenList, dtsFormatOptions);

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
