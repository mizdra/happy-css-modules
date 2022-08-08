import { hasProp, isObject, isSystemError, unique } from '../src/util';

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
