import dedent from 'dedent';
import { SourceMapConsumer } from 'source-map';
import { Loader } from '../loader/index.js';
import { getFixturePath, createFixtures } from '../test/util.js';
import { generateDtsContentWithSourceMap, getDtsFilePath } from './dts.js';
import { type DtsFormatOptions } from './index.js';

const loader = new Loader();
const isExternalFile = () => false;

test('getDtsFilePath', () => {
  expect(getDtsFilePath('/app/src/dir/1.css')).toBe('/app/src/dir/1.css.d.ts');
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
      isExternalFile,
    );
    expect(dtsContent).toMatchInlineSnapshot(`
      "declare const styles:
        & Readonly<Pick<(typeof import("./3.css"))["default"], "d">>
        & Readonly<Pick<(typeof import("./2.css"))["default"], "c">>
        & Readonly<{ "a": string }>
        & Readonly<{ "b": string }>
        & Readonly<{ "b": string }>
      ;
      export default styles;
      "
    `);
    const smc = await new SourceMapConsumer(sourceMap.toJSON());
    expect(smc.originalPositionFor({ line: 4, column: 15 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 2,
        "name": "a",
        "source": "1.css",
      }
    `);
    expect(smc.originalPositionFor({ line: 5, column: 15 })).toMatchInlineSnapshot(`
      {
        "column": 0,
        "line": 3,
        "name": "b",
        "source": "1.css",
      }
    `);
    expect(smc.originalPositionFor({ line: 6, column: 15 })).toMatchInlineSnapshot(`
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
      const { dtsContent } = generateDtsContentWithSourceMap(
        filePath,
        dtsFilePath,
        sourceMapFilePath,
        result.tokens,
        {
          ...dtsFormatOptions,
          localsConvention: undefined,
        },
        isExternalFile,
      );
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles:
          & Readonly<{ "foo-bar": string }>
          & Readonly<{ "foo_bar": string }>
        ;
        export default styles;
        "
      `);
    });
    test('camelCaseOnly', async () => {
      const result = await getResult(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(
        filePath,
        dtsFilePath,
        sourceMapFilePath,
        result.tokens,
        {
          ...dtsFormatOptions,
          localsConvention: 'camelCaseOnly',
        },
        isExternalFile,
      );
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles:
          & Readonly<{ "fooBar": string }>
          & Readonly<{ "fooBar": string }>
        ;
        export default styles;
        "
      `);
    });
    test('camelCase', async () => {
      const result = await getResult(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(
        filePath,
        dtsFilePath,
        sourceMapFilePath,
        result.tokens,
        {
          ...dtsFormatOptions,
          localsConvention: 'camelCase',
        },
        isExternalFile,
      );
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles:
          & Readonly<{ "foo-bar": string }>
          & Readonly<{ "fooBar": string }>
          & Readonly<{ "foo_bar": string }>
          & Readonly<{ "fooBar": string }>
        ;
        export default styles;
        "
      `);
    });
    test('dashesOnly', async () => {
      const result = await getResult(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(
        filePath,
        dtsFilePath,
        sourceMapFilePath,
        result.tokens,
        {
          ...dtsFormatOptions,
          localsConvention: 'dashesOnly',
        },
        isExternalFile,
      );
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles:
          & Readonly<{ "fooBar": string }>
          & Readonly<{ "foo_bar": string }>
        ;
        export default styles;
        "
      `);
    });
    test('dashes', async () => {
      const result = await getResult(filePath);
      const { dtsContent } = generateDtsContentWithSourceMap(
        filePath,
        dtsFilePath,
        sourceMapFilePath,
        result.tokens,
        {
          ...dtsFormatOptions,
          localsConvention: 'dashes',
        },
        isExternalFile,
      );
      expect(dtsContent).toMatchInlineSnapshot(`
        "declare const styles:
          & Readonly<{ "foo-bar": string }>
          & Readonly<{ "fooBar": string }>
          & Readonly<{ "foo_bar": string }>
          & Readonly<{ "foo_bar": string }>
        ;
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
      isExternalFile,
    );
    expect(dtsContent).toMatchInlineSnapshot(`
      "declare const styles:
        & Readonly<Pick<(typeof import("../1.css"))["default"], "a">>
      ;
      export default styles;
      "
    `);
    expect(sourceMap.toJSON().sources).toStrictEqual(['../src/1.css']);
    expect(sourceMap.toJSON().file).toStrictEqual('1.css.d.ts');
  });
  test('treats imported tokens from external files the same as local tokens', async () => {
    createFixtures({
      '/test/1.css': dedent`
      @import './2.css';
      @import './3.css';
      .a {}
      `,
      '/test/2.css': `.b {}`,
      '/test/3.css': `.c {}`,
    });
    const result = await loader.load(filePath);
    const { dtsContent } = generateDtsContentWithSourceMap(
      filePath,
      dtsFilePath,
      sourceMapFilePath,
      result.tokens,
      dtsFormatOptions,
      (filePath) => filePath.endsWith('3.css'),
    );
    expect(dtsContent).toMatchInlineSnapshot(`
      "declare const styles:
        & Readonly<Pick<(typeof import("./2.css"))["default"], "b">>
        & Readonly<{ "c": string }>
        & Readonly<{ "a": string }>
      ;
      export default styles;
      "
    `);
  });
});
