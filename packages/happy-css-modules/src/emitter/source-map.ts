import { EOL } from 'os';
import { getDtsFilePath } from './dts.js';
import type { OutDirOptions } from './index.js';
import { getRelativePath } from './index.js';

/**
 * Get .d.ts.map file path.
 * @param filePath The path to the source file (i.e. `foo.css`). It is absolute.
 * @param arbitraryExtensions Generate `.d.css.ts` instead of `.css.d.ts`.
 * @param outDir Output directory for generated files.
 * @returns The path to the .d.ts.map file. It is absolute.
 */
export function getSourceMapFilePath(
  filePath: string,
  arbitraryExtensions: boolean,
  options: OutDirOptions | undefined,
): string {
  return `${getDtsFilePath(filePath, arbitraryExtensions, options)}.map`;
}

export function generateSourceMappingURLComment(dtsFilePath: string, sourceMapFilePath: string): string {
  return `//# sourceMappingURL=${getRelativePath(dtsFilePath, sourceMapFilePath)}${EOL}`;
}
