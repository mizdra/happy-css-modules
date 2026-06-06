/**
 * Convert a 1-based line and column into a 0-based index in a string.
 *
 * @param str - The string to search in.
 * @param line - The line number, 1-based.
 * @param column - The column number, 1-based.
 * @returns The 0-based index.
 */
export function getIndexFromLineColumn(str: string, line: number, column: number): number {
  const offsetToLine = str
    .split('\n')
    .slice(0, line - 1)
    .reduce((offset, precedingLine) => offset + precedingLine.length + 1 /* '\n'.length */, 0);
  return offsetToLine + (column - 1);
}
