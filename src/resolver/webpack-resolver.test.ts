import { pathToFileURL } from 'url';
import { createFixtures, getFixturePath } from '../test/util.js';
import { createWebpackResolver } from './webpack-resolver.js';

const webpackResolver = createWebpackResolver();
const request = pathToFileURL(getFixturePath('/test/1.css')).href;

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
    pathToFileURL(getFixturePath('/node_modules/package-1/index.css')).href,
  );
  expect(await webpackResolver('~package-2', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/package-2/index.css')).href,
  );
  expect(await webpackResolver('~package-3/', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/package-3/index.css')).href,
  );
  expect(await webpackResolver('~package-4', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/package-4/style.css')).href,
  );
  expect(await webpackResolver('~@scoped/package-5/index.css', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/@scoped/package-5/index.css')).href,
  );
  expect(await webpackResolver('package-6/index.css', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/package-6/index.css')).href,
  );
  expect(await webpackResolver('~package-7', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/package-7/index.scss')).href,
  );
  expect(await webpackResolver('~package-8', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/package-8/index.less')).href,
  );
});
