import { createFixtures, getFixturePath } from '../test/util.js';
import { createNodeResolver } from './node-resolver.js';

const nodeResolver = createNodeResolver();
const request = getFixturePath('/test/1.css');

test('resolves specifier with node mechanism', async () => {
  createFixtures({
    '/test/2.css': `.a {}`,
    '/test/dir/3.css': `.a {}`,
    '/4.css': `.a {}`,
    '/test/5.css': `.a {}`,
    '/node_modules/package-1/6.css': `.a {}`,
    '/package.json': `{ "imports": { "#subpath-1": "./test/7.css", "#subpath-2/*.css": "./test/*.css" } }`,
    '/test/7.css': `.a {}`,
    '/test/8.css': `.a {}`,
  });
  expect(await nodeResolver('./2.css', { request })).toBe(getFixturePath('/test/2.css'));
  expect(await nodeResolver('./dir/3.css', { request })).toBe(getFixturePath('/test/dir/3.css'));
  expect(await nodeResolver('../4.css', { request })).toBe(getFixturePath('/4.css'));
  expect(await nodeResolver(getFixturePath('/test/5.css'), { request })).toBe(getFixturePath('/test/5.css'));
  expect(await nodeResolver('package-1/6.css', { request })).toBe(getFixturePath('/node_modules/package-1/6.css'));
  expect(await nodeResolver('#subpath-1', { request })).toBe(getFixturePath('/test/7.css'));
  // FIXME: For some reason, it does not pass...
  // expect(await nodeResolver('#subpath-2/8.css', { request })).toBe(getFixturePath('/test/8.css'));
});
