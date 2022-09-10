import { createFixtures, getFixturePath } from '../test/util.js';
import { createDefaultResolver } from './index.js';

const defaultResolver = createDefaultResolver();
const request = getFixturePath('/test/1.css');

test('resolve with webpackResolver when other resolvers fail to resolve', async () => {
  createFixtures({
    '/test/2.css': `.a {}`,
    '/test/3.css': `.a {}`,
    '/node_modules/3.css/index.css': `.a {}`,
    '/node_modules/4.css/index.css': `.a {}`,
  });
  expect(await defaultResolver('2.css', { request })).toBe(getFixturePath('/test/2.css'));
  expect(await defaultResolver('3.css', { request })).toBe(getFixturePath('/test/3.css'));
  expect(await defaultResolver('~4.css', { request })).toBe(getFixturePath('/node_modules/4.css/index.css'));
});
