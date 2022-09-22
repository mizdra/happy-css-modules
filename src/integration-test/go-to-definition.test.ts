import { jest } from '@jest/globals';
import dedent from 'dedent';
import { rest } from 'msw';
import { run } from '../runner.js';
import { server } from '../test/msw.js';
import { getModuleDefinitions, getMultipleIdentifierDefinitions } from '../test/tsserver.js';
import { createFixtures, getFixturePath } from '../test/util.js';

// It is heavy test, so increase timeout.
jest.setTimeout(60 * 1000); // 60s

const defaultOptions = {
  pattern: 'test/**/*.{css,scss}',
  silent: true,
  declarationMap: true,
  cwd: getFixturePath('/'),
};

test('basic', async () => {
  createFixtures({
    '/test/1.css': dedent`
    .basic {}
    .cascading {}
    .cascading {}
    .pseudo_class_1 {}
    .pseudo_class_2:hover {}
    :not(.pseudo_class_3) {}
    .multiple_selector_1.multiple_selector_2 {}
    .combinator_1 + .combinator_2 {}
    @supports (display: flex) {
      @media screen and (min-width: 900px) {
        .at_rule {}
      }
    }
    .selector_list_1, .selector_list_2 {}
    :local .local_class_name_1 {}
    :local {
      .local_class_name_2 {}
      .local_class_name_3 {}
    }
    :local(.local_class_name_4) {}
    .composes_target {}
    .composes {
      composes: composes_target;
    }
    `,
  });
  await run({ ...defaultOptions });
  const results = await getMultipleIdentifierDefinitions(getFixturePath(`/test/1.css`), [
    'basic',
    'cascading',
    'pseudo_class_1',
    'pseudo_class_2',
    'pseudo_class_3',
    'multiple_selector_1',
    'multiple_selector_2',
    'combinator_1',
    'combinator_2',
    'at_rule',
    'selector_list_1',
    'selector_list_2',
    'local_class_name_1',
    'local_class_name_2',
    'local_class_name_3',
    'local_class_name_4',
    'composes_target',
    'composes',
  ]);
  // FIXME: Fix an issue where the text at definition destination was incorrect.
  expect(results).toMatchInlineSnapshot(`
    [
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".basic ", start: { line: 1, offset: 1 }, end: { line: 1, offset: 8 } },
        ],
        "identifier": "basic",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".cascading ", start: { line: 2, offset: 1 }, end: { line: 2, offset: 12 } },
          { file: "<fixtures>/test/1.css", text: ".cascading ", start: { line: 3, offset: 1 }, end: { line: 3, offset: 12 } },
        ],
        "identifier": "cascading",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".pseudo_class_1 ", start: { line: 4, offset: 1 }, end: { line: 4, offset: 17 } },
        ],
        "identifier": "pseudo_class_1",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".pseudo_class_2:", start: { line: 5, offset: 1 }, end: { line: 5, offset: 17 } },
        ],
        "identifier": "pseudo_class_2",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".pseudo_class_3)", start: { line: 6, offset: 6 }, end: { line: 6, offset: 22 } },
        ],
        "identifier": "pseudo_class_3",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".multiple_selector_1.",
      start: { line: 7, offset: 1 },
      end: { line: 7, offset: 22 },
    },
        ],
        "identifier": "multiple_selector_1",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".multiple_selector_2 ",
      start: { line: 7, offset: 21 },
      end: { line: 7, offset: 42 },
    },
        ],
        "identifier": "multiple_selector_2",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".combinator_1 ", start: { line: 8, offset: 1 }, end: { line: 8, offset: 15 } },
        ],
        "identifier": "combinator_1",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".combinator_2 ", start: { line: 8, offset: 17 }, end: { line: 8, offset: 31 } },
        ],
        "identifier": "combinator_2",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".at_rule ", start: { line: 11, offset: 5 }, end: { line: 11, offset: 14 } },
        ],
        "identifier": "at_rule",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".selector_list_1,",
      start: { line: 14, offset: 1 },
      end: { line: 14, offset: 18 },
    },
        ],
        "identifier": "selector_list_1",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".selector_list_2 ",
      start: { line: 14, offset: 19 },
      end: { line: 14, offset: 36 },
    },
        ],
        "identifier": "selector_list_2",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".local_class_name_1 ",
      start: { line: 15, offset: 8 },
      end: { line: 15, offset: 28 },
    },
        ],
        "identifier": "local_class_name_1",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".local_class_name_2 ",
      start: { line: 17, offset: 3 },
      end: { line: 17, offset: 23 },
    },
        ],
        "identifier": "local_class_name_2",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".local_class_name_3 ",
      start: { line: 18, offset: 3 },
      end: { line: 18, offset: 23 },
    },
        ],
        "identifier": "local_class_name_3",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".local_class_name_4)",
      start: { line: 20, offset: 8 },
      end: { line: 20, offset: 28 },
    },
        ],
        "identifier": "local_class_name_4",
      },
      {
        "definitions": [
          {
      file: "<fixtures>/test/1.css",
      text: ".composes_target ",
      start: { line: 21, offset: 1 },
      end: { line: 21, offset: 18 },
    },
        ],
        "identifier": "composes_target",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".composes ", start: { line: 22, offset: 1 }, end: { line: 22, offset: 11 } },
        ],
        "identifier": "composes",
      },
    ]
  `);
  const moduleDefinitions = await getModuleDefinitions(getFixturePath('/test/1.css'));
  expect(moduleDefinitions).toMatchInlineSnapshot(`
    [
      { file: "<fixtures>/test/1.css", text: "", start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 } },
    ]
  `);
});

test('imported tokens', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import './2.css';
    @import 'http://example.com/path/http.css';
    @import 'https://example.com/path/https.css';
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
  server.use(rest.all(`http://example.com/path/http.css`, (_req, res, ctx) => res(ctx.text('.e {}'))));
  server.use(rest.all(`https://example.com/path/https.css`, (_req, res, ctx) => res(ctx.text('.f {}'))));
  await run({ ...defaultOptions });
  const results = await getMultipleIdentifierDefinitions(getFixturePath(`/test/1.css`), ['a', 'b', 'c', 'd', 'e', 'f']);

  // NOTE: Currently, tsserver does not support definition jumps to http/https files.
  expect(results).toMatchInlineSnapshot(`
    [
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".a ", start: { line: 4, offset: 1 }, end: { line: 4, offset: 4 } },
        ],
        "identifier": "a",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css", text: ".b ", start: { line: 5, offset: 1 }, end: { line: 5, offset: 4 } },
          { file: "<fixtures>/test/1.css", text: ".b ", start: { line: 6, offset: 1 }, end: { line: 6, offset: 4 } },
        ],
        "identifier": "b",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/2.css", text: ".c ", start: { line: 2, offset: 1 }, end: { line: 2, offset: 4 } },
        ],
        "identifier": "c",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/3.css", text: ".d ", start: { line: 1, offset: 1 }, end: { line: 1, offset: 4 } },
        ],
        "identifier": "d",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css.d.ts", text: '"e"', start: { line: 4, offset: 16 }, end: { line: 4, offset: 19 } },
        ],
        "identifier": "e",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.css.d.ts", text: '"f"', start: { line: 5, offset: 16 }, end: { line: 5, offset: 19 } },
        ],
        "identifier": "f",
      },
    ]
  `);
});

test('with transformer', async () => {
  createFixtures({
    '/test/1.scss': dedent`
    @use './2.scss' as two; // sass feature test (@use)
    @import './3.scss'; // css feature test (@import)
    .basic { dummy: ''; }
    .nesting {
      dummy: '';
      // sass feature test (nesting)
      .nesting_1 { dummy: ''; }
      &_2 { dummy: ''; }
      composes: basic; // css module feature test (composes)
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
  await run({ ...defaultOptions });
  const results = await getMultipleIdentifierDefinitions(getFixturePath(`/test/1.scss`), [
    'basic',
    'nesting',
    'nesting_1',
    'nesting_2',
    'b_1',
    'b_2',
    'c',
    'd',
  ]);
  expect(results).toMatchInlineSnapshot(`
    [
      {
        "definitions": [
          { file: "<fixtures>/test/1.scss", text: ".basic ", start: { line: 3, offset: 1 }, end: { line: 3, offset: 8 } },
        ],
        "identifier": "basic",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.scss", text: ".nesting ", start: { line: 4, offset: 1 }, end: { line: 4, offset: 10 } },
          { file: "<fixtures>/test/1.scss", text: ".nesting_", start: { line: 7, offset: 3 }, end: { line: 7, offset: 12 } },
        ],
        "identifier": "nesting",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.scss", text: ".nesting_1 ", start: { line: 7, offset: 3 }, end: { line: 7, offset: 14 } },
        ],
        "identifier": "nesting_1",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/1.scss", text: "&_2 { dummy", start: { line: 8, offset: 3 }, end: { line: 8, offset: 14 } },
        ],
        "identifier": "nesting_2",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/2.scss", text: ".b_1 ", start: { line: 1, offset: 1 }, end: { line: 1, offset: 6 } },
        ],
        "identifier": "b_1",
      },
      {
        "definitions": [],
        "identifier": "b_2",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/3.scss", text: ".c ", start: { line: 1, offset: 1 }, end: { line: 1, offset: 4 } },
        ],
        "identifier": "c",
      },
      {
        "definitions": [
          { file: "<fixtures>/test/4.scss", text: ".d ", start: { line: 1, offset: 1 }, end: { line: 1, offset: 4 } },
        ],
        "identifier": "d",
      },
    ]
  `);
});
