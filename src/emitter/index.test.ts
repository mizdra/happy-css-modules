import { readFile, stat } from 'fs/promises';
import mock from 'mock-fs';
import { exists, fakeToken } from '../test/util';
import { emitGeneratedFiles, getRelativePath, isSubDirectoryFile } from '.';

test('getRelativePath', () => {
  expect(getRelativePath('/test/1.css.d.ts', '/test/1.css')).toBe('1.css');
  expect(getRelativePath('/test/1.css.d.ts', '/test/dir/1.css')).toBe('dir/1.css');
  expect(getRelativePath('/test/1.css.d.ts', '/1.css')).toBe('../1.css');
});

test('isSubDirectoryFile', () => {
  expect(isSubDirectoryFile('/test', '/test/src/1.css')).toBe(true);
  expect(isSubDirectoryFile('/test', '/test/dist/1.css')).toBe(true);
  expect(isSubDirectoryFile('/test', '/1.css')).toBe(false);
});

describe('emitGeneratedFiles', () => {
  const defaultArgs = {
    filePath: '/test/1.css',
    tokens: [fakeToken({ name: 'foo', originalLocations: [{ start: { line: 1, column: 1 } }] })],
    distOptions: undefined,
    emitDeclarationMap: true,
    dtsFormatOptions: undefined,
  };
  beforeEach(() => {
    mock({
      '/test': {}, // empty directory
    });
  });
  test('generates .d.ts and .d.ts.map', async () => {
    await emitGeneratedFiles({ ...defaultArgs });
    expect(await exists('/test/1.css.d.ts')).toBeTruthy();
    // A link to the source map is embedded.
    expect(await readFile('/test/1.css.d.ts', 'utf8')).toEqual(
      expect.stringContaining('//# sourceMappingURL=1.css.d.ts.map'),
    );
    expect(await exists('/test/1.css.d.ts.map')).toBeTruthy();
  });
  test('generates only .d.ts and .d.ts.map if emitDeclarationMap is false', async () => {
    await emitGeneratedFiles({ ...defaultArgs, emitDeclarationMap: false });
    expect(await exists('/test/1.css.d.ts')).toBeTruthy();
    // A link to the source map is not embedded.
    expect(await readFile('/test/1.css.d.ts', 'utf8')).toEqual(
      expect.not.stringContaining('//# sourceMappingURL=1.css.d.ts.map'),
    );
    expect(await exists('/test/1.css.d.ts.map')).toBeFalsy();
  });
  test('skips writing to disk if the generated files are the same', async () => {
    const tokens1 = [fakeToken({ name: 'foo', originalLocations: [{ start: { line: 1, column: 1 } }] })];
    await emitGeneratedFiles({ ...defaultArgs, tokens: tokens1 });
    const mtimeForDts1 = (await stat('/test/1.css.d.ts')).mtime;
    const mtimeForSourceMap1 = (await stat('/test/1.css.d.ts.map')).mtime;

    await emitGeneratedFiles({ ...defaultArgs, tokens: tokens1 });
    const mtimeForDts2 = (await stat('/test/1.css.d.ts')).mtime;
    const mtimeForSourceMap2 = (await stat('/test/1.css.d.ts.map')).mtime;
    expect(mtimeForDts1).toEqual(mtimeForDts2); // skipped
    expect(mtimeForSourceMap1).toEqual(mtimeForSourceMap2); // skipped

    const tokens2 = [fakeToken({ name: 'bar', originalLocations: [{ start: { line: 1, column: 1 } }] })];
    await emitGeneratedFiles({ ...defaultArgs, tokens: tokens2 });
    const mtimeForDts3 = (await stat('/test/1.css.d.ts')).mtime;
    const mtimeForSourceMap3 = (await stat('/test/1.css.d.ts.map')).mtime;
    expect(mtimeForDts1).not.toEqual(mtimeForDts3); // not skipped
    expect(mtimeForSourceMap1).not.toEqual(mtimeForSourceMap3); // not skipped
  });
});
