import {
  toMatchInlineSnapshot,
  toMatchSnapshot,
  toThrowErrorMatchingInlineSnapshot,
  toThrowErrorMatchingSnapshot,
} from 'jest-snapshot';
import mockfs from 'mock-fs';

expect.extend({
  toMatchInlineSnapshot(...args) {
    // @ts-ignore
    return mockfs.bypass(() => toMatchInlineSnapshot.call(this, ...args));
  },
  toMatchSnapshot(...args) {
    // @ts-ignore
    return mockfs.bypass(() => toMatchSnapshot.call(this, ...args));
  },
  toThrowErrorMatchingInlineSnapshot(...args) {
    // @ts-ignore
    return mockfs.bypass(() => toThrowErrorMatchingInlineSnapshot.call(this, ...args));
  },
  toThrowErrorMatchingSnapshot(...args) {
    // @ts-ignore
    return mockfs.bypass(() => toThrowErrorMatchingSnapshot.call(this, ...args));
  },
});
