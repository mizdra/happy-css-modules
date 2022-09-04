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
    expect(dtsContent).toMatchInlineSnapshot(`
      "declare const styles: {
        readonly "d": string;
        readonly "c": string;
        readonly "a": string;
        readonly "b": string;
        readonly "b": string;
      };
      export default styles;
      "
    `);
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
        export default styles;
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
        export default styles;
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
        export default styles;
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
        export default styles;
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
        export default styles;
        "
      `);
    });
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
      export default styles;
      "
    `);
    expect(sourceMap).toMatchSnapshot(); // TODO: Make snapshot human-readable
  });
});
