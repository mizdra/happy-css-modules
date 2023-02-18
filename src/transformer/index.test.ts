import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import dedent from 'dedent';
import { Locator } from '../locator/index.js';
import { createFixtures, getFixturePath } from '../test-util/util.js';
import { createDefaultTransformer } from './index.js';

const require = createRequire(import.meta.url);

const cwd = getFixturePath('/');
const locator = new Locator({ transformer: createDefaultTransformer({ cwd }) });

test('processes .scss with scss transformer', async () => {
  createFixtures({
    '/test/1.scss': dedent`
    .a {
      // scss feature test (nesting)
      .a_1 { dummy: ''; }
    }
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.scss'));
  expect(result.tokens.map((token) => token.name)).toStrictEqual(['a', 'a_1']);
});

test('processes .less with less transformer', async () => {
  createFixtures({
    '/test/1.less': dedent`
    .a {
      // less feature test (nesting)
      .a_1 { dummy: ''; }
    }
    `,
  });
  const result = await locator.load(getFixturePath('/test/1.less'));
  expect(result.tokens.map((token) => token.name)).toStrictEqual(['a', 'a_1']);
});

test('processes .css with postcss transformer if postcssrc is found', async () => {
  // if postcssrc is not found
  const locator1 = new Locator({ transformer: createDefaultTransformer() });
  createFixtures({
    '/test/1.css': dedent`
    $prefix: foo;
    .$(prefix)_bar {}
    `,
  });
  const result1 = await locator1.load(getFixturePath('/test/1.css'));
  expect(result1.tokens.map((token) => token.name)).toStrictEqual(['$(prefix)']);

  // if postcssrc is found
  const uuid = randomUUID();
  const locator2 = new Locator({
    transformer: createDefaultTransformer({ cwd, postcssConfig: `${uuid}/postcss.config.js` }),
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
  const result2 = await locator2.load(getFixturePath('/test/1.css'));
  expect(result2.tokens.map((token) => token.name)).toStrictEqual(['foo_bar']);
});
