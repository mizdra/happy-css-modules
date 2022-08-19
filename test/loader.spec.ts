import fs from 'fs/promises';
import { resolve } from 'path';
import dedent from 'dedent';
import less from 'less';
import mockfs from 'mock-fs';
import sass from 'sass';
import { Loader, Transformer } from '../src/loader';

const readFileSpy = jest.spyOn(fs, 'readFile');

const transform: Transformer = async (source: string, from: string) => {
  if (from.endsWith('.scss')) {
    const result = sass.compile(from, { sourceMap: true });
    return { css: result.css, map: result.sourceMap!, dependencies: result.loadedUrls };
  } else if (from.endsWith('.less')) {
    const result = await less.render(source, {
      filename: from,
      sourceMap: {},
    });
    return { css: result.css, map: result.map, dependencies: result.imports };
  }
  return false;
};

const loader = new Loader(transform);

afterEach(() => {
  mockfs.restore();
  readFileSpy.mockClear();
});

test('basic', async () => {
  mockfs({
    '/test/1.css': dedent`
    .a {}
    .b {}
    `,
  });
  const result = await loader.load('/test/1.css');
  // TODO: Refactor with custom matcher
  expect(result).toMatchInlineSnapshot(`
    {
      "dependencies": [],
      "tokens": [
        {
          "name": "a",
          "originalLocations": [
            { "filePath": "/test/1.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        },
        {
          "name": "b",
          "originalLocations": [
            { "filePath": "/test/1.css", "start": { "line": 2, "column": 1 }, "end": { "line": 2, "column": 2 } }
          ]
        }
      ]
    }
  `);
});

test('tracks other files when `@import` is present', async () => {
  mockfs({
    '/test/1.css': dedent`
    @import './2.css';
    @import '3.css';
    @import '/test/4.css';
    `,
    '/test/2.css': dedent`
    .a {}
    `,
    '/test/3.css': dedent`
    .b {}
    `,
    '/test/4.css': dedent`
    .c {}
    `,
  });
  const result = await loader.load('/test/1.css');
  expect(result).toMatchInlineSnapshot(`
    {
      "dependencies": ["/test/2.css", "/test/3.css", "/test/4.css"],
      "tokens": [
        {
          "name": "a",
          "originalLocations": [
            { "filePath": "/test/2.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        },
        {
          "name": "b",
          "originalLocations": [
            { "filePath": "/test/3.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        },
        {
          "name": "c",
          "originalLocations": [
            { "filePath": "/test/4.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        }
      ]
    }
  `);
});

test('tracks other files when `composes` is present', async () => {
  mockfs({
    '/test/1.css': dedent`
    .a {
      composes: b from './2.css';
      composes: c d from './3.css';
      composes: e from '/test/4.css';
    }
    `,
    '/test/2.css': dedent`
    .b {}
    `,
    '/test/3.css': dedent`
    .c {}
    .d {}
    `,
    '/test/4.css': dedent`
    .e {}
    `,
  });
  const result = await loader.load('/test/1.css');
  expect(result).toMatchInlineSnapshot(`
    {
      "dependencies": ["/test/2.css", "/test/3.css", "/test/4.css"],
      "tokens": [
        {
          "name": "a",
          "originalLocations": [
            { "filePath": "/test/1.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        },
        {
          "name": "b",
          "originalLocations": [
            { "filePath": "/test/2.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        },
        {
          "name": "c",
          "originalLocations": [
            { "filePath": "/test/3.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        },
        {
          "name": "d",
          "originalLocations": [
            { "filePath": "/test/3.css", "start": { "line": 2, "column": 1 }, "end": { "line": 2, "column": 2 } }
          ]
        },
        {
          "name": "e",
          "originalLocations": [
            { "filePath": "/test/4.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        }
      ]
    }
  `);
});

test('normalizes tokens', async () => {
  mockfs({
    '/test/1.css': dedent`
    /* duplicate import */
    @import './2.css';
    @import '2.css';
    .a {
      /* duplicate composes */
      composes: c from './3.css';
      composes: c from '3.css';
      composes: c c from './3.css';
      /* duplicate import and composes */
      composes: b from './2.css';
    }
    .a {} /* duplicate class selector */
    `,
    '/test/2.css': dedent`
    .a {} /* class selector that duplicates the import source */
    .b {}
    `,
    '/test/3.css': dedent`
    .c {}
    `,
  });
  const result = await loader.load('/test/1.css');
  expect(result).toMatchInlineSnapshot(`
    {
      "dependencies": ["/test/2.css", "/test/3.css"],
      "tokens": [
        {
          "name": "a",
          "originalLocations": [
            { "filePath": "/test/2.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } },
            { "filePath": "/test/1.css", "start": { "line": 4, "column": 1 }, "end": { "line": 4, "column": 2 } },
            { "filePath": "/test/1.css", "start": { "line": 12, "column": 1 }, "end": { "line": 12, "column": 2 } }
          ]
        },
        {
          "name": "b",
          "originalLocations": [
            { "filePath": "/test/2.css", "start": { "line": 2, "column": 1 }, "end": { "line": 2, "column": 2 } }
          ]
        },
        {
          "name": "c",
          "originalLocations": [
            { "filePath": "/test/3.css", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
          ]
        }
      ]
    }
  `);
});

test('returns the result from the cache when the file has not been modified', async () => {
  const content1 = dedent`
  @import './2.css';
  @import './2.css';
  .a {
    composes: b from './2.css';
    composes: c from './3.css';
    composes: d from './3.css';
  }
  `;
  const content2 = dedent`
  .b {}
  `;
  const content3 = dedent`
  .c {}
  .d {}
  `;
  mockfs({
    '/test/1.css': mockfs.file({ content: content1, mtime: new Date(0) }),
    '/test/2.css': mockfs.file({ content: content2, mtime: new Date(0) }),
    '/test/3.css': mockfs.file({ content: content3, mtime: new Date(0) }),
  });
  await loader.load('/test/1.css');
  expect(readFileSpy).toHaveBeenCalledTimes(3);
  expect(readFileSpy).toHaveBeenNthCalledWith(1, '/test/1.css', 'utf-8');
  expect(readFileSpy).toHaveBeenNthCalledWith(2, '/test/2.css', 'utf-8');
  expect(readFileSpy).toHaveBeenNthCalledWith(3, '/test/3.css', 'utf-8');
  readFileSpy.mockClear();

  // update `/test/2.css`
  mockfs({
    '/test/1.css': mockfs.file({ content: content1, mtime: new Date(0) }),
    '/test/2.css': mockfs.file({ content: content2, mtime: new Date(1) }),
    '/test/3.css': mockfs.file({ content: content3, mtime: new Date(0) }),
  });
  // `3.css` is not updated, so the cache is used. Therefore, `readFile` is not called.
  await loader.load('/test/3.css');
  expect(readFileSpy).toHaveBeenCalledTimes(0);

  // `1.css` is not updated, but dependencies are updated, so the cache is used. Therefore, `readFile` is called.
  await loader.load('/test/1.css');
  expect(readFileSpy).toHaveBeenCalledTimes(2);
  expect(readFileSpy).toHaveBeenNthCalledWith(1, '/test/1.css', 'utf-8');
  expect(readFileSpy).toHaveBeenNthCalledWith(2, '/test/2.css', 'utf-8');

  // ``2.css` is updated, but the cache is already available because it was updated in the previous step. Therefore, `readFile` is not called.
  await loader.load('/test/2.css');
  expect(readFileSpy).toHaveBeenCalledTimes(2);
});

describe('supports transpiler', () => {
  test('sass', async () => {
    mockfs({
      '/test/1.scss': dedent`
        @use './2.scss' as two; // sass feature test (@use)
        @import './3.scss'; // css feature test (@import)
        .a_1 { dummy: ''; }
        .a_2 {
          dummy: '';
          .a_3 {} // sass feature test (nesting)
          composes: a_1; // css module feature test (composes)
          composes: d from './4.scss'; // css module feature test (composes from other file)
        }
        `,
      '/test/2.scss': dedent`
        .b_1 { dummy: ''; }
        @mixin b_2 { dummy: ''; }
        `,
      '/test/3.scss': dedent`
        .c { dummy: ''; }
        `,
      '/test/4.scss': dedent`
        .d { dummy: ''; }
        `,
    });
    const result = await loader.load('/test/1.scss');
    expect(result).toMatchInlineSnapshot(`
      {
        "dependencies": ["/test/2.scss", "/test/3.scss", "/test/4.scss"],
        "tokens": [
          {
            "name": "b_1",
            "originalLocations": [
              { "filePath": "/test/2.scss", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 4 } }
            ]
          },
          {
            "name": "c",
            "originalLocations": [
              { "filePath": "/test/3.scss", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
            ]
          },
          {
            "name": "a_1",
            "originalLocations": [
              { "filePath": "/test/1.scss", "start": { "line": 3, "column": 1 }, "end": { "line": 3, "column": 4 } }
            ]
          },
          {
            "name": "a_2",
            "originalLocations": [
              { "filePath": "/test/1.scss", "start": { "line": 4, "column": 1 }, "end": { "line": 4, "column": 4 } }
            ]
          },
          {
            "name": "d",
            "originalLocations": [
              { "filePath": "/test/4.scss", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
            ]
          }
        ]
      }
    `);
  });
  test('less', async () => {
    mockfs({
      '/test/1.less': dedent`
        @import './2.less'; // less feature test (@use)
        .a_1 { dummy: ''; }
        .a_2 {
          dummy: '';
          .a_3 {} // less feature test (nesting)
          .b_1();
          .b_2();
          composes: a_1; // css module feature test (composes)
          composes: c from './3.less'; // css module feature test (composes from other file)
        }
        `,
      '/test/2.less': dedent`
        .b_1 { dummy: ''; }
        .b_2() { dummy: ''; }
        `,
      '/test/3.less': dedent`
        .c { dummy: ''; }
        `,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'node_modules': mockfs.load(resolve(__dirname, '../node_modules')),
    });
    const result = await loader.load('/test/1.less');
    expect(result).toMatchInlineSnapshot(`
      {
        "dependencies": ["/test/2.less", "/test/3.less"],
        "tokens": [
          {
            "name": "b_1",
            "originalLocations": [
              { "filePath": "/test/2.less", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 4 } }
            ]
          },
          {
            "name": "a_1",
            "originalLocations": [
              { "filePath": "/test/1.less", "start": { "line": 2, "column": 1 }, "end": { "line": 2, "column": 4 } }
            ]
          },
          {
            "name": "a_2",
            "originalLocations": [
              { "filePath": "/test/1.less", "start": { "line": 3, "column": 1 }, "end": { "line": 3, "column": 4 } }
            ]
          },
          {
            "name": "c",
            "originalLocations": [
              { "filePath": "/test/3.less", "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }
            ]
          }
        ]
      }
    `);
  });
});

describe('tracks dependencies that have been pre-bundled by transpiler', () => {
  test('sass', async () => {
    mockfs({
      '/test/1.scss': dedent`
      @import './2.scss';
      @import './3.scss';
      `,
      '/test/2.scss': dedent`
      `,
      '/test/3.scss': dedent`
      @import './4.scss';
      `,
      '/test/4.scss': dedent`
      `,
    });
    const result = await loader.load('/test/1.scss');
    expect(result.dependencies).toStrictEqual(['/test/2.scss', '/test/3.scss', '/test/4.scss']);
  });
  test('less', async () => {
    mockfs({
      '/test/1.less': dedent`
      @import './2.less';
      @import './3.less';
      `,
      '/test/2.less': dedent`
      `,
      '/test/3.less': dedent`
      @import './4.less';
      `,
      '/test/4.less': dedent`
      `,
    });
    const result = await loader.load('/test/1.less');
    expect(result.dependencies).toStrictEqual(['/test/2.less', '/test/3.less', '/test/4.less']);
  });
});

test('ignores the composition of non-existent tokens', async () => {
  // In css-loader and postcss-modules, compositions of non-existent tokens are simply ignored.
  // Therefore, checkable-css-modules follows suit.
  // It may be preferable to warn rather than ignore, but for now, we will focus on compatibility.
  // ref: https://github.com/css-modules/css-modules/issues/356
  mockfs({
    '/test/1.css': dedent`
    .a {
      composes: b c from './2.css';
    }
    `,
    '/test/2.css': dedent`
    .b {}
    `,
  });
  const result = await loader.load('/test/1.css');
  expect(result.tokens.map((t) => t.name)).toStrictEqual(['a', 'b']);
});

test('throws error the composition of non-existent file', async () => {
  // In postcss-modules, compositions of non-existent file are causes an error.
  // Therefore, checkable-css-modules follows suit.
  mockfs({
    '/test/1.css': dedent`
    .a {
      composes: a from './2.css';
    }
    `,
  });
  // TODO: better error message
  await expect(async () => {
    await loader.load('/test/1.css');
  }).rejects.toThrowErrorMatchingInlineSnapshot(`"ENOENT, no such file or directory '/test/2.css'"`);
});
