import { EOL } from 'os';
import { getDtsFilePath } from './dts.js';
import { getRelativePath } from './index.js';

/**
 * Get .d.ts.map file path.
 * @param filePath The path to the source file (i.e. `foo.css`). It is absolute.
 * @param arbitraryExtensions Generate `.d.css.ts` instead of `.css.d.ts`.
 * @returns The path to the .d.ts.map file. It is absolute.
 */
export function getSourceMapFilePath(filePath: string, arbitraryExtensions: boolean): string {
  return getDtsFilePath(filePath, arbitraryExtensions) + '.map';
}

export function generateSourceMappingURLComment(dtsFilePath: string, sourceMapFilePath: string): string {
  return `//# sourceMappingURL=${getRelativePath(dtsFilePath, sourceMapFilePath)}` + EOL;
}
