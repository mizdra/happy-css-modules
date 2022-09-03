import { jest } from '@jest/globals';
import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { createFixtures, getFixturePath } from '../test/util.js';
import { scssTransformer } from './scss.js';

const loader = new Loader({ transformer: scssTransformer });
const loadSpy = jest.spyOn(loader, 'load');

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
  const result = await loader.load(getFixturePath('/test/1.scss'));

  // NOTE: There should be only one originalLocations for 'a_2', but there are multiple.
  // This is probably due to an incorrect sourcemap output by the sass compiler.
  // FIXME: The sass compiler or Loader implementation needs to be fixed.

  // FIXME: The end position of 'a_2_2' is incorrect.
  expect(result).toMatchInlineSnapshot(`
    {
      dependencies: ["<fixtures>/test/2.scss", "<fixtures>/test/3.scss", "<fixtures>/test/4.scss"],
      tokens: [
        {
          name: "b_1",
          originalLocations: [
            { filePath: "<fixtures>/test/2.scss", start: { line: 1, column: 1 }, end: { line: 1, column: 3 } },
          ],
        },
        {
          name: "c",
          originalLocations: [
            { filePath: "<fixtures>/test/3.scss", start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
          ],
        },
        {
          name: "a_1",
          originalLocations: [
            { filePath: "<fixtures>/test/1.scss", start: { line: 3, column: 1 }, end: { line: 3, column: 3 } },
          ],
        },
        {
          name: "a_2",
          originalLocations: [
            { filePath: "<fixtures>/test/1.scss", start: { line: 4, column: 1 }, end: { line: 4, column: 3 } },
            { filePath: "<fixtures>/test/1.scss", start: { line: 7, column: 3 }, end: { line: 7, column: 5 } },
          ],
        },
        {
          name: "a_2_1",
          originalLocations: [
            { filePath: "<fixtures>/test/1.scss", start: { line: 7, column: 3 }, end: { line: 7, column: 7 } },
          ],
        },
        {
          name: "a_2_2",
          originalLocations: [
            { filePath: "<fixtures>/test/1.scss", start: { line: 8, column: 3 }, end: { line: 8, column: 7 } },
          ],
        },
        {
          name: "d",
          originalLocations: [
            { filePath: "<fixtures>/test/4.scss", start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
          ],
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
  const result = await loader.load(getFixturePath('/test/1.scss'));

  // The files imported using @import are pre-bundled by the compiler.
  // Therefore, `Loader#load` is not called to process other files.
  expect(loadSpy).toBeCalledTimes(1);
  expect(loadSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.scss'));

  // The files pre-bundled by the compiler are also included in `result.dependencies`
  expect(result.dependencies).toStrictEqual(['/test/2.scss', '/test/3.scss', '/test/4.scss'].map(getFixturePath));
});
