import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { getFixturePath, createFixtures } from '../test/util.js';
import { generateDtsContentWithSourceMap, getDtsFilePath } from './dts.js';
import { type DtsFormatOptions } from './index.js';

const loader = new Loader();

test('getDtsFilePath', () => {
  expect(getDtsFilePath('/app/src/dir/1.css', undefined)).toBe('/app/src/dir/1.css.d.ts');
  expect(getDtsFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toBe(
    '/app/dist/src/dir/1.css.d.ts',
  );
  expect(() => getDtsFilePath('/tmp/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toThrow();
  expect(() => getDtsFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/tmp/dist' })).toThrow();
});

describe('generateDtsContentWithSourceMap', () => {
  const filePath = getFixturePath('/test/1.css');
  const dtsFilePath = getFixturePath('/test/1.css.d.ts');
  const sourceMapFilePath = getFixturePath('/test/1.css.map');
  const dtsFormatOptions: DtsFormatOptions = {
    localsConvention: undefined,
    namedExport: false,
  };
  test('generate dts content with source map', async () => {
    createFixtures({
      '/test/1.css': dedent`
      @import './2.css';
      .a {}
      .b {}
      .b {}
      `,
      '/test/2.css': dedent`
      @import './3.css';
      .c {}
      `,
      '/test/3.css': dedent`
      .d {}
      `,
    });
    const result = await loader.load(filePath);
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      filePath,
      dtsFilePath,
      sourceMapFilePath,
      result.tokens,
      dtsFormatOptions,
    );
    expect(dtsContent).toMatchSnapshot();
    expect(sourceMap).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
  describe('format case', () => {
    beforeEach(() => {
      createFixtures({
        '/test/1.css': dedent`
        .foo-bar {}
        .foo_bar {}
        `,
      });
    });
    test('undefined', async () => {
      const result = await loader.load(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        localsConvention: undefined,
      });
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles: {
          readonly "foo-bar": string;
          readonly "foo_bar": string;
        };
        export = styles;
        "
      `);
    });
    test('camelCaseOnly', async () => {
      const result = await loader.load(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        localsConvention: 'camelCaseOnly',
      });
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles: {
          readonly "fooBar": string;
          readonly "fooBar": string;
        };
        export = styles;
        "
      `);
    });
    test('camelCase', async () => {
      const result = await loader.load(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        localsConvention: 'camelCase',
      });
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles: {
          readonly "foo-bar": string;
          readonly "fooBar": string;
          readonly "foo_bar": string;
          readonly "fooBar": string;
        };
        export = styles;
        "
      `);
    });
    test('dashesOnly', async () => {
      const result = await loader.load(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        localsConvention: 'dashesOnly',
      });
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles: {
          readonly "fooBar": string;
          readonly "foo_bar": string;
        };
        export = styles;
        "
      `);
    });
    test('dashes', async () => {
      const result = await loader.load(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        localsConvention: 'dashes',
      });
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles: {
          readonly "foo-bar": string;
          readonly "fooBar": string;
          readonly "foo_bar": string;
          readonly "foo_bar": string;
        };
        export = styles;
        "
      `);
    });
  });

  test('change export type by namedExport', async () => {
    createFixtures({
      '/test/1.css': dedent`
      .a {}
      .b {}
      `,
    });
    const result = await loader.load(filePath);
    const { dtsContent: dtsContentWithoutNamedExport, sourceMap: sourceMapWithoutNamedExport } =
      generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        namedExport: false,
      });
    expect(dtsContentWithoutNamedExport).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly "a": string;
        readonly "b": string;
      };
      export = styles;
      "
    `);
    expect(sourceMapWithoutNamedExport).toMatchSnapshot(); // TODO: Make snapshot human-readable
    const { dtsContent: dtsContentWithNamedExport, sourceMap: sourceMapWithNamedExport } =
      generateDtsContentWithSourceMap(filePath, dtsFilePath, sourceMapFilePath, result.tokens, {
        ...dtsFormatOptions,
        namedExport: true,
      });
    expect(dtsContentWithNamedExport).toMatchInlineSnapshot(`
      "export const __esModule: true;
      export const a: string;
      export const b: string;
      "
    `);
    expect(sourceMapWithNamedExport).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
  test('emit other directory', async () => {
    createFixtures({
      '/test/1.css': `.a {}`,
    });
    const result = await loader.load(filePath);
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      getFixturePath('/test/src/1.css'),
      getFixturePath('/test/dist/1.css.d.ts'),
      getFixturePath('/test/dist/1.css.d.ts.map'),
      result.tokens,
      dtsFormatOptions,
    );
    expect(dtsContent).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly "a": string;
      };
      export = styles;
      "
    `);
    expect(sourceMap).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
});
