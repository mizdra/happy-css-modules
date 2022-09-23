import { createFixtures, getFixturePath } from '../test/util.js';
import { createWebpackResolver } from './webpack-resolver.js';

const webpackResolver = createWebpackResolver();

test('resolves specifier with css-loader mechanism', async () => {
  const request = getFixturePath('/test/1.css');
  createFixtures({
    '/node_modules/package-1/index.css': `.a {}`,
    '/node_modules/package-2/index.css': `.a {}`,
    '/node_modules/package-3/index.css': `.a {}`,
    '/node_modules/package-4/package.json': `{ "style": "./style.css" }`,
    '/node_modules/package-4/style.css': `.a {}`,
    '/node_modules/@scoped/package-5/index.css': `.a {}`,
    '/node_modules/package-6/index.css': `.a {}`,
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
});

test('resolves specifier with sass-loader mechanism', async () => {
  const webpackResolver = createWebpackResolver({ sassLoadPaths: [getFixturePath('/test/styles')] });
  const request = getFixturePath('/test/1.scss');
  createFixtures({
    '/node_modules/package-1/index.scss': `.a {}`,
    '/test/styles/load-paths.scss': `.a {}`,
    '/test/_partial-import.scss': `.a {}`,
  });
  expect(await webpackResolver('~package-1/index.scss', { request })).toBe(
    getFixturePath('/node_modules/package-1/index.scss'),
  );
  expect(await webpackResolver('~package-1', { request })).toBe(getFixturePath('/node_modules/package-1/index.scss'));
  // ref: https://github.com/webpack-contrib/sass-loader/blob/bed9fb5799a90020d43f705ea405f85b368621d7/test/scss/import-include-paths.scss#L1
  expect(await webpackResolver('load-paths', { request })).toBe(getFixturePath('/test/styles/load-paths.scss'));
  // https://sass-lang.com/documentation/at-rules/import#partials
  // https://github.com/webpack-contrib/sass-loader/blob/0e9494074f69a6b6d47efea6c083a02a31a5ae84/test/sass/import-with-underscore.sass
  expect(await webpackResolver('partial-import', { request: getFixturePath('/test/1.scss') })).toBe(
    getFixturePath('/test/_partial-import.scss'),
  );
  expect(await webpackResolver('test/partial-import', { request: getFixturePath('/test') })).toBe(
    getFixturePath('/test/_partial-import.scss'),
  );
});

test('resolves specifier with less-loader mechanism', async () => {
  const request = getFixturePath('/test/1.less');
  createFixtures({
    '/node_modules/package-1/index.less': `.a {}`,
  });
  expect(await webpackResolver('~package-1/index.less', { request })).toBe(
    getFixturePath('/node_modules/package-1/index.less'),
  );
  expect(await webpackResolver('~package-1', { request })).toBe(getFixturePath('/node_modules/package-1/index.less'));
});
