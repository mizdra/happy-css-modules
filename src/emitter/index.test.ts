import { readFile, stat } from 'fs/promises';
import { EOL } from 'os';
import mock from 'mock-fs';
import { Token } from '../loader';
import { Location } from '../postcss';
import { exists } from '../test/util';
import {
  getDtsFilePath,
  getSourceMapFilePath,
  generateSourceMappingURLComment,
  generateDtsContentWithSourceMap,
  DtsFormatOptions,
  emitGeneratedFiles,
} from '.';

test('getDtsFilePath', () => {
  expect(getDtsFilePath('/app/src/dir/1.css', undefined)).toBe('/app/src/dir/1.css.d.ts');
  expect(getDtsFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toBe(
    '/app/dist/src/dir/1.css.d.ts',
  );
  expect(() => getDtsFilePath('/tmp/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toThrow();
  expect(() => getDtsFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/tmp/dist' })).toThrow();
});

test('getSourceMapFilePath', () => {
  expect(getSourceMapFilePath('/app/src/dir/1.css', undefined)).toBe('/app/src/dir/1.css.d.ts.map');
  expect(getSourceMapFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toBe(
    '/app/dist/src/dir/1.css.d.ts.map',
  );
  expect(() => getSourceMapFilePath('/tmp/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toThrow();
  expect(() => getSourceMapFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/tmp/dist' })).toThrow();
});

test('generateSourceMappingURLComment', () => {
  expect(generateSourceMappingURLComment('/app/src/dir/1.css.d.ts', '/app/src/dir/1.css.d.ts.map')).toBe(
    '//# sourceMappingURL=1.css.d.ts.map' + EOL,
  );
  expect(generateSourceMappingURLComment('/app/src/dir1/1.css.d.ts', '/app/src/dir2/1.css.d.ts.map')).toBe(
    '//# sourceMappingURL=../dir2/1.css.d.ts.map' + EOL,
  );
});

function fakeToken(args: {
  name: Token['name'];
  originalLocations: { filePath?: Location['filePath']; start: Location['start'] }[];
}): Token {
  return {
    name: args.name,
    originalLocations: args.originalLocations.map((location) => ({
      filePath: location.filePath ?? '/test/1.css',
      start: location.start,
      end: {
        line: location.start.line,
        column: location.start.column + args.name.length - 1,
      },
    })),
  };
}

describe('generateDtsContentWithSourceMap', () => {
  const filePath = '/test/1.css';
  const dtsFilePath = '/test/1.css.d.ts';
  const sourceMapFilePath = '/test/1.css.map';
  const dtsFormatOptions: DtsFormatOptions = {
    localsConvention: undefined,
    namedExport: false,
  };
  test('generate dts content with source map', () => {
    const tokens: Token[] = [
      fakeToken({ name: 'foo', originalLocations: [{ filePath: '/test/1.css', start: { line: 1, column: 1 } }] }),
      fakeToken({ name: 'bar', originalLocations: [{ filePath: '/test/1.css', start: { line: 2, column: 1 } }] }),

      fakeToken({
        name: 'baz',
        originalLocations: [
          { filePath: '/test/1.css', start: { line: 3, column: 1 } },
          { filePath: '/test/1.css', start: { line: 4, column: 1 } },
        ],
      }),
      fakeToken({ name: 'qux', originalLocations: [{ filePath: '/test/2.css', start: { line: 5, column: 1 } }] }),
      fakeToken({
        name: 'quux',
        originalLocations: [
          { filePath: '/test/2.css', start: { line: 6, column: 1 } },
          { filePath: '/test/2.css', start: { line: 7, column: 1 } },
        ],
      }),
    ];
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      filePath,
      dtsFilePath,
      sourceMapFilePath,
      tokens,
      dtsFormatOptions,
    );
    expect(dtsContent).toMatchSnapshot();
    expect(sourceMap).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
  describe('format case', () => {
    const rawTokenList: Token[] = [
      fakeToken({ name: 'foo-bar', originalLocations: [{ start: { line: 1, column: 1 } }] }),
      fakeToken({ name: 'foo_bar', originalLocations: [{ start: { line: 2, column: 1 } }] }),
    ];
    test('undefined', () => {
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
        ...dtsFormatOptions,
        localsConvention: undefined,
      });
      expect(dtsContent).toMatchSnapshot();
    });
    test('camelCaseOnly', () => {
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
        ...dtsFormatOptions,
        localsConvention: 'camelCaseOnly',
      });
      expect(dtsContent).toMatchSnapshot();
    });
    test('camelCase', () => {
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
        ...dtsFormatOptions,
        localsConvention: 'camelCase',
      });
      expect(dtsContent).toMatchSnapshot();
    });
    test('dashesOnly', () => {
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
        ...dtsFormatOptions,
        localsConvention: 'dashesOnly',
      });
      expect(dtsContent).toMatchSnapshot();
    });
    test('dashes', () => {
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
        ...dtsFormatOptions,
        localsConvention: 'dashes',
      });
      expect(dtsContent).toMatchSnapshot();
    });
  });

  test('change export type by namedExport', () => {
    const tokens: Token[] = [
      fakeToken({ name: 'foo', originalLocations: [{ start: { line: 1, column: 1 } }] }),
      fakeToken({ name: 'bar', originalLocations: [{ start: { line: 2, column: 1 } }] }),
    ];
    const { dtsContent: dtsContentWithoutNamedExport, sourceMap: sourceMapWithoutNamedExport } =
      generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, tokens, {
        ...dtsFormatOptions,
        namedExport: false,
      });
    expect(dtsContentWithoutNamedExport).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly \\"foo\\": string;
        readonly \\"bar\\": string;
      };
      export = styles;
      "
    `);
    expect(sourceMapWithoutNamedExport).toMatchSnapshot(); // TODO: Make snapshot human-readable
    const { dtsContent: dtsContentWithNamedExport, sourceMap: sourceMapWithNamedExport } =
      generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, tokens, {
        ...dtsFormatOptions,
        namedExport: true,
      });
    expect(dtsContentWithNamedExport).toMatchInlineSnapshot(`
      "export const __esModule: true;
      export const foo: string;
      export const bar: string;
      "
    `);
    expect(sourceMapWithNamedExport).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
  test('emit other directory', () => {
    const tokens: Token[] = [
      fakeToken({
        name: 'foo',
        originalLocations: [{ filePath: '/test/src/1.css', start: { line: 1, column: 1 } }],
      }),
      fakeToken({
        name: 'bar',
        originalLocations: [{ filePath: '/test/src/1.css', start: { line: 2, column: 1 } }],
      }),
    ];
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      '/test/src/1.css',
      '/test/dist/1.css.d.ts',
      '/test/dist/1.css.d.ts.map',
      tokens,
      dtsFormatOptions,
    );
    expect(dtsContent).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly \\"foo\\": string;
        readonly \\"bar\\": string;
      };
      export = styles;
      "
    `);
    expect(sourceMap).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
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
