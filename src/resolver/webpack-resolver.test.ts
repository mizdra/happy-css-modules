import { createFixtures, getFixturePath } from '../test/util.js';
import { createWebpackResolver } from './webpack-resolver.js';

const webpackResolver = createWebpackResolver();
const request = getFixturePath('/test/1.css');

test('resolves specifier with webpack mechanism', async () => {
  createFixtures({
    '/node_modules/package-1/index.css': `.a {}`,
    '/node_modules/package-2/index.css': `.a {}`,
    '/node_modules/package-3/index.css': `.a {}`,
    '/node_modules/package-4/package.json': `{ "style": "./style.css" }`,
    '/node_modules/package-4/style.css': `.a {}`,
    '/node_modules/@scoped/package-5/index.css': `.a {}`,
    '/node_modules/package-6/index.css': `.a {}`,
    '/node_modules/package-7/index.scss': `.a { dummy: ''; }`,
    '/node_modules/package-8/index.less': `.a { dummy: ''; }`,
  });
  expect(await webpackResolver('~package-1/index.css', { request })).toBe(
    getFixturePath('/node_modules/package-1/index.css'),
  );
  expect(await webpackResolver('~package-2', { request })).toBe(getFixturePath('/node_modules/package-2/index.css'));
  expect(await webpackResolver('~package-3/', { request })).toBe(getFixturePath('/node_modules/package-3/index.css'));
  expect(await webpackResolver('~package-4', { request })).toBe(getFixturePath('/node_modules/package-4/style.css'));
  expect(await webpackResolver('~@scoped/package-5/index.css', { request })).toBe(
    getFixturePath('/node_modules/@scoped/package-5/index.css'),
  );
  expect(await webpackResolver('package-6/index.css', { request })).toBe(
    getFixturePath('/node_modules/package-6/index.css'),
  );
  expect(await webpackResolver('~package-7', { request })).toBe(getFixturePath('/node_modules/package-7/index.scss'));
  expect(await webpackResolver('~package-8', { request })).toBe(getFixturePath('/node_modules/package-8/index.less'));
});
