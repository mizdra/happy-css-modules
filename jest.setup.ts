import {
  toMatchInlineSnapshot,
  toMatchSnapshot,
  toThrowErrorMatchingInlineSnapshot,
  toThrowErrorMatchingSnapshot,
} from 'jest-snapshot';
import mockfs from 'mock-fs';
import { format } from 'prettier';

// There is a problem that snapshots cannot be written when the filesystem is mocked with mock-fs.
// Here is a workaround for that problem by overriding the default matcher.
// ref: https://github.com/tschaub/mock-fs#using-with-jest-snapshot-testing
expect.extend({
  toMatchInlineSnapshot(...args: Parameters<typeof toMatchInlineSnapshot>) {
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

const jsonSerializer: jest.SnapshotSerializerPlugin = {
  serialize(val) {
    return format(JSON.stringify(val), { parser: 'json' });
  },

  test(val) {
    const isLoadResult =
      val &&
      Object.prototype.hasOwnProperty.call(val, 'tokens') &&
      Object.prototype.hasOwnProperty.call(val, 'dependencies');
    const isLocation =
      val &&
      Object.prototype.hasOwnProperty.call(val, 'filePath') &&
      Object.prototype.hasOwnProperty.call(val, 'start') &&
      Object.prototype.hasOwnProperty.call(val, 'end');
    return isLoadResult || isLocation;
  },
};

expect.addSnapshotSerializer(jsonSerializer);
