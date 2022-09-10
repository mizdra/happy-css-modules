import { getFixturePath } from '../test/util.js';
import { createResolveResolver } from './resolve-resolver.js';

const resolveResolver = createResolveResolver();
const request = getFixturePath('/test/1.css');

test('resolves specifier with resolve mechanism', async () => {
  expect(await resolveResolver('2.css', { request })).toBe(getFixturePath('/test/2.css'));
  expect(await resolveResolver('./3.css', { request })).toBe(getFixturePath('/test/3.css'));
  expect(await resolveResolver('dir/4.css', { request })).toBe(getFixturePath('/test/dir/4.css'));
  expect(await resolveResolver('../5.css', { request })).toBe(getFixturePath('/5.css'));
  expect(await resolveResolver(getFixturePath('/test/6.css'), { request })).toBe(getFixturePath('/test/6.css'));
});
