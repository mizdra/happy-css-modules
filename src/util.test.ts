import { join } from 'path';
import { hasProp, isObject, isSystemError, unique, uniqueBy } from '../src/util.js';
import { createFixtures, getFixturePath } from './test/util.js';
import { isMatchByGlob, exists } from './util.js';

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
