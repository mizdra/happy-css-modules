import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import dedent from 'dedent';
import { Locator, createDefaultTransformer } from '../index.js';
import { createFixtures, getFixturePath } from '../test-util/util.js';
import { sleepSync } from '../util.js';

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
      dependencies: [],
      tokens: [
        {
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
        {
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
      dependencies: [
        "<fixtures>/test/2.css",
        "<fixtures>/test/3.css",
        "<fixtures>/test/4.css",
        "<fixtures>/test/5.css",
        "<fixtures>/test/5-recursive.css",
      ],
      tokens: [
        {
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/2.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
        {
          name: "b",
          originalLocation: {
            filePath: "<fixtures>/test/3.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
        {
          name: "c",
          originalLocation: {
            filePath: "<fixtures>/test/4.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
        {
          name: "d",
          originalLocation: {
            filePath: "<fixtures>/test/5-recursive.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
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
      dependencies: [],
      tokens: [
        {
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

test('tracks other files when `@value` is present', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @value a from './2.css';
    @value b from '3.css';
    @value c from '${getFixturePath('/test/4.css')}';
    `,
    '/test/2.css': dedent`
    @value a: 1;
    `,
    '/test/3.css': dedent`
    @value b: 2;
    `,
    '/test/4.css': dedent`
    @value c: 3;
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toMatchInlineSnapshot(`
    {
      dependencies: ["<fixtures>/test/2.css", "<fixtures>/test/3.css", "<fixtures>/test/4.css"],
      tokens: [
        {
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/2.css",
            start: { line: 1, column: 8 },
            end: { line: 1, column: 9 },
          },
        },
        {
          name: "b",
          originalLocation: {
            filePath: "<fixtures>/test/3.css",
            start: { line: 1, column: 8 },
            end: { line: 1, column: 9 },
          },
        },
        {
          name: "c",
          originalLocation: {
            filePath: "<fixtures>/test/4.css",
            start: { line: 1, column: 8 },
            end: { line: 1, column: 9 },
          },
        },
      ],
    }
  `);
});

test('unique tokens', async () => {
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
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result).toMatchInlineSnapshot(`
    {
      dependencies: ["<fixtures>/test/2.css"],
      tokens: [
        {
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/2.css",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
        {
          name: "b",
          originalLocation: {
            filePath: "<fixtures>/test/2.css",
            start: { line: 2, column: 1 },
            end: { line: 2, column: 2 },
          },
        },
        {
          name: "a",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 4, column: 1 },
            end: { line: 4, column: 2 },
          },
        },
        {
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

test('returns the result from the cache when the file has not been modified', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import './2.css';
    @import './3.css';
    `,
    '/test/2.css': dedent`
    .b {}
    `,
    '/test/3.css': dedent`
    .c {}
    .d {}
    `,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readCSSSpy = jest.spyOn(locator, 'readCSS' as any);
  await locator.load(getFixturePath('/test/1.css'));
  expect(readCSSSpy).toHaveBeenCalledTimes(3);
  expect(readCSSSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.css'));
  expect(readCSSSpy).toHaveBeenNthCalledWith(2, getFixturePath('/test/2.css'));
  expect(readCSSSpy).toHaveBeenNthCalledWith(3, getFixturePath('/test/3.css'));
  readCSSSpy.mockClear();

  // update `/test/2.css`
  sleepSync(1); // wait for the file system to update the mtime
  await writeFile(getFixturePath('/test/2.css'), await readFile(getFixturePath('/test/2.css'), 'utf-8'));

  // `3.css` is not updated, so the cache is used. Therefore, `readFile` is not called.
  await locator.load(getFixturePath('/test/3.css'));
  expect(readCSSSpy).toHaveBeenCalledTimes(0);

  // `1.css` is not updated, but dependencies are updated, so the cache is used. Therefore, `readFile` is called.
  await locator.load(getFixturePath('/test/1.css'));
  expect(readCSSSpy).toHaveBeenCalledTimes(2);
  expect(readCSSSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.css'));
  expect(readCSSSpy).toHaveBeenNthCalledWith(2, getFixturePath('/test/2.css'));

  // ``2.css` is updated, but the cache is already available because it was updated in the previous step. Therefore, `readFile` is not called.
  await locator.load(getFixturePath('/test/2.css'));
  expect(readCSSSpy).toHaveBeenCalledTimes(2);
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
        dependencies: [],
        tokens: [
          {
            name: "nesting",
            originalLocation: {
              filePath: "<fixtures>/test/1.scss",
              start: { line: 1, column: 1 },
              end: { line: 1, column: 8 },
            },
          },
          {
            name: "nesting",
            originalLocation: {
              filePath: "<fixtures>/test/1.scss",
              start: { line: 3, column: 3 },
              end: { line: 3, column: 10 },
            },
          },
          {
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
        dependencies: [],
        tokens: [
          {
            name: "selector_list_a_1",
            originalLocation: {
              filePath: "<fixtures>/test/1.css",
              start: { line: 1, column: 1 },
              end: { line: 1, column: 18 },
            },
          },
          {
            name: "selector_list_a_2",
            originalLocation: {
              filePath: "<fixtures>/test/1.css",
              start: { line: 1, column: 1 },
              end: { line: 1, column: 18 },
            },
          },
          { name: "selector_list_b_1", originalLocation: {} },
          { name: "selector_list_b_2", originalLocation: {} },
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
  expect(result.dependencies).toStrictEqual([]);
});

test('block concurrent calls to load method', async () => {
  createFixtures({
    '/test/1.css': `.a {}`,
  });
  await expect(async () => {
    await Promise.all([locator.load(getFixturePath('/test/1.css')), locator.load(getFixturePath('/test/1.css'))]);
  }).rejects.toThrowError('Cannot call `Locator#load` concurrently.');
});
