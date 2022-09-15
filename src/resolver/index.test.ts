import { pathToFileURL } from 'url';
import { createFixtures, getFixturePath } from '../test/util.js';
import { createDefaultResolver } from './index.js';

const defaultResolver = createDefaultResolver();
const request = pathToFileURL(getFixturePath('/test/1.css')).href;

test('resolve absolute URL', async () => {
  expect(await defaultResolver('file:///path/to/file.css', { request })).toBe('file:///path/to/file.css');
  expect(await defaultResolver('http://example.com/path/to/file.css', { request })).toBe(
    'http://example.com/path/to/file.css',
  );
  expect(await defaultResolver('https://example.com/path/to/file.css', { request })).toBe(
    'https://example.com/path/to/file.css',
  );
});

test('resolve with webpackResolver when other resolvers fail to resolve', async () => {
  createFixtures({
    '/test/2.css': `.a {}`,
    '/test/3.css': `.a {}`,
    '/node_modules/3.css/index.css': `.a {}`,
    '/node_modules/4.css/index.css': `.a {}`,
  });
  expect(await defaultResolver('2.css', { request })).toBe(pathToFileURL(getFixturePath('/test/2.css')).href);
  expect(await defaultResolver('3.css', { request })).toBe(pathToFileURL(getFixturePath('/test/3.css')).href);
  expect(await defaultResolver('~4.css', { request })).toBe(
    pathToFileURL(getFixturePath('/node_modules/4.css/index.css')).href,
  );
});
