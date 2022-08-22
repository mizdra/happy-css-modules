import { dirname, isAbsolute, relative } from 'path';
import { writeFileIfChanged } from '../file-system';
import { Token } from '../loader';
import { LocalsConvention } from '../runner';
import { generateDtsContentWithSourceMap, getDtsFilePath } from './dts';
import { generateSourceMappingURLComment, getSourceMapFilePath } from './source-map';

export { getDtsFilePath } from './dts';

export function getRelativePath(fromFilePath: string, toFilePath: string): string {
  return relative(dirname(fromFilePath), toFilePath);
}

export function isSubDirectoryFile(fromDirectory: string, toFilePath: string): boolean {
  return isAbsolute(toFilePath) && toFilePath.startsWith(fromDirectory);
}

/** The distribution option. */
export type DistOptions = {
  /** Root directory. It is absolute. */
  rootDir: string;
  /** The path to the output directory. It is absolute. */
  outDir: string;
};

export type DtsFormatOptions = {
  localsConvention?: LocalsConvention;
  namedExport?: boolean;
};

/** The options for emitter. */
export type EmitterOptions = {
  /** The path to the source file (i.e. `/dir/foo.css`). It is absolute. */
  filePath: string;
  /** The tokens exported by the source file. */
  tokens: Token[];
  /** The distribution option. */
  distOptions: DistOptions | undefined;
  /** Whether to output declaration map (i.e. `/dir/foo.css.d.ts.map`) or not. */
  emitDeclarationMap: boolean | undefined;
  /** The options for formatting the type definition. */
  dtsFormatOptions: DtsFormatOptions | undefined;
};

export async function emitGeneratedFiles({
  filePath,
  tokens,
  distOptions,
  emitDeclarationMap,
  dtsFormatOptions,
}: EmitterOptions): Promise<void> {
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
