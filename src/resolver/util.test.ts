import { isAbsoluteURL } from './util.js';

describe('isAbsoluteURL', () => {
  test('absolute URL', () => {
    expect(isAbsoluteURL('file:///path/to/file.css')).toBe(true);
    expect(isAbsoluteURL('http://example.com/path/to/file.css')).toBe(true);
    expect(isAbsoluteURL('https://example.com/path/to/file.css')).toBe(true);
  });
  test('not absolute URL', () => {
    expect(isAbsoluteURL('./path/to/file.css')).toBe(false);
    expect(isAbsoluteURL('path/to/file.css')).toBe(false);
    expect(isAbsoluteURL('/path/to/file.css')).toBe(false);
    expect(isAbsoluteURL('/path/to/file.css')).toBe(false);
    expect(isAbsoluteURL('ftp://example.com/path/to/file.css')).toBe(false);
  });
});
