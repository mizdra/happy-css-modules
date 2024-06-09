import { randomUUID } from 'node:crypto';
import dedent from 'dedent';
import { Locator, createDefaultTransformer } from '../index.js';
import { createFixtures, getFixturePath } from '../test-util/util.js';

const locator = new Locator();

test('basic', async () => {
  createFixtures({
    '/test/1.css': dedent`
    .a {}
    .b {}
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toMatchInlineSnapshot(`
    {
      transpileDependencies: [],
      tokenInfos: [
        {
          type: "localToken",
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
        {
          type: "localToken",
          name: "b",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 2, column: 1 },
            end: { line: 2, column: 2 },
          },
        },
      ],
    }
  `);
});

test('tracks other files when `@import` is present', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import './2.css';
    @import '3.css';
    @import '${getFixturePath('/test/4.css')}';
    @import './5.css';
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
    '/test/5.css': dedent`
    @import './5-recursive.css';
    `,
    '/test/5-recursive.css': dedent`
    .d {}
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toMatchInlineSnapshot(`
    {
      transpileDependencies: [],
      tokenInfos: [
        { type: "importedAllTokensFromModule", filePath: "<fixtures>/test/2.css" },
        { type: "importedAllTokensFromModule", filePath: "<fixtures>/test/3.css" },
        { type: "importedAllTokensFromModule", filePath: "<fixtures>/test/4.css" },
        { type: "importedAllTokensFromModule", filePath: "<fixtures>/test/5.css" },
      ],
    }
  `);
});

test('does not track other files by `composes`', async () => {
  createFixtures({
    '/test/1.css': dedent`
    .a {
      composes: b from './2.css';
      composes: c from './3.css'; /* non-existent file */
    }
    `,
    '/test/2.css': dedent`
    .b {}
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toMatchInlineSnapshot(`
    {
      transpileDependencies: [],
      tokenInfos: [
        {
          type: "localToken",
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
      ],
    }
  `);
});

test('normalizes tokens', async () => {
  createFixtures({
    '/test/1.css': dedent`
    /* duplicate import */
    @import './2.css';
    @import '2.css';
    .a {}
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
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toMatchInlineSnapshot(`
    {
      transpileDependencies: [],
      tokenInfos: [
        { type: "importedAllTokensFromModule", filePath: "<fixtures>/test/2.css" },
        { type: "importedAllTokensFromModule", filePath: "<fixtures>/test/2.css" },
        {
          type: "localToken",
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 4, column: 1 },
            end: { line: 4, column: 2 },
          },
        },
        {
          type: "localToken",
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 5, column: 1 },
            end: { line: 5, column: 2 },
          },
        },
      ],
    }
  `);
});

describe('supports sourcemap', () => {
  test('restores original locations from sourcemap', async () => {
    const transformer = createDefaultTransformer();
    const locator = new Locator({ transformer });
    createFixtures({
      '/test/1.scss': dedent`
      .nesting {
        dummy: '';
        .nesting_child {
          dummy: '';
        }
      }
      `,
    });
    const result = await locator.load(getFixturePath('/test/1.scss'));
    expect(result).toMatchInlineSnapshot(`
      {
        transpileDependencies: [],
        tokenInfos: [
          {
            type: "localToken",
            name: "nesting",
            originalLocation: {
              filePath: "<fixtures>/test/1.scss",
              start: { line: 1, column: 1 },
              end: { line: 1, column: 8 },
            },
          },
          {
            type: "localToken",
            name: "nesting",
            originalLocation: {
              filePath: "<fixtures>/test/1.scss",
              start: { line: 3, column: 3 },
              end: { line: 3, column: 10 },
            },
          },
          {
            type: "localToken",
            name: "nesting_child",
            originalLocation: {
              filePath: "<fixtures>/test/1.scss",
              start: { line: 3, column: 3 },
              end: { line: 3, column: 16 },
            },
          },
        ],
      }
    `);
  });
  test('treats originalLocation as empty if sourcemap is broken', async () => {
    const uuid = randomUUID();
    createFixtures({
      [`/${uuid}/postcss.config.js`]: dedent`
      module.exports = {
        plugins: [],
      };
      `,
      '/test/1.css': dedent`
      .selector_list_a_1, .selector_list_a_2 {}
      /* In postcss, including newlines in the selector list breaks the sourcemap. */
      .selector_list_b_1,
      .selector_list_b_2 {}
      `,
    });
    const transformer = createDefaultTransformer({ postcssConfig: getFixturePath(`/${uuid}/postcss.config.js`) });
    const locator = new Locator({ transformer });
    const result = await locator.load(getFixturePath('/test/1.css'));
    expect(result).toMatchInlineSnapshot(`
      {
        transpileDependencies: [],
        tokenInfos: [
          {
            type: "localToken",
            name: "selector_list_a_1",
            originalLocation: {
              filePath: "<fixtures>/test/1.css",
              start: { line: 1, column: 1 },
              end: { line: 1, column: 18 },
            },
          },
          {
            type: "localToken",
            name: "selector_list_a_2",
            originalLocation: {
              filePath: "<fixtures>/test/1.css",
              start: { line: 1, column: 1 },
              end: { line: 1, column: 18 },
            },
          },
          { type: "localToken", name: "selector_list_b_1", originalLocation: {} },
          { type: "localToken", name: "selector_list_b_2", originalLocation: {} },
        ],
      }
    `);
  });
});

test('ignores http(s) protocol file', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import 'http://example.com/path/http.css';
    @import 'https://example.com/path/https.css';
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toStrictEqual({ tokenInfos: [], transpileDependencies: [] });
});
