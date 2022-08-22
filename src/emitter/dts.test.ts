import { DtsFormatOptions } from '../emitter';
import { Token } from '../loader';
import { fakeToken } from '../test/util';
import { generateDtsContentWithSourceMap, getDtsFilePath } from './dts';

test('getDtsFilePath', () => {
  expect(getDtsFilePath('/app/src/dir/1.css', undefined)).toBe('/app/src/dir/1.css.d.ts');
  expect(getDtsFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toBe(
    '/app/dist/src/dir/1.css.d.ts',
  );
  expect(() => getDtsFilePath('/tmp/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toThrow();
  expect(() => getDtsFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/tmp/dist' })).toThrow();
});

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
