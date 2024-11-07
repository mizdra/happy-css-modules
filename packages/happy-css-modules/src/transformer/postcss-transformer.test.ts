import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import dedent from 'dedent';
import { Locator } from '../locator/index.js';
import { createFixtures, getFixturePath } from '../test-util/util.js';
import { createPostcssTransformer } from './postcss-transformer.js';

const cwd = getFixturePath('/');
const require = createRequire(import.meta.url);

// NOTE: postcss-load-config caches the configuration file using the path as a key.
// Therefore, change the path for each test case so that a new configuration file is always used.

test('handles postcss features', async () => {
  const uuid = randomUUID();
  const locator = new Locator({
    transformer: createPostcssTransformer({
      cwd,
      postcssConfig: `${uuid}/postcss.config.js`,
    }),
  });
  createFixtures({
    [`/${uuid}/postcss.config.js`]: dedent`
    module.exports = {
      plugins: [
        require('${require.resolve('postcss-simple-vars')}'),
      ],
    };
    `,
    '/test/1.css': dedent`
    $prefix: foo;
    .$(prefix)_bar {}
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));

  expect(result).toMatchInlineSnapshot(`
    {
      dependencies: [],
      tokens: [
        {
          name: "foo_bar",
          originalLocation: {
            filePath: "<fixtures>/test/1.css",
            start: { line: 2, column: 1 },
            end: { line: 2, column: 8 },
          },
        },
      ],
    }
  `);
});

test('tracks dependencies that have been pre-bundled by postcss compiler', async () => {
  const uuid = randomUUID();
  const locator = new Locator({
    transformer: createPostcssTransformer({
      cwd,
      postcssConfig: `${uuid}/postcss.config.js`,
    }),
  });
  const loadSpy = vi.spyOn(locator, 'load');
  createFixtures({
    [`/${uuid}/postcss.config.js`]: dedent`
    module.exports = {
      plugins: [
        require('${require.resolve('postcss-import')}'),
      ],
    };
    `,
    '/test/1.css': dedent`
    @import './2.css';
    @import './3.css';
    `,
    '/test/2.css': ``,
    '/test/3.css': `@import './4.css'`,
    '/test/4.css': ``,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));

  // The files imported using @import are pre-bundled by the compiler.
  // Therefore, `Locator#load` is not called to process other files.
  expect(loadSpy).toBeCalledTimes(1);
  expect(loadSpy).toHaveBeenNthCalledWith(1, getFixturePath('/test/1.css'));

  // The files pre-bundled by the compiler are also included in `result.dependencies`
  expect(result.dependencies).toStrictEqual(['/test/2.css', '/test/3.css', '/test/4.css'].map(getFixturePath));
});

test('resolves specifier using resolver', async () => {
  const uuid = randomUUID();
  const locator = new Locator({
    transformer: createPostcssTransformer({
      cwd,
      postcssConfig: `${uuid}/postcss.config.js`,
    }),
  });
  createFixtures({
    [`/${uuid}/postcss.config.js`]: dedent`
    module.exports = {
      plugins: [
        // When using postcss-import, the resolver of happy-css-modules is ignored.
        // Therefore, we test here without postcss-import.
        // require('${require.resolve('postcss-import')}'),
      ],
    };
    `,
    '/test/1.css': dedent`
    @import 'package';
    `,
    '/node_modules/package/index.css': `.a {}`,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result.dependencies).toStrictEqual(['/node_modules/package/index.css'].map(getFixturePath));
});

test('ignores http(s) protocol file', async () => {
  const uuid = randomUUID();
  const locator = new Locator({
    transformer: createPostcssTransformer({
      cwd,
      postcssConfig: `${uuid}/postcss.config.js`,
    }),
  });
  createFixtures({
    [`/${uuid}/postcss.config.js`]: dedent`
    module.exports = {
      plugins: [
        // When using postcss-import, the resolver of happy-css-modules is ignored.
        // Therefore, we test here without postcss-import.
        // require('${require.resolve('postcss-import')}'),
      ],
    };
    `,
    '/test/1.css': dedent`
    @import 'http://example.com/path/http.css';
    @import 'https://example.com/path/https.css';
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result.dependencies).toStrictEqual([]);
});

test('returns false if postcssrc is not found', async () => {
  const uuid = randomUUID();
  const transformer = createPostcssTransformer({
    cwd,
    postcssConfig: `${uuid}/postcss.config.js`,
  });
  createFixtures({
    '/test/1.css': dedent`
    @import 'http://example.com/path/http.css';
    @import 'https://example.com/path/https.css';
    `,
  });
  expect(
    await transformer('', {
      from: getFixturePath('/test/1.css'),
      isIgnoredSpecifier: () => false,
      resolver: vi.fn(),
    }),
  ).toBe(false);
});

test('searches config from cwd if postcssConfig option is missing', async () => {
  const uuid = randomUUID();
  const cwd = `/${uuid}`;
  const locator = new Locator({
    transformer: createPostcssTransformer({
      cwd: getFixturePath(cwd),
    }),
  });
  createFixtures({
    [`/${uuid}/postcss.config.js`]: dedent`
    module.exports = {
      plugins: [
        require('${require.resolve('postcss-simple-vars')}'),
      ],
    };
    `,
    '/test/1.css': dedent`
    $prefix: foo;
    .$(prefix)_bar {}
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.css'));
  expect(result.tokens.map((token) => token.name)).toStrictEqual(['foo_bar']);
});
