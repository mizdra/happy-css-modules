import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { createFixtures, getFixturePath } from '../test/util.js';
import { defaultResolver } from './index.js';

const loader = new Loader({ resolver: defaultResolver });

test('resolve with webpackResolver when other resolvers fail to resolve', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import '2.css';
    @import '3.css';
    @import '~4.css';
    `,
    '/test/2.css': `.a {}`,
    '/test/3.css': `.a {}`,
    '/node_modules/3.css/index.css': `.a {}`,
    '/node_modules/4.css/index.css': `.a {}`,
  });
  const result = await loader.load(getFixturePath('/test/1.css'));
  expect(result.dependencies).toStrictEqual([
    getFixturePath('/test/2.css'),
    getFixturePath('/test/3.css'),
    getFixturePath('/node_modules/4.css/index.css'),
  ]);
});
