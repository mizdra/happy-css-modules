import dedent from 'dedent';
import type { RunnerOptions } from '../runner.js';
import { run } from '../runner.js';
import { createTSServer } from '../test-util/tsserver.js';
import { createFixtures, getFixturePath, replaceFixtureDir } from '../test-util/util.js';

const server = createTSServer();

const defaultOptions: RunnerOptions = {
  pattern: 'test/**/*.{css,scss}',
  logLevel: 'silent',
  declarationMap: true,
  cwd: getFixturePath('/'),
  cache: false,
};

afterAll(async () => {
  await server.exit();
});

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
    `,
  });
  await run({ ...defaultOptions });
  const results = await server.getMultipleIdentifierDefinitions(getFixturePath(`/test/1.css`), [
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
  ]);
  // FIXME: Fix an issue where the text at definition destination was incorrect.
  expect(replaceFixtureDir(results)).toMatchInlineSnapshot(`
    [
      {
        "definitions": [
          {
            "end": {
              "line": 1,
              "offset": 8,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 1,
              "offset": 1,
            },
            "text": ".basic ",
          },
        ],
        "identifier": "basic",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 2,
              "offset": 12,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 2,
              "offset": 1,
            },
            "text": ".cascading ",
          },
          {
            "end": {
              "line": 3,
              "offset": 12,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 3,
              "offset": 1,
            },
            "text": ".cascading ",
          },
        ],
        "identifier": "cascading",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 4,
              "offset": 17,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 4,
              "offset": 1,
            },
            "text": ".pseudo_class_1 ",
          },
        ],
        "identifier": "pseudo_class_1",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 5,
              "offset": 17,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 5,
              "offset": 1,
            },
            "text": ".pseudo_class_2:",
          },
        ],
        "identifier": "pseudo_class_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 6,
              "offset": 22,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 6,
              "offset": 6,
            },
            "text": ".pseudo_class_3)",
          },
        ],
        "identifier": "pseudo_class_3",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 7,
              "offset": 22,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 7,
              "offset": 1,
            },
            "text": ".multiple_selector_1.",
          },
        ],
        "identifier": "multiple_selector_1",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 7,
              "offset": 42,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 7,
              "offset": 21,
            },
            "text": ".multiple_selector_2 ",
          },
        ],
        "identifier": "multiple_selector_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 8,
              "offset": 15,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 8,
              "offset": 1,
            },
            "text": ".combinator_1 ",
          },
        ],
        "identifier": "combinator_1",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 8,
              "offset": 31,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 8,
              "offset": 17,
            },
            "text": ".combinator_2 ",
          },
        ],
        "identifier": "combinator_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 11,
              "offset": 14,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 11,
              "offset": 5,
            },
            "text": ".at_rule ",
          },
        ],
        "identifier": "at_rule",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 14,
              "offset": 18,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 14,
              "offset": 1,
            },
            "text": ".selector_list_1,",
          },
        ],
        "identifier": "selector_list_1",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 14,
              "offset": 36,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 14,
              "offset": 19,
            },
            "text": ".selector_list_2 ",
          },
        ],
        "identifier": "selector_list_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 15,
              "offset": 28,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 15,
              "offset": 8,
            },
            "text": ".local_class_name_1 ",
          },
        ],
        "identifier": "local_class_name_1",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 17,
              "offset": 23,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 17,
              "offset": 3,
            },
            "text": ".local_class_name_2 ",
          },
        ],
        "identifier": "local_class_name_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 18,
              "offset": 23,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 18,
              "offset": 3,
            },
            "text": ".local_class_name_3 ",
          },
        ],
        "identifier": "local_class_name_3",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 20,
              "offset": 28,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 20,
              "offset": 8,
            },
            "text": ".local_class_name_4)",
          },
        ],
        "identifier": "local_class_name_4",
      },
    ]
  `);
  const moduleDefinitions = await server.getModuleDefinitions(getFixturePath('/test/1.css'));
  expect(replaceFixtureDir(moduleDefinitions)).toMatchInlineSnapshot(`
    [
      {
        "end": {
          "line": 1,
          "offset": 1,
        },
        "file": "<fixtures>/test/1.css",
        "start": {
          "line": 1,
          "offset": 1,
        },
        "text": "",
      },
    ]
  `);
});

test('imported tokens', async () => {
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
  await run({ ...defaultOptions });
  const results = await server.getMultipleIdentifierDefinitions(getFixturePath(`/test/1.css`), ['a', 'b', 'c', 'd']);
  expect(replaceFixtureDir(results)).toMatchInlineSnapshot(`
    [
      {
        "definitions": [
          {
            "end": {
              "line": 2,
              "offset": 4,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 2,
              "offset": 1,
            },
            "text": ".a ",
          },
        ],
        "identifier": "a",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 3,
              "offset": 4,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 3,
              "offset": 1,
            },
            "text": ".b ",
          },
          {
            "end": {
              "line": 4,
              "offset": 4,
            },
            "file": "<fixtures>/test/1.css",
            "start": {
              "line": 4,
              "offset": 1,
            },
            "text": ".b ",
          },
        ],
        "identifier": "b",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 2,
              "offset": 4,
            },
            "file": "<fixtures>/test/2.css",
            "start": {
              "line": 2,
              "offset": 1,
            },
            "text": ".c ",
          },
        ],
        "identifier": "c",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 1,
              "offset": 4,
            },
            "file": "<fixtures>/test/3.css",
            "start": {
              "line": 1,
              "offset": 1,
            },
            "text": ".d ",
          },
        ],
        "identifier": "d",
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
    }
    `,
    '/test/2.scss': dedent`
    .b_1 { dummy: ''; }
    @mixin b_2 { dummy: ''; }
    `,
    '/test/3.scss': dedent`
    .c { dummy: ''; }
    `,
  });
  await run({ ...defaultOptions });
  const results = await server.getMultipleIdentifierDefinitions(getFixturePath(`/test/1.scss`), [
    'basic',
    'nesting',
    'nesting_1',
    'nesting_2',
    'b_1',
    'b_2',
    'c',
  ]);
  expect(replaceFixtureDir(results)).toMatchInlineSnapshot(`
    [
      {
        "definitions": [
          {
            "end": {
              "line": 3,
              "offset": 8,
            },
            "file": "<fixtures>/test/1.scss",
            "start": {
              "line": 3,
              "offset": 1,
            },
            "text": ".basic ",
          },
        ],
        "identifier": "basic",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 4,
              "offset": 10,
            },
            "file": "<fixtures>/test/1.scss",
            "start": {
              "line": 4,
              "offset": 1,
            },
            "text": ".nesting ",
          },
          {
            "end": {
              "line": 7,
              "offset": 12,
            },
            "file": "<fixtures>/test/1.scss",
            "start": {
              "line": 7,
              "offset": 3,
            },
            "text": ".nesting_",
          },
        ],
        "identifier": "nesting",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 7,
              "offset": 14,
            },
            "file": "<fixtures>/test/1.scss",
            "start": {
              "line": 7,
              "offset": 3,
            },
            "text": ".nesting_1 ",
          },
        ],
        "identifier": "nesting_1",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 8,
              "offset": 14,
            },
            "file": "<fixtures>/test/1.scss",
            "start": {
              "line": 8,
              "offset": 3,
            },
            "text": "&_2 { dummy",
          },
        ],
        "identifier": "nesting_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 1,
              "offset": 6,
            },
            "file": "<fixtures>/test/2.scss",
            "start": {
              "line": 1,
              "offset": 1,
            },
            "text": ".b_1 ",
          },
        ],
        "identifier": "b_1",
      },
      {
        "definitions": [],
        "identifier": "b_2",
      },
      {
        "definitions": [
          {
            "end": {
              "line": 1,
              "offset": 4,
            },
            "file": "<fixtures>/test/3.scss",
            "start": {
              "line": 1,
              "offset": 1,
            },
            "text": ".c ",
          },
        ],
        "identifier": "c",
      },
    ]
  `);
});
