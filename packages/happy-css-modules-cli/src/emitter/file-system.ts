import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { isSystemError } from '../util.js';

/**
 * Write a file if it doesn't exist or is changed.
 * @param filePath The file path.
 * @param newContent The new content of the file.
 */
export async function writeFileIfChanged(filePath: string, newContent: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf8');
    if (content !== newContent) {
      await writeFile(filePath, newContent, 'utf8');
    }
  } catch (e) {
    if (isSystemError(e) && e.code === 'ENOENT') {
      await mkdir(dirname(filePath), { recursive: true }); // if directory doesn't exist, create it
      await writeFile(filePath, newContent, 'utf8');
    } else {
      throw e;
    }
  }
}
