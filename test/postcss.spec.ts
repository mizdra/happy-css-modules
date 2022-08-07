import dedent from 'dedent';
import { generateLocalTokenNames, getOriginalLocation } from '../src/postcss';
import { createRoot, createClassSelectors } from './test/util';

describe('generateLocalTokenNames', () => {
  test('basic', async () => {
    expect(
      await generateLocalTokenNames(
        createRoot(`
        .basic {
          content: "basic";
        }
        .cascading {
          content: "cascading_1";
        }
        .cascading {
          content: "cascading_2";
        }
        .pseudo_class {
          content: "pseudo_class";
        }
        .pseudo_class:hover {
          content: "pseudo_class:hover";
        }
        .pseudo_class:before {
          content: "pseudo_class:before";
        }
        .multiple_selector_1.multiple_selector_2 {
          content: "multiple_selector";
        }
        .combinator_1 + .combinator_2 {
          content: "combinator";
        }
        @supports (display: flex) {
          @media screen and (min-width: 900px) {
            .at_rule {
              content: "at_rule";
            }
          }
        }
        .selector_list_1, .selector_list_2 {
          content: "selector_list";
        }
        :local .local_class_name_1 {
          content: "local_class_name_1";
        }
        :local {
          .local_class_name_2 {
            content: "local_class_name_2";
          }
          .local_class_name_3 {
            content: "local_class_name_3";
          }
        }
        :local(.local_class_name_4) {
          content: "local_class_name_4";
        }
        .composes_target {
          content: "composes_target";
        }
        .composes {
          content: "composes";
          composes: composes_target;
        }
        `),
      ),
    ).toStrictEqual([
      'basic',
      'cascading',
      'pseudo_class',
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
  });
  test('does not track styles imported by @import in other file because it is not a local token', async () => {
    expect(
      await generateLocalTokenNames(
        createRoot(`
        @import "./other.css";
        `),
      ),
    ).toStrictEqual([]);
  });
  test('does not track styles imported by composes in other file because it is not a local token', async () => {
    expect(
      await generateLocalTokenNames(
        createRoot(`
        .a {
          composes: b from "./other.css";
        }
        `),
      ),
    ).toStrictEqual(['a']);
  });
});

describe('getOriginalLocation', () => {
  test('basic', () => {
    const [basic] = createClassSelectors(
      createRoot(dedent`
      .basic {
        content: "basic";
      }
      `),
    );
    expect(getOriginalLocation(basic.rule, basic.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 5,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
  });
  test('cascading', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [cascading_1, cascading_2] = createClassSelectors(
      createRoot(dedent`
      .cascading {
        content: "cascading_1";
      }
      .cascading {
        content: "cascading_2";
      }
      `),
    );
    expect(getOriginalLocation(cascading_1.rule, cascading_1.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 9,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(cascading_2.rule, cascading_2.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 9,
          "line": 4,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 4,
        },
      }
    `);
  });
  test('pseudo_class', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [pseudo_class, pseudo_class_hover, pseudo_class_before] = createClassSelectors(
      createRoot(dedent`
      .pseudo_class {
        content: "pseudo_class";
      }
      .pseudo_class:hover {
        content: "pseudo_class:hover";
      }
      .pseudo_class:before {
        content: "pseudo_class:before";
      }
      `),
    );
    expect(getOriginalLocation(pseudo_class.rule, pseudo_class.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 12,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(pseudo_class_hover.rule, pseudo_class_hover.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 12,
          "line": 4,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 4,
        },
      }
    `);
    expect(getOriginalLocation(pseudo_class_before.rule, pseudo_class_before.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 12,
          "line": 7,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 7,
        },
      }
    `);
  });
  test('multiple_selector', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [multiple_selector_1, multiple_selector_2] = createClassSelectors(
      createRoot(dedent`
      .multiple_selector_1.multiple_selector_2 {
        content: "multiple_selector";
      }
      `),
    );
    expect(getOriginalLocation(multiple_selector_1.rule, multiple_selector_1.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 19,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(multiple_selector_2.rule, multiple_selector_2.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 39,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 20,
          "line": 1,
        },
      }
    `);
  });

  test('combinator', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [combinator_1, combinator_2] = createClassSelectors(
      createRoot(dedent`
      .combinator_1 + .combinator_2 {
        content: "combinator";
      }
      `),
    );
    expect(getOriginalLocation(combinator_1.rule, combinator_1.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 12,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(combinator_2.rule, combinator_2.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 28,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 16,
          "line": 1,
        },
      }
    `);
  });
  test('at_rule', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [at_rule] = createClassSelectors(
      createRoot(dedent`
      @supports (display: flex) {
        @media screen and (min-width: 900px) {
          .at_rule {
            content: "at_rule";
          }
        }
      }
      `),
    );
    expect(getOriginalLocation(at_rule.rule, at_rule.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 11,
          "line": 3,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 4,
          "line": 3,
        },
      }
    `);
  });
  test('selector_list', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [selector_list_1, selector_list_2] = createClassSelectors(
      createRoot(dedent`
      .selector_list_1, .selector_list_2 {
        content: "selector_list";
      }
      `),
    );
    expect(getOriginalLocation(selector_list_1.rule, selector_list_1.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 15,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(selector_list_2.rule, selector_list_2.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 33,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 18,
          "line": 1,
        },
      }
    `);
  });
  test('local_class_name', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [local_class_name_1, local_class_name_2, local_class_name_3, local_class_name_4] = createClassSelectors(
      createRoot(dedent`
      :local .local_class_name_1 {
        content: "local_class_name_1";
      }
      :local {
        .local_class_name_2 {
          content: "local_class_name_2";
        }
        .local_class_name_3 {
          content: "local_class_name_3";
        }
      }
      :local(.local_class_name_4) {
        content: "local_class_name_4";
      }
      `),
    );
    expect(getOriginalLocation(local_class_name_1.rule, local_class_name_1.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 25,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 7,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(local_class_name_2.rule, local_class_name_2.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 20,
          "line": 5,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 2,
          "line": 5,
        },
      }
    `);
    expect(getOriginalLocation(local_class_name_3.rule, local_class_name_3.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 20,
          "line": 8,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 2,
          "line": 8,
        },
      }
    `);
    expect(getOriginalLocation(local_class_name_4.rule, local_class_name_4.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 25,
          "line": 12,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 7,
          "line": 12,
        },
      }
    `);
  });
  test('composes', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [composes_target, composes] = createClassSelectors(
      createRoot(dedent`
      .composes_target {
        content: "composes_target";
      }
      .composes {
        content: "composes";
        composes: composes_target;
      }
      `),
    );
    expect(getOriginalLocation(composes_target.rule, composes_target.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 15,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(composes.rule, composes.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 8,
          "line": 4,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 4,
        },
      }
    `);
  });
  test('with_newline', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [with_newline_1, with_newline_2, with_newline_3] = createClassSelectors(
      createRoot(dedent`
      .with_newline_1,
      .with_newline_2
        + .with_newline_3, {
        content: "with_newline";
      }
      `),
    );
    expect(getOriginalLocation(with_newline_1.rule, with_newline_1.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 14,
          "line": 1,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 1,
        },
      }
    `);
    expect(getOriginalLocation(with_newline_2.rule, with_newline_2.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 14,
          "line": 2,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 2,
        },
      }
    `);

    expect(getOriginalLocation(with_newline_3.rule, with_newline_3.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 18,
          "line": 3,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 4,
          "line": 3,
        },
      }
    `);
  });
});
