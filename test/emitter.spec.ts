import { EOL } from 'os';
import {
  getDtsFilePath,
  getSourceMapFilePath,
  generateSourceMappingURLComment,
  generateDtsContentWithSourceMap,
  DtsFormatOptions,
} from '../src/emitter';
import { ExportToken, Position } from '../src/library/css-modules-loader-core/file-system-loader';

test('getDtsFilePath', () => {
  expect(getDtsFilePath('/app', undefined, 'src/dir/a.module.css')).toBe('/app/src/dir/a.module.css.d.ts');
  expect(getDtsFilePath('/app', 'dist', 'src/dir/a.module.css')).toBe('/app/dist/src/dir/a.module.css.d.ts');
});

test('getSourceMapFilePath', () => {
  expect(getSourceMapFilePath('/app', undefined, 'src/dir/a.module.css')).toBe('/app/src/dir/a.module.css.d.ts.map');
  expect(getSourceMapFilePath('/app', 'dist', 'src/dir/a.module.css')).toBe('/app/dist/src/dir/a.module.css.d.ts.map');
});

test('generateSourceMappingURLComment', () => {
  expect(generateSourceMappingURLComment('/app/src/dir/a.module.css.d.ts', '/app/src/dir/a.module.css.d.ts.map')).toBe(
    '//# sourceMappingURL=a.module.css.d.ts.map' + EOL,
  );
  expect(
    generateSourceMappingURLComment('/app/src/dir1/a.module.css.d.ts', '/app/src/dir2/a.module.css.d.ts.map'),
  ).toBe('//# sourceMappingURL=../dir2/a.module.css.d.ts.map' + EOL);
});

function fakePosition(args?: Partial<Position>): Position {
  return {
    filePath: 'test.module.css',
    line: 1,
    column: 0,
    ...args,
  };
}

describe('generateDtsContentWithSourceMap', () => {
  const filePath = 'test.module.css';
  const dtsFilePath = 'test.module.css.d.ts';
  const sourceMapFilePath = 'test.module.css.map';
  const dtsFormatOptions: DtsFormatOptions = {
    camelCase: false,
    namedExport: false,
  };
  test('generate dts content with source map', () => {
    const rawTokenList: ExportToken[] = [
      { name: 'foo', originalPositions: [fakePosition({ filePath: 'test.module.css', line: 1, column: 0 })] },
      { name: 'bar', originalPositions: [fakePosition({ filePath: 'test.module.css', line: 2, column: 0 })] },
      {
        name: 'baz',
        originalPositions: [
          fakePosition({ filePath: 'test.module.css', line: 3, column: 0 }),
          fakePosition({ filePath: 'test.module.css', line: 4, column: 0 }),
        ],
      },
      { name: 'qux', originalPositions: [fakePosition({ filePath: 'other.module.css', line: 5, column: 0 })] },
      {
        name: 'quux',
        originalPositions: [
          fakePosition({ filePath: 'other.module.css', line: 6, column: 0 }),
          fakePosition({ filePath: 'other.module.css', line: 7, column: 0 }),
        ],
      },
    ];
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      filePath,
      dtsFilePath,
      sourceMapFilePath,
      rawTokenList,
      dtsFormatOptions,
    );
    expect(dtsContent).toMatchSnapshot();
    expect(sourceMap).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
  test('format case by camelCase', () => {
    const rawTokenList: ExportToken[] = [
      { name: 'foo-bar', originalPositions: [fakePosition({ line: 1, column: 0 })] },
      { name: 'foo_bar', originalPositions: [fakePosition({ line: 1, column: 0 })] },
    ];
    const { dtsContent: dtsContentWithoutCamelCase } = generateDtsContentWithSourceMap(
      filePath,
      dtsFilePath,
      sourceMapFilePath,
      rawTokenList,
      {
        ...dtsFormatOptions,
        camelCase: false,
      },
    );
    expect(dtsContentWithoutCamelCase).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly \\"foo-bar\\": string;
        readonly \\"foo_bar\\": string;
      };
      export = styles;
      "
    `);
    const { dtsContent: dtsContentWithCamelCase } = generateDtsContentWithSourceMap(
      filePath,
      dtsFilePath,
      sourceMapFilePath,
      rawTokenList,
      {
        ...dtsFormatOptions,
        camelCase: true,
      },
    );
    expect(dtsContentWithCamelCase).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly \\"fooBar\\": string;
        readonly \\"fooBar\\": string;
      };
      export = styles;
      "
    `);
  });

  test('change export type by namedExport', () => {
    const rawTokenList: ExportToken[] = [
      { name: 'foo', originalPositions: [fakePosition({ line: 1, column: 0 })] },
      { name: 'bar', originalPositions: [fakePosition({ line: 2, column: 0 })] },
    ];
    const { dtsContent: dtsContentWithoutNamedExport, sourceMap: sourceMapWithoutNamedExport } =
      generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
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
      generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, rawTokenList, {
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
    const rawTokenList: ExportToken[] = [
      { name: 'foo', originalPositions: [fakePosition({ filePath: 'src/test.module.css', line: 1, column: 0 })] },
      { name: 'bar', originalPositions: [fakePosition({ filePath: 'src/test.module.css', line: 2, column: 0 })] },
    ];
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      'src/test.module.css',
      'dist/test.module.css.d.ts',
      'dist/test.module.css.d.ts.map',
      rawTokenList,
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
