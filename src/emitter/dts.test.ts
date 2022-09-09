import dedent from 'dedent';
import { SourceMapConsumer } from 'source-map';
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
    const smc = await new SourceMapConsumer(sourceMap.toJSON());
    expect(smc.originalPositionFor({ line: 2, column: 11 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 1,
        "name": "d",
        "source": "3.css",
      }
    `);
    expect(smc.originalPositionFor({ line: 3, column: 11 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 2,
        "name": "c",
        "source": "2.css",
      }
    `);
    expect(smc.originalPositionFor({ line: 4, column: 11 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 2,
        "name": "a",
        "source": "1.css",
      }
    `);
    expect(smc.originalPositionFor({ line: 5, column: 11 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 3,
        "name": "b",
        "source": "1.css",
      }
    `);
    expect(smc.originalPositionFor({ line: 6, column: 11 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 4,
        "name": "b",
        "source": "1.css",
      }
    `);
  });
  describe('format case', () => {
    async function getResult(filePath: string) {
      createFixtures({
        '/test/1.css': dedent`
        .foo-bar {}
        .foo_bar {}
        `,
      });
      return await loader.load(filePath);
    }
    test('undefined', async () => {
      const result = await getResult(filePath);
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
      const result = await getResult(filePath);
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
      const result = await getResult(filePath);
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
      const result = await getResult(filePath);
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
      const result = await getResult(filePath);
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
    const smc = await new SourceMapConsumer(sourceMap.toJSON());
    // FIXME: `source` should be `../src/1.css`
    expect(smc.originalPositionFor({ line: 2, column: 11 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 1,
        "name": "a",
        "source": "../1.css",
      }
    `);
  });
});
