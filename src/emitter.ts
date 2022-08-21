import { EOL } from 'os';
import { basename, dirname, isAbsolute, join, relative } from 'path';
import camelcase from 'camelcase';
import { writeFileIfChanged } from './file-system';
import { CodeWithSourceMap, SourceNode } from './library/source-map';
import { Token } from './loader';

export type CamelCaseOption = boolean | 'dashes' | undefined;

function getRelativePath(fromFilePath: string, toFilePath: string): string {
  return relative(dirname(fromFilePath), toFilePath);
}

function isSubDirectoryFile(fromDirectory: string, toFilePath: string): boolean {
  return isAbsolute(toFilePath) && toFilePath.startsWith(fromDirectory);
}

/** The distribution option. */
type DistOptions = {
  /** Root directory. It is absolute. */
  rootDir: string;
  /** The path to the output directory. It is absolute. */
  outDir: string;
};

/**
 * Get .d.ts file path.
 * @param filePath The path to the source file. It is absolute.
 * @param distOptions The distribution option.
 * @returns The path to the .d.ts file. It is absolute.
 */
export function getDtsFilePath(filePath: string, distOptions: DistOptions | undefined): string {
  if (distOptions) {
    if (!isSubDirectoryFile(distOptions.rootDir, filePath))
      throw new Error(`The filePath(${filePath}) is not a subdirectory of rootDir(${distOptions.rootDir}).`);
    if (!isSubDirectoryFile(distOptions.rootDir, distOptions.outDir))
      throw new Error(`The outDir(${distOptions.outDir}) is not a subdirectory of rootDir(${distOptions.rootDir}).`);
    return join(distOptions.outDir, relative(distOptions.rootDir, filePath) + '.d.ts');
  } else {
    return filePath + '.d.ts';
  }
}

/**
 * Get .d.ts.map file path.
 * @param filePath The path to the source file. It is absolute.
 * @param distOptions The distribution option.
 * @returns The path to the .d.ts.map file. It is absolute.
 */
export function getSourceMapFilePath(filePath: string, distOptions: DistOptions | undefined): string {
  return getDtsFilePath(filePath, distOptions) + '.map';
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
  filePath: string,
  tokens: Token[],
  distOptions: DistOptions | undefined,
  emitDeclarationMap: boolean | undefined,
  dtsFormatOptions: DtsFormatOptions,
): Promise<void> {
  const dtsFilePath = getDtsFilePath(filePath, distOptions);
  const sourceMapFilePath = getSourceMapFilePath(filePath, distOptions);
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
    // blocked by: https://github.com/microsoft/TypeScript/issues/38966
    await writeFileIfChanged(sourceMapFilePath, sourceMap.toString());
  } else {
    await writeFileIfChanged(dtsFilePath, dtsContent);
  }
}
