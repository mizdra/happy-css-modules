import { dirname, isAbsolute, relative } from 'path';
import { type Token } from '../locator/index.js';
import { type LocalsConvention } from '../runner.js';
import { exists } from '../util.js';
import { generateDtsContentWithSourceMap, getDtsFilePath } from './dts.js';
import { writeFileIfChanged } from './file-system.js';
import { generateSourceMappingURLComment, getSourceMapFilePath } from './source-map.js';

export function getRelativePath(fromFilePath: string, toFilePath: string): string {
  const resolved = relative(dirname(fromFilePath), toFilePath);
  if (resolved.startsWith('..')) {
    return resolved;
  } else {
    return './' + resolved;
  }
}

export function isSubDirectoryFile(fromDirectory: string, toFilePath: string): boolean {
  return isAbsolute(toFilePath) && toFilePath.startsWith(fromDirectory);
}

export type DtsFormatOptions = {
  localsConvention?: LocalsConvention;
};

/** The options for emitter. */
export type EmitterOptions = {
  /** The path to the source file (i.e. `/dir/foo.css`). It is absolute. */
  filePath: string;
  /** The tokens exported by the source file. */
  tokens: Token[];
  /** Whether to output declaration map (i.e. `/dir/foo.css.d.ts.map`) or not. */
  emitDeclarationMap: boolean | undefined;
  /** The options for formatting the type definition. */
  dtsFormatOptions: DtsFormatOptions | undefined;
  /** Whether the file is from an external library or not. */
  isExternalFile: (filePath: string) => boolean;
};

export async function emitGeneratedFiles({
  filePath,
  tokens,
  emitDeclarationMap,
  dtsFormatOptions,
  isExternalFile,
}: EmitterOptions): Promise<void> {
  const dtsFilePath = getDtsFilePath(filePath);
  const sourceMapFilePath = getSourceMapFilePath(filePath);
  const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
    filePath,
    dtsFilePath,
    sourceMapFilePath,
    tokens,
    dtsFormatOptions,
    isExternalFile,
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

/**
 * Returns true if .d.ts (and .d.ts.map) files are generated for the given file.
 */
export async function isGeneratedFilesExist(
  filePath: string,
  emitDeclarationMap: boolean | undefined,
): Promise<boolean> {
  const dtsFilePath = getDtsFilePath(filePath);
  const sourceMapFilePath = getSourceMapFilePath(filePath);
  if (emitDeclarationMap && !(await exists(sourceMapFilePath))) {
    return false;
  }
  if (!(await exists(dtsFilePath))) {
    return false;
  }
  return true;
}
