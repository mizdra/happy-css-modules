import { readFile, rm, stat } from 'fs/promises';
import { createFixtures, getFixturePath } from '../test/util.js';
import { writeFileIfChanged } from './file-system.js';

const TEST_FILE_PATH = getFixturePath('/test.txt');
const TEST_NESTED_FILE_PATH = getFixturePath('/dir/test.txt');
const OLD_CONTENT = 'old';
const NEW_CONTENT = 'new';

beforeEach(async () => {
  createFixtures({});
  await writeFileIfChanged(TEST_FILE_PATH, OLD_CONTENT);
});

describe('writeFileIfChanged', () => {
  test('should write file if changed', async () => {
    await writeFileIfChanged(TEST_FILE_PATH, NEW_CONTENT);
    expect(await readFile(TEST_FILE_PATH, 'utf8')).toBe(NEW_CONTENT);
  });
  test('should not write file if not changed', async () => {
    const oldStat = await stat(TEST_FILE_PATH);
    await writeFileIfChanged(TEST_FILE_PATH, OLD_CONTENT);
    const newStat = await stat(TEST_FILE_PATH);
    expect(oldStat.mtimeMs).toBe(newStat.mtimeMs);
  });
  test("should create new file if it doesn't exist", async () => {
    await rm(TEST_FILE_PATH);
    await writeFileIfChanged(TEST_FILE_PATH, NEW_CONTENT);
    expect(await readFile(TEST_FILE_PATH, 'utf8')).toBe(NEW_CONTENT);
  });
  test('should write file in nested directories', async () => {
    await writeFileIfChanged(TEST_NESTED_FILE_PATH, NEW_CONTENT);
    expect(await readFile(TEST_NESTED_FILE_PATH, 'utf8')).toBe(NEW_CONTENT);
    await writeFileIfChanged(TEST_NESTED_FILE_PATH, NEW_CONTENT);
  });
});
