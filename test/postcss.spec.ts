import dedent from 'dedent';
import {
  generateLocalTokenNames,
  getOriginalLocation,
  walkByMatcher,
  Matcher,
  parseAtImport,
  parseComposesDeclarationWithFromUrl,
} from '../src/postcss';
import { createRoot, createClassSelectors, createAtImports, createComposesDeclarations } from './test/util';

describe('generateLocalTokenNames', () => {
  test('basic', async () => {
    expect(
      await generateLocalTokenNames(
        createRoot(`
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
        `),
      ),
    ).toStrictEqual([
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
      .basic {}
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
      .cascading {}
      .cascading {}
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
          "line": 2,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 2,
        },
      }
    `);
  });
  test('pseudo_class', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [pseudo_class_1, pseudo_class_2, pseudo_class_3] = createClassSelectors(
      createRoot(dedent`
      .pseudo_class_1 {}
      .pseudo_class_2:hover {}
      :not(.pseudo_class_3) {}
      `),
    );
    expect(getOriginalLocation(pseudo_class_1.rule, pseudo_class_1.classSelector)).toMatchInlineSnapshot(`
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
    expect(getOriginalLocation(pseudo_class_2.rule, pseudo_class_2.classSelector)).toMatchInlineSnapshot(`
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
    expect(getOriginalLocation(pseudo_class_3.rule, pseudo_class_3.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 19,
          "line": 3,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 5,
          "line": 3,
        },
      }
    `);
  });
  test('multiple_selector', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [multiple_selector_1, multiple_selector_2] = createClassSelectors(
      createRoot(dedent`
      .multiple_selector_1.multiple_selector_2 {}
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
      .combinator_1 + .combinator_2 {}
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
          .at_rule {}
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
      .selector_list_1, .selector_list_2 {}
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
      :local .local_class_name_1 {}
      :local {
        .local_class_name_2 {}
        .local_class_name_3 {}
      }
      :local(.local_class_name_4) {}
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
          "line": 3,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 2,
          "line": 3,
        },
      }
    `);
    expect(getOriginalLocation(local_class_name_3.rule, local_class_name_3.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 20,
          "line": 4,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 2,
          "line": 4,
        },
      }
    `);
    expect(getOriginalLocation(local_class_name_4.rule, local_class_name_4.classSelector)).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 25,
          "line": 6,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 7,
          "line": 6,
        },
      }
    `);
  });
  test('composes', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [composes_target, composes] = createClassSelectors(
      createRoot(dedent`
      .composes_target {}
      .composes {
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
          "line": 2,
        },
        "filePath": "/test/test.css",
        "start": Object {
          "column": 0,
          "line": 2,
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
        + .with_newline_3, {}
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

describe('walkByMatcher', () => {
  test('atImport', () => {
    const ast = createRoot(dedent`
    @import;
    @import "test.css";
    @import url("test.css");
    @import url(test.css);
    @import "test.css" print;
    @ignored;
    `);
    const expected = [
      `@import`,
      `@import "test.css"`,
      `@import url("test.css")`,
      `@import url(test.css)`,
      `@import "test.css" print`,
    ];
    const atImport = jest.fn<
      ReturnType<NonNullable<Matcher['atImport']>>,
      Parameters<NonNullable<Matcher['atImport']>>
    >();

    walkByMatcher(ast, { atImport });

    expect(atImport).toHaveBeenCalledTimes(expected.length);
    expected.forEach((expected, i) => {
      expect(atImport.mock.calls[i][0].toString()).toBe(expected);
    });
  });
  test('classSelector', () => {
    const ast = createRoot(dedent`
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
    #ignored {}
    `);
    const expected = [
      [`.basic {}`, `.basic`],
      [`.cascading {}`, `.cascading`],
      [`.cascading {}`, `.cascading`],
      [`.pseudo_class_1 {}`, `.pseudo_class_1`],
      [`.pseudo_class_2:hover {}`, `.pseudo_class_2`],
      [`:not(.pseudo_class_3) {}`, `.pseudo_class_3`],
      [`.multiple_selector_1.multiple_selector_2 {}`, `.multiple_selector_1`],
      [`.multiple_selector_1.multiple_selector_2 {}`, `.multiple_selector_2`],
      [`.combinator_1 + .combinator_2 {}`, `.combinator_1`],
      [`.combinator_1 + .combinator_2 {}`, `.combinator_2`],
      [`.at_rule {}`, `.at_rule`],
      [`.selector_list_1, .selector_list_2 {}`, `.selector_list_1`],
      [`.selector_list_1, .selector_list_2 {}`, `.selector_list_2`],
      [`:local .local_class_name_1 {}`, `.local_class_name_1`],
      [`.local_class_name_2 {}`, `.local_class_name_2`],
      [`.local_class_name_3 {}`, `.local_class_name_3`],
      [`:local(.local_class_name_4) {}`, `.local_class_name_4`],
    ];
    const classSelector = jest.fn<
      ReturnType<NonNullable<Matcher['classSelector']>>,
      Parameters<NonNullable<Matcher['classSelector']>>
    >();
    walkByMatcher(ast, { classSelector });
    expect(classSelector).toHaveBeenCalledTimes(expected.length);
    expected.forEach((expected, i) => {
      expect([
        classSelector.mock.calls[i][0].toString(),
        // NOTE: The result of `toString()` contains space, so remove it.
        classSelector.mock.calls[i][1].toString().trim(),
      ]).toStrictEqual(expected);
    });
  });
  test('composesDeclaration', () => {
    const ast = createRoot(dedent`
    .a {
      composes: a;
      composes: b from "./test.css";
    }
    .b {
      composes: c;
      ignored: "ignored";
    }
    `);
    const expected = [`composes: a`, `composes: b from "./test.css"`, `composes: c`];
    const composesDeclaration = jest.fn<
      ReturnType<NonNullable<Matcher['composesDeclaration']>>,
      Parameters<NonNullable<Matcher['composesDeclaration']>>
    >();
    walkByMatcher(ast, { composesDeclaration });
    expect(composesDeclaration).toHaveBeenCalledTimes(expected.length);
    expected.forEach((expected, i) => {
      expect(composesDeclaration.mock.calls[i][0].toString()).toStrictEqual(expected);
    });
  });
});

test('parseAtImport', () => {
  const atImports = createAtImports(
    createRoot(dedent`
    @import;
    @import "test.css";
    @import url("test.css");
    @import url(test.css);
    @import "test.css" print;
    `),
  );
  expect(parseAtImport(atImports[0])).toBe(undefined);
  expect(parseAtImport(atImports[1])).toBe('test.css');
  expect(parseAtImport(atImports[2])).toBe('test.css');
  expect(parseAtImport(atImports[3])).toBe('test.css');
  expect(parseAtImport(atImports[4])).toBe('test.css');
});

test('parseComposesDeclarationWithFromUrl', () => {
  const composesDeclarations = createComposesDeclarations(
    createRoot(dedent`
    .a {
      composes: a;
      composes: a b c;
      composes: a from "test.css";
      composes: a b c from "test.css";
      composes: from from from from "test.css";
      /* NOTE: CSS Modules do not support '... from url("test.css")'. */
    }
    `),
  );
  expect(parseComposesDeclarationWithFromUrl(composesDeclarations[0])).toStrictEqual(undefined);
  expect(parseComposesDeclarationWithFromUrl(composesDeclarations[1])).toStrictEqual(undefined);
  expect(parseComposesDeclarationWithFromUrl(composesDeclarations[2])).toStrictEqual({
    from: 'test.css',
    tokenNames: ['a'],
  });
  expect(parseComposesDeclarationWithFromUrl(composesDeclarations[3])).toStrictEqual({
    from: 'test.css',
    tokenNames: ['a', 'b', 'c'],
  });
  expect(parseComposesDeclarationWithFromUrl(composesDeclarations[4])).toStrictEqual({
    from: 'test.css',
    tokenNames: ['from', 'from', 'from'], // do not deduplicate.
  });
});
