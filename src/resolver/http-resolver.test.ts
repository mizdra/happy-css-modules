import { pathToFileURL } from 'url';
import { getFixturePath } from '../test/util.js';
import { createHTTPResolver } from './http-resolver.js';

const httpResolver = createHTTPResolver();
const request = pathToFileURL(getFixturePath('/test/1.css')).href;

test('resolves specifier with http mechanism', async () => {
  expect(await httpResolver('http://example.com/path/1.css', { request })).toBe('http://example.com/path/1.css');
  expect(await httpResolver('https://example.com/path/1.css', { request })).toBe('https://example.com/path/1.css');
});
