import { createFixtures, getFixturePath } from '../test/util.js';
import { createWebpackResolver } from './webpack-resolver.js';

test('resolves specifier with css-loader mechanism', async () => {
  const webpackResolver = createWebpackResolver({
    cwd: getFixturePath('/'),
    webpackResolveAlias: {
      '@relative': 'test/alias-relative',
      '@absolute': getFixturePath('/test/alias-absolute'),
    },
  });
  const request = getFixturePath('/test/1.css');
  createFixtures({
    '/node_modules/package-1/index.css': `.a {}`,
    '/node_modules/package-2/index.css': `.a {}`,
    '/node_modules/package-3/index.css': `.a {}`,
    '/node_modules/package-4/package.json': `{ "style": "./style.css" }`,
    '/node_modules/package-4/style.css': `.a {}`,
    '/node_modules/@scoped/package-5/index.css': `.a {}`,
    '/node_modules/package-6/index.css': `.a {}`,
    '/test/alias-relative/alias.css': `.a {}`,
    '/test/alias-absolute/alias.css': `.a {}`,
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
  expect(await webpackResolver('@relative/alias.css', { request })).toBe(
    getFixturePath('/test/alias-relative/alias.css'),
  );
  expect(await webpackResolver('@absolute/alias.css', { request })).toBe(
    getFixturePath('/test/alias-absolute/alias.css'),
  );
});

test('resolves specifier with sass-loader mechanism', async () => {
  const webpackResolver = createWebpackResolver({
    cwd: getFixturePath('/'),
    sassLoadPaths: ['test/load-paths-relative', getFixturePath('/test/load-paths-absolute')],
    webpackResolveAlias: {
      '@relative': 'test/alias-relative',
      '@absolute': getFixturePath('/test/alias-absolute'),
    },
  });
  const request = getFixturePath('/test/1.scss');
  createFixtures({
    '/node_modules/package-1/index.scss': `.a {}`,
    '/test/load-paths-relative/load-paths-relative.scss': `.a {}`,
    '/test/load-paths-absolute/load-paths-absolute.scss': `.a {}`,
    '/test/_partial-import.scss': `.a {}`,
    '/test/alias-relative/alias.scss': `.a {}`,
    '/test/alias-absolute/alias.scss': `.a {}`,
  });
  expect(await webpackResolver('~package-1/index.scss', { request })).toBe(
    getFixturePath('/node_modules/package-1/index.scss'),
  );
  expect(await webpackResolver('~package-1', { request })).toBe(getFixturePath('/node_modules/package-1/index.scss'));
  // ref: https://github.com/webpack-contrib/sass-loader/blob/bed9fb5799a90020d43f705ea405f85b368621d7/test/scss/import-include-paths.scss#L1
  expect(await webpackResolver('load-paths-relative', { request })).toBe(
    getFixturePath('/test/load-paths-relative/load-paths-relative.scss'),
  );
  expect(await webpackResolver('load-paths-absolute', { request })).toBe(
    getFixturePath('/test/load-paths-absolute/load-paths-absolute.scss'),
  );
  // https://sass-lang.com/documentation/at-rules/import#partials
  // https://github.com/webpack-contrib/sass-loader/blob/0e9494074f69a6b6d47efea6c083a02a31a5ae84/test/sass/import-with-underscore.sass
  expect(await webpackResolver('partial-import', { request: getFixturePath('/test/1.scss') })).toBe(
    getFixturePath('/test/_partial-import.scss'),
  );
  expect(await webpackResolver('test/partial-import', { request: getFixturePath('/test') })).toBe(
    getFixturePath('/test/_partial-import.scss'),
  );
  expect(await webpackResolver('@relative/alias.scss', { request })).toBe(
    getFixturePath('/test/alias-relative/alias.scss'),
  );
  expect(await webpackResolver('@absolute/alias.scss', { request })).toBe(
    getFixturePath('/test/alias-absolute/alias.scss'),
  );
});

test('resolves specifier with less-loader mechanism', async () => {
  const webpackResolver = createWebpackResolver({
    cwd: getFixturePath('/'),
    lessIncludePaths: ['test/include-paths-relative', getFixturePath('/test/include-paths-absolute')],
    webpackResolveAlias: {
      '@relative': 'test/alias-relative',
      '@absolute': getFixturePath('/test/alias-absolute'),
    },
  });
  const request = getFixturePath('/test/1.less');
  createFixtures({
    '/node_modules/package-1/index.less': `.a {}`,
    '/test/include-paths-relative/include-paths-relative.less': `.a {}`,
    '/test/include-paths-absolute/include-paths-absolute.less': `.a {}`,
    '/test/alias-relative/alias.less': `.a {}`,
    '/test/alias-absolute/alias.less': `.a {}`,
  });
  expect(await webpackResolver('~package-1/index.less', { request })).toBe(
    getFixturePath('/node_modules/package-1/index.less'),
  );
  expect(await webpackResolver('~package-1', { request })).toBe(getFixturePath('/node_modules/package-1/index.less'));
  // ref: https://github.com/webpack-contrib/less-loader/blob/81a0d27eb6d18e5dc550a60fc1007fdc77305b78/test/loader.test.js#L248-L253
  // ref: https://github.com/webpack-contrib/less-loader/blob/393147064672ace986ec84aca21f69f0ab819a9c/test/fixtures/import-paths.less#L1
  // ref: https://github.com/webpack-contrib/less-loader/blob/99d80bd290dae50375db6e17c5f56ec33754e258/test/helpers/getCodeFromLess.js#L47-L54
  expect(await webpackResolver('include-paths-relative', { request })).toBe(
    getFixturePath('/test/include-paths-relative/include-paths-relative.less'),
  );
  expect(await webpackResolver('include-paths-absolute', { request })).toBe(
    getFixturePath('/test/include-paths-absolute/include-paths-absolute.less'),
  );
  expect(await webpackResolver('@relative/alias.less', { request })).toBe(
    getFixturePath('/test/alias-relative/alias.less'),
  );
  expect(await webpackResolver('@absolute/alias.less', { request })).toBe(
    getFixturePath('/test/alias-absolute/alias.less'),
  );
});
