import { pathToFileURL } from 'url';
import { getFixturePath, createFixtures } from '../test/util.js';
import { createResolveResolver } from './resolve-resolver.js';

const resolveResolver = createResolveResolver();
const request = pathToFileURL(getFixturePath('/test/1.css')).href;

test('resolves specifier with resolve mechanism', async () => {
  createFixtures({
    '/test/2.css': `.a {}`,
    '/test/3.css': `.a {}`,
    '/test/dir/4.css': `.a {}`,
    '/5.css': `.a {}`,
    '/test/6.css': `.a {}`,
  });
  expect(await resolveResolver('2.css', { request })).toBe(pathToFileURL(getFixturePath('/test/2.css')).href);
  expect(await resolveResolver('./3.css', { request })).toBe(pathToFileURL(getFixturePath('/test/3.css')).href);
  expect(await resolveResolver('dir/4.css', { request })).toBe(pathToFileURL(getFixturePath('/test/dir/4.css')).href);
  expect(await resolveResolver('../5.css', { request })).toBe(pathToFileURL(getFixturePath('/5.css')).href);
  expect(await resolveResolver(getFixturePath('/test/6.css'), { request })).toBe(
    pathToFileURL(getFixturePath('/test/6.css')).href,
  );
});
