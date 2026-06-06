import dedent from 'dedent';
import { Locator } from '../locator/index.js';
import { createFixtures, getFixturePath, replaceFixtureDir } from '../test-util/util.js';
import { createScssTransformer } from './scss-transformer.js';

const locator = new Locator({ transformer: createScssTransformer() });
const loadSpy = vi.spyOn(locator, 'load');

afterEach(() => {
  loadSpy.mockClear();
});

test('handles sass features', async () => {
  createFixtures({
    '/test/1.scss': dedent`
      @use './2.scss' as two; // sass feature test (@use)
      @import './3.scss'; // css feature test (@import)
      .a_1 { dummy: ''; }
      .a_2 {
        dummy: '';
        // sass feature test (nesting)
        .a_2_1 { dummy: ''; }
        &_2 { dummy: ''; }
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
  const result = await locator.load(getFixturePath('/test/1.scss'));

  // NOTE: There should be only one originalLocations for 'a_2', but there are multiple.
  // This is probably due to an incorrect sourcemap output by the sass compiler.
  // FIXME: The sass compiler or Loader implementation needs to be fixed.

  // FIXME: The end position of 'a_2_2' is incorrect.
  expect(replaceFixtureDir(result)).toMatchInlineSnapshot(`
    {
      "dependencies": [
        "<fixtures>/test/2.scss",
        "<fixtures>/test/3.scss",
      ],
      "tokens": [
        {
          "name": "b_1",
          "originalLocation": {
            "end": {
              "column": 4,
              "line": 1,
            },
            "filePath": "<fixtures>/test/2.scss",
            "start": {
              "column": 1,
              "line": 1,
            },
          },
        },
        {
          "name": "c",
          "originalLocation": {
            "end": {
              "column": 2,
              "line": 1,
            },
            "filePath": "<fixtures>/test/3.scss",
            "start": {
              "column": 1,
              "line": 1,
            },
          },
        },
        {
          "name": "a_1",
          "originalLocation": {
            "end": {
              "column": 4,
              "line": 3,
            },
            "filePath": "<fixtures>/test/1.scss",
            "start": {
              "column": 1,
              "line": 3,
            },
          },
        },
        {
          "name": "a_2",
          "originalLocation": {
            "end": {
              "column": 4,
              "line": 4,
            },
            "filePath": "<fixtures>/test/1.scss",
            "start": {
              "column": 1,
              "line": 4,
            },
          },
        },
        {
          "name": "a_2",
          "originalLocation": {
            "end": {
              "column": 6,
              "line": 7,
            },
            "filePath": "<fixtures>/test/1.scss",
            "start": {
              "column": 3,
              "line": 7,
            },
          },
        },
        {
          "name": "a_2_1",
          "originalLocation": {
            "end": {
              "column": 8,
              "line": 7,
            },
            "filePath": "<fixtures>/test/1.scss",
            "start": {
              "column": 3,
              "line": 7,
            },
          },
        },
        {
          "name": "a_2_2",
          "originalLocation": {
            "end": {
              "column": 8,
              "line": 8,
            },
            "filePath": "<fixtures>/test/1.scss",
            "start": {
              "column": 3,
              "line": 8,
            },
          },
        },
      ],
    }
  `);
});

test('tracks dependencies that have been pre-bundled by sass compiler', async () => {
  createFixtures({
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
  const result = await locator.load(getFixturePath('/test/1.scss'));

  // The files imported using @import are pre-bundled by the compiler.
  // Therefore, `Locator#load` is not called to process other files.
  expect(loadSpy).toBeCalledTimes(1);
  expect(loadSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.scss'));

  // The files pre-bundled by the compiler are also included in `result.dependencies`
  expect(result.dependencies).toStrictEqual(['/test/2.scss', '/test/3.scss', '/test/4.scss'].map(getFixturePath));
});

test('resolves specifier using resolver', async () => {
  createFixtures({
    '/test/1.scss': dedent`
    @import 'package-1';
    @import 'package-2';
    `,
    '/node_modules/package-1/index.css': `.a {}`,
    '/node_modules/package-2/index.scss': `.a {}`,
  });
  const result = await locator.load(getFixturePath('/test/1.scss'));
  expect(result.dependencies).toStrictEqual(
    ['/node_modules/package-1/index.css', '/node_modules/package-2/index.scss'].map(getFixturePath),
  );
});

test('ignores http(s) protocol file', async () => {
  createFixtures({
    '/test/1.scss': dedent`
    @import 'http://example.com/path/http.css';
    @import 'https://example.com/path/https.css';
    @import 'https://example.com/path/scss.scss';
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.scss'));
  expect(result.dependencies).toStrictEqual([]);
});
