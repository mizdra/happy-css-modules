import { stat } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { rest } from 'msw';
import { fetchContent, hasProp, isObject, isSystemError, unique, uniqueBy } from '../src/util.js';
import { server } from './test/msw.js';
import { createFixtures, getFixturePath, oneOf } from './test/util.js';
import { isURL, fetchRevision, isMatchByGlob, exists } from './util.js';

function fakeSystemError({ code }: { code: string }) {
  const error = new Error();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error as any).code = code;
  return error;
}

test('isSystemError', () => {
  expect(isSystemError(fakeSystemError({ code: 'ENOENT' }))).toBe(true);
  expect(isSystemError(fakeSystemError({ code: 'EACCES' }))).toBe(true);
  expect(isSystemError(new Error('ENOENT'))).toBe(false);
  expect(isSystemError({ code: 'ENOENT' })).toBe(false);
});

test('isObject', () => {
  expect(isObject({})).toBe(true);
  expect(isObject({ a: '1' })).toBe(true);
  expect(isObject([])).toBe(true);
  expect(
    isObject(() => {
      /* noop */
    }),
  ).toBe(true);
  expect(isObject(null)).toBe(false);
  expect(isObject(undefined)).toBe(false);
  expect(isObject(1)).toBe(false);
  expect(isObject('1')).toBe(false);
  expect(isObject(true)).toBe(false);
});

test('hasProp', () => {
  expect(hasProp({ a: '1' }, 'a')).toBe(true);
  expect(hasProp({ a: '1' }, 'b')).toBe(false);
  // it can check prototype
  expect(hasProp({}, 'toString')).toBe(true);
  expect(hasProp([], 'length')).toBe(true);
});

test('unique', () => {
  expect(unique([0, 1, 1, 2, 1])).toStrictEqual([0, 1, 2]);
});

test('uniqueBy', () => {
  expect(uniqueBy([], () => 0)).toStrictEqual([]);
  expect(
    uniqueBy(
      [
        { key: 'a', value: 0 },
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
        { key: 'b', value: 3 },
        { key: 'c', value: 4 },
        { key: 'c', value: 5 },
      ],
      (el) => el.key,
    ),
  ).toStrictEqual([
    { key: 'a', value: 0 },
    { key: 'b', value: 2 },
    { key: 'c', value: 4 },
  ]);
});

test('exists', async () => {
  createFixtures({
    '/test/1.css': `.a {}`,
  });
  expect(await exists(getFixturePath('/test/1.css'))).toBe(true);
  expect(await exists(getFixturePath('/test/2.css'))).toBe(false);
});

test('isMatchByGlob', () => {
  const cwd = process.cwd();
  expect(isMatchByGlob(join(cwd, '1.css'), '*.css', { cwd })).toBe(true);
  expect(isMatchByGlob(join(cwd, '1.scss'), '*.css', { cwd })).toBe(false);
  expect(isMatchByGlob(join(cwd, 'dir/1.css'), '**/*.css', { cwd })).toBe(true);
  expect(isMatchByGlob(join(cwd, 'dir/dir/1.css'), '**/*.css', { cwd })).toBe(true);
  expect(isMatchByGlob(join(cwd, '1.css'), '*.{css,scss}', { cwd })).toBe(true);
  expect(isMatchByGlob(join(cwd, '1.scss'), '*.{css,scss}', { cwd })).toBe(true);
  expect(isMatchByGlob(join(cwd, '1.less'), '*.{css,scss}', { cwd })).toBe(false);
  expect(isMatchByGlob(join(cwd, '1.css'), '!(*.css)', { cwd })).toBe(false);
  expect(isMatchByGlob(join(cwd, '1.scss'), '!(*.css)', { cwd })).toBe(true);
  expect(isMatchByGlob(join(cwd, '1.less'), '!(*.css)', { cwd })).toBe(true);
});

describe('fetchRevision', () => {
  test('http/https protocol', async () => {
    const protocol = oneOf(['http', 'https']);
    server.use(
      rest.get(`${protocol}://example.com/test/etag.css`, (_req, res, ctx) =>
        res(ctx.set('etag', 'etag-value'), ctx.set('last-modified', '1234567890'), ctx.text('.a {}')),
      ),
    );
    server.use(
      rest.get(`${protocol}://example.com/test/last-modified.css`, (_req, res, ctx) =>
        res(ctx.set('last-modified', '1234567890'), ctx.text('.a {}')),
      ),
    );
    server.use(rest.get(`${protocol}://example.com/test/content-hash.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));
    expect(await fetchRevision(`${protocol}://example.com/test/etag.css`)).toBe('etag:etag-value');
    expect(await fetchRevision(`${protocol}://example.com/test/last-modified.css`)).toBe('last-modified:1234567890');
    expect(await fetchRevision(`${protocol}://example.com/test/content-hash.css`)).toBe(
      'content-hash:16106342b3ea064b29ae5c92c47c15d0d0dd3e764e1ec0a2fbb09e8cbc2d8bf7',
    );
  });
  test('file protocol', async () => {
    createFixtures({
      '/test/1.css': `.a {}`,
    });
    const mtime = (await stat(getFixturePath('/test/1.css'))).mtime.getTime();
    expect(await fetchRevision(pathToFileURL(getFixturePath('/test/1.css')).href)).toBe(`mtime:${mtime}`);
  });
});

describe('fetchContent', () => {
  test('http/https protocol', async () => {
    const protocol = oneOf(['http', 'https']);
    server.use(rest.get(`${protocol}://example.com/test/1.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));
    expect(await fetchContent(`${protocol}://example.com/test/1.css`)).toBe('.a {}');
  });
  test('file protocol', async () => {
    createFixtures({
      '/test/1.css': `.a {}`,
    });
    expect(await fetchContent(pathToFileURL(getFixturePath('/test/1.css')).href)).toBe('.a {}');
  });
});

test('isURL', () => {
  expect(isURL('http://example.com')).toBe(true);
  expect(isURL('https://example.com')).toBe(true);
  expect(isURL('file:///test/1.css')).toBe(true);
  expect(isURL('/test/1.css')).toBe(false);
});
