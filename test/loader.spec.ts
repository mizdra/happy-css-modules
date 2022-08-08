import fs from 'fs/promises';
import { resolve } from 'path';
import dedent from 'dedent';
import less from 'less';
import mockfs from 'mock-fs';
import sass from 'sass';
import { Loader, Transformer } from '../src/loader';

const loader = new Loader();

const readFileSpy = jest.spyOn(fs, 'readFile');

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
  mockfs.bypass(() =>
    expect(result).toMatchInlineSnapshot(`
      Object {
        "filePath": "/test/1.css",
        "localTokens": Array [
          Object {
            "name": "a",
            "originalLocations": Array [
              Object {
                "end": Object {
                  "column": 2,
                  "line": 1,
                },
                "filePath": "/test/1.css",
                "start": Object {
                  "column": 1,
                  "line": 1,
                },
              },
            ],
          },
          Object {
            "name": "b",
            "originalLocations": Array [
              Object {
                "end": Object {
                  "column": 2,
                  "line": 2,
                },
                "filePath": "/test/1.css",
                "start": Object {
                  "column": 1,
                  "line": 2,
                },
              },
            ],
          },
        ],
        "tokenImports": Array [],
      }
    `),
  );
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
  mockfs.bypass(() =>
    expect(result).toMatchInlineSnapshot(`
      Object {
        "filePath": "/test/1.css",
        "localTokens": Array [],
        "tokenImports": Array [
          Object {
            "fromResult": Object {
              "filePath": "/test/2.css",
              "localTokens": Array [
                Object {
                  "name": "a",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/2.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "type": "all",
          },
          Object {
            "fromResult": Object {
              "filePath": "/test/3.css",
              "localTokens": Array [
                Object {
                  "name": "b",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/3.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "type": "all",
          },
          Object {
            "fromResult": Object {
              "filePath": "/test/4.css",
              "localTokens": Array [
                Object {
                  "name": "c",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/4.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "type": "all",
          },
        ],
      }
    `),
  );
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
  mockfs.bypass(() =>
    expect(result).toMatchInlineSnapshot(`
      Object {
        "filePath": "/test/1.css",
        "localTokens": Array [
          Object {
            "name": "a",
            "originalLocations": Array [
              Object {
                "end": Object {
                  "column": 2,
                  "line": 1,
                },
                "filePath": "/test/1.css",
                "start": Object {
                  "column": 1,
                  "line": 1,
                },
              },
            ],
          },
        ],
        "tokenImports": Array [
          Object {
            "fromResult": Object {
              "filePath": "/test/2.css",
              "localTokens": Array [
                Object {
                  "name": "b",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/2.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "names": Array [
              "b",
            ],
            "type": "byNames",
          },
          Object {
            "fromResult": Object {
              "filePath": "/test/3.css",
              "localTokens": Array [
                Object {
                  "name": "c",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/3.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
                Object {
                  "name": "d",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 2,
                      },
                      "filePath": "/test/3.css",
                      "start": Object {
                        "column": 1,
                        "line": 2,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "names": Array [
              "c",
              "d",
            ],
            "type": "byNames",
          },
          Object {
            "fromResult": Object {
              "filePath": "/test/4.css",
              "localTokens": Array [
                Object {
                  "name": "e",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/4.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "names": Array [
              "e",
            ],
            "type": "byNames",
          },
        ],
      }
    `),
  );
});

test('deduplicates `TokenImport#names` when `TokenImport` is `byNames` type', async () => {
  mockfs({
    '/test/1.css': dedent`
    .a {
      composes: b from './2.css';
      composes: b b from './2.css';
    }
    `,
    '/test/2.css': dedent`
    .b {}
    `,
  });
  const result = await loader.load('/test/1.css');
  mockfs.bypass(() =>
    expect(result).toMatchInlineSnapshot(`
      Object {
        "filePath": "/test/1.css",
        "localTokens": Array [
          Object {
            "name": "a",
            "originalLocations": Array [
              Object {
                "end": Object {
                  "column": 2,
                  "line": 1,
                },
                "filePath": "/test/1.css",
                "start": Object {
                  "column": 1,
                  "line": 1,
                },
              },
            ],
          },
        ],
        "tokenImports": Array [
          Object {
            "fromResult": Object {
              "filePath": "/test/2.css",
              "localTokens": Array [
                Object {
                  "name": "b",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/2.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "names": Array [
              "b",
            ],
            "type": "byNames",
          },
        ],
      }
    `),
  );
});

test('deduplicates `tokenImports` when `TokenImport` is `all` type', async () => {
  mockfs({
    '/test/1.css': dedent`
    @import './2.css';
    @import './2.css';
    `,
    '/test/2.css': dedent``,
  });
  const result = await loader.load('/test/1.css');
  mockfs.bypass(() =>
    expect(result).toMatchInlineSnapshot(`
      Object {
        "filePath": "/test/1.css",
        "localTokens": Array [],
        "tokenImports": Array [
          Object {
            "fromResult": Object {
              "filePath": "/test/2.css",
              "localTokens": Array [],
              "tokenImports": Array [],
            },
            "type": "all",
          },
        ],
      }
    `),
  );
});

test('give priority to `all` type over `byNames` type', async () => {
  mockfs({
    '/test/1.css': dedent`
    @import './2.css';
    .a {
      composes: b c from './2.css';
    }
    `,
    '/test/2.css': dedent`
    .b {}
    .c {}
    `,
  });
  const result = await loader.load('/test/1.css');
  mockfs.bypass(() =>
    expect(result).toMatchInlineSnapshot(`
      Object {
        "filePath": "/test/1.css",
        "localTokens": Array [
          Object {
            "name": "a",
            "originalLocations": Array [
              Object {
                "end": Object {
                  "column": 2,
                  "line": 2,
                },
                "filePath": "/test/1.css",
                "start": Object {
                  "column": 1,
                  "line": 2,
                },
              },
            ],
          },
        ],
        "tokenImports": Array [
          Object {
            "fromResult": Object {
              "filePath": "/test/2.css",
              "localTokens": Array [
                Object {
                  "name": "b",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 1,
                      },
                      "filePath": "/test/2.css",
                      "start": Object {
                        "column": 1,
                        "line": 1,
                      },
                    },
                  ],
                },
                Object {
                  "name": "c",
                  "originalLocations": Array [
                    Object {
                      "end": Object {
                        "column": 2,
                        "line": 2,
                      },
                      "filePath": "/test/2.css",
                      "start": Object {
                        "column": 1,
                        "line": 2,
                      },
                    },
                  ],
                },
              ],
              "tokenImports": Array [],
            },
            "type": "all",
          },
        ],
      }
    `),
  );
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

  // `1.css` is not updated, so the cache is used. Therefore, `readFile` is not called.
  await loader.load('/test/1.css');
  expect(readFileSpy).toHaveBeenCalledTimes(0);

  // `2.css` is updated, so the cache is not used. Therefore, `readFile` is called.
  await loader.load('/test/2.css');
  expect(readFileSpy).toHaveBeenCalledTimes(1);
  expect(readFileSpy).toHaveBeenNthCalledWith(1, '/test/2.css', 'utf-8');
});

describe('called with transform option', () => {
  const transform: Transformer = async (source: string, from: string) => {
    if (from.endsWith('.scss')) {
      const result = sass.compile(from, { sourceMap: true });
      return { css: result.css, map: result.sourceMap };
    } else if (from.endsWith('.less')) {
      const result = await less.render(source, {
        filename: from,
        sourceMap: {},
      });
      return { css: result.css, map: result.map };
    }
    return { css: source };
  };
  test('supports sass transpiler', async () => {
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
    const result = await loader.load('/test/1.scss', transform);
    mockfs.bypass(() =>
      expect(result).toMatchInlineSnapshot(`
        Object {
          "filePath": "/test/1.scss",
          "localTokens": Array [
            Object {
              "name": "b_1",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 4,
                    "line": 1,
                  },
                  "filePath": "/test/2.scss",
                  "start": Object {
                    "column": 1,
                    "line": 1,
                  },
                },
              ],
            },
            Object {
              "name": "c",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 2,
                    "line": 1,
                  },
                  "filePath": "/test/3.scss",
                  "start": Object {
                    "column": 1,
                    "line": 1,
                  },
                },
              ],
            },
            Object {
              "name": "a_1",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 4,
                    "line": 3,
                  },
                  "filePath": "/test/1.scss",
                  "start": Object {
                    "column": 1,
                    "line": 3,
                  },
                },
              ],
            },
            Object {
              "name": "a_2",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 4,
                    "line": 4,
                  },
                  "filePath": "/test/1.scss",
                  "start": Object {
                    "column": 1,
                    "line": 4,
                  },
                },
              ],
            },
          ],
          "tokenImports": Array [
            Object {
              "fromResult": Object {
                "filePath": "/test/4.scss",
                "localTokens": Array [
                  Object {
                    "name": "d",
                    "originalLocations": Array [
                      Object {
                        "end": Object {
                          "column": 2,
                          "line": 1,
                        },
                        "filePath": "/test/4.scss",
                        "start": Object {
                          "column": 1,
                          "line": 1,
                        },
                      },
                    ],
                  },
                ],
                "tokenImports": Array [],
              },
              "names": Array [
                "d",
              ],
              "type": "byNames",
            },
          ],
        }
      `),
    );
  });
  test('supports less transpiler', async () => {
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
    const result = await loader.load('/test/1.less', transform);
    mockfs.bypass(() =>
      expect(result).toMatchInlineSnapshot(`
        Object {
          "filePath": "/test/1.less",
          "localTokens": Array [
            Object {
              "name": "b_1",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 4,
                    "line": 1,
                  },
                  "filePath": "/test/2.less",
                  "start": Object {
                    "column": 1,
                    "line": 1,
                  },
                },
              ],
            },
            Object {
              "name": "a_1",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 4,
                    "line": 2,
                  },
                  "filePath": "/test/1.less",
                  "start": Object {
                    "column": 1,
                    "line": 2,
                  },
                },
              ],
            },
            Object {
              "name": "a_2",
              "originalLocations": Array [
                Object {
                  "end": Object {
                    "column": 4,
                    "line": 3,
                  },
                  "filePath": "/test/1.less",
                  "start": Object {
                    "column": 1,
                    "line": 3,
                  },
                },
              ],
            },
          ],
          "tokenImports": Array [
            Object {
              "fromResult": Object {
                "filePath": "/test/3.less",
                "localTokens": Array [
                  Object {
                    "name": "c",
                    "originalLocations": Array [
                      Object {
                        "end": Object {
                          "column": 2,
                          "line": 1,
                        },
                        "filePath": "/test/3.less",
                        "start": Object {
                          "column": 1,
                          "line": 1,
                        },
                      },
                    ],
                  },
                ],
                "tokenImports": Array [],
              },
              "names": Array [
                "c",
              ],
              "type": "byNames",
            },
          ],
        }
      `),
    );
  });
});
