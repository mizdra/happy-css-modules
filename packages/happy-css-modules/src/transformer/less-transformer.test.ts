import { jest } from '@jest/globals';
import dedent from 'dedent';
import { Locator } from '../locator/index.js';
import { createFixtures, getFixturePath } from '../test-util/util.js';
import { createLessTransformer } from './less-transformer.js';

const locator = new Locator({ transformer: createLessTransformer() });
const loadSpy = jest.spyOn(locator, 'load');

afterEach(() => {
  loadSpy.mockClear();
});

test('handles less features', async () => {
  createFixtures({
    '/test/1.less': dedent`
      @import './2.less'; // less feature test (@use)
      .a_1 { dummy: ''; }
      .a_2 {
        dummy: '';
        // less feature test (nesting)
        .a_2_1 { dummy: ''; }
        &_2 { dummy: ''; }
        .b_1();
        .b_2();
      }
      `,
    '/test/2.less': dedent`
      .b_1 { dummy: ''; }
      .b_2() { dummy: ''; }
      `,
    '/test/3.less': dedent`
      .c { dummy: ''; }
      `,
  });
  const result = await locator.load(getFixturePath('/test/1.less'));

  // FIXME: The end position of 'a_2_2' is incorrect.
  expect(result).toMatchInlineSnapshot(`
    {
      dependencies: ["<fixtures>/test/2.less"],
      tokens: [
        {
          name: "b_1",
          originalLocation: {
            filePath: "<fixtures>/test/2.less",
            start: { line: 1, column: 1 },
            end: { line: 1, column: 4 },
          },
        },
        {
          name: "a_1",
          originalLocation: {
            filePath: "<fixtures>/test/1.less",
            start: { line: 2, column: 1 },
            end: { line: 2, column: 4 },
          },
        },
        {
          name: "a_2",
          originalLocation: {
            filePath: "<fixtures>/test/1.less",
            start: { line: 3, column: 1 },
            end: { line: 3, column: 4 },
          },
        },
        {
          name: "a_2_1",
          originalLocation: {
            filePath: "<fixtures>/test/1.less",
            start: { line: 6, column: 3 },
            end: { line: 6, column: 8 },
          },
        },
        {
          name: "a_2_2",
          originalLocation: {
            filePath: "<fixtures>/test/1.less",
            start: { line: 7, column: 3 },
            end: { line: 7, column: 8 },
          },
        },
      ],
    }
  `);
});

test('tracks dependencies that have been pre-bundled by less compiler', async () => {
  createFixtures({
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
  const result = await locator.load(getFixturePath('/test/1.less'));

  // The files imported using @import are pre-bundled by the compiler.
  // Therefore, `Locator#load` is not called to process other files.
  expect(loadSpy).toBeCalledTimes(1);
  expect(loadSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.less'));

  // The files pre-bundled by the compiler are also included in `result.dependencies`
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  expect(result.dependencies.sort()).toStrictEqual(
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    ['/test/2.less', '/test/3.less', '/test/4.less'].map(getFixturePath).sort(),
  );
});

test('resolves specifier using resolver', async () => {
  createFixtures({
    '/test/1.less': dedent`
    @import 'package-1';
    @import 'package-2';
    `,
    '/node_modules/package-1/index.css': `.a {}`,
    '/node_modules/package-2/index.less': `.a {}`,
  });
  const result = await locator.load(getFixturePath('/test/1.less'));
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  expect(result.dependencies.sort()).toStrictEqual(
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    [getFixturePath('/node_modules/package-1/index.css'), getFixturePath('/node_modules/package-2/index.less')].sort(),
  );
});

test('ignores http(s) protocol file', async () => {
  createFixtures({
    '/test/1.less': dedent`
    @import 'http://example.com/path/http.css';
    @import 'https://example.com/path/https.css';
    @import 'https://example.com/path/less.less';
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.less'));
  expect(result.dependencies).toStrictEqual([]);
});
