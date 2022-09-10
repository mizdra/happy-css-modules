import { pathToFileURL } from 'url';
import { getFixturePath, createFixtures } from '../test/util.js';
import { createRelativeResolver } from './relative-resolver.js';

const relativeResolver = createRelativeResolver();
const request = pathToFileURL(getFixturePath('/test/1.css')).href;

test('resolves specifier with relative mechanism', async () => {
  createFixtures({
    '/test/2.css': `.a {}`,
    '/test/3.css': `.a {}`,
    '/test/dir/4.css': `.a {}`,
    '/5.css': `.a {}`,
  });
  expect(await relativeResolver('2.css', { request })).toBe(pathToFileURL(getFixturePath('/test/2.css')).href);
  expect(await relativeResolver('./3.css', { request })).toBe(pathToFileURL(getFixturePath('/test/3.css')).href);
  expect(await relativeResolver('dir/4.css', { request })).toBe(pathToFileURL(getFixturePath('/test/dir/4.css')).href);
  expect(await relativeResolver('../5.css', { request })).toBe(pathToFileURL(getFixturePath('/5.css')).href);
});
