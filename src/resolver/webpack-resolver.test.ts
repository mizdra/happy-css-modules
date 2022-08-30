import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { createFixtures, getFixturePath } from '../test/util.js';
import { webpackResolver } from './webpack-resolver.js';

const loader = new Loader({ resolver: webpackResolver });

test('resolves specifier with webpack mechanism', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import '~package-1/index.css';
    @import '~package-2';
    @import '~package-3/';
    @import '~package-4';
    @import '~@scoped/package-5/index.css';
    @import 'package-6/index.css';
    `,
    '/node_modules/package-1/index.css': `.a {}`,
    '/node_modules/package-2/index.css': `.a {}`,
    '/node_modules/package-3/index.css': `.a {}`,
    '/node_modules/package-4/package.json': `{ "style": "./style.css" }`,
    '/node_modules/package-4/style.css': `.a {}`,
    '/node_modules/@scoped/package-5/index.css': `.a {}`,
    '/node_modules/package-6/index.css': `.a {}`,
  });
  const result = await loader.load(getFixturePath('/test/1.css'));
  expect(result.dependencies).toStrictEqual([
    getFixturePath('/node_modules/package-1/index.css'),
    getFixturePath('/node_modules/package-2/index.css'),
    getFixturePath('/node_modules/package-3/index.css'),
    getFixturePath('/node_modules/package-4/style.css'),
    getFixturePath('/node_modules/@scoped/package-5/index.css'),
    getFixturePath('/node_modules/package-6/index.css'),
  ]);
});