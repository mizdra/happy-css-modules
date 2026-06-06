import { getFixturePath } from '../test-util/util.js';
import { createRelativeResolver } from './relative-resolver.js';

const relativeResolver = createRelativeResolver();
const request = getFixturePath('/test/1.css');

test('resolves specifier with relative mechanism', async () => {
  expect(await relativeResolver('2.css', { request })).toBe(getFixturePath('/test/2.css'));
  expect(await relativeResolver('./3.css', { request })).toBe(getFixturePath('/test/3.css'));
  expect(await relativeResolver('dir/4.css', { request })).toBe(getFixturePath('/test/dir/4.css'));
  expect(await relativeResolver('../5.css', { request })).toBe(getFixturePath('/5.css'));
  expect(await relativeResolver(getFixturePath('/test/6.css'), { request })).toBe(getFixturePath('/test/6.css'));
});
