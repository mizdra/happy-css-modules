import { getIndexFromLineColumn } from './line-column.js';

describe('getIndexFromLineColumn', () => {
  test('returns 0 for the first character', () => {
    expect(getIndexFromLineColumn('abc', 1, 1)).toBe(0);
  });
  test('returns the index of a column in the middle of the first line', () => {
    expect(getIndexFromLineColumn('abc', 1, 3)).toBe(2);
  });
  test('returns the index of the head of the second line', () => {
    expect(getIndexFromLineColumn('abc\ndef', 2, 1)).toBe(4);
  });
  test('returns the index of a column in the middle of the second line', () => {
    expect(getIndexFromLineColumn('abc\ndef', 2, 3)).toBe(6);
  });
  test('handles empty lines', () => {
    // 'abc\n\ndef' => a=0 b=1 c=2 \n=3 \n=4 d=5 e=6 f=7
    expect(getIndexFromLineColumn('abc\n\ndef', 2, 1)).toBe(4);
    expect(getIndexFromLineColumn('abc\n\ndef', 3, 1)).toBe(5);
  });
});
