import {
  toMatchInlineSnapshot,
  toMatchSnapshot,
  toThrowErrorMatchingInlineSnapshot,
  toThrowErrorMatchingSnapshot,
} from 'jest-snapshot';
import mock from 'mock-fs';
import { format } from 'prettier';

// There is a problem that snapshots cannot be written when the filesystem is mocked with mock-fs.
// Here is a workaround for that problem by overriding the default matcher.
// ref: https://github.com/tschaub/mock-fs#using-with-jest-snapshot-testing
// TODO: open an issue on tschaub/mock-fs
expect.extend({
  toMatchInlineSnapshot(...args: Parameters<typeof toMatchInlineSnapshot>) {
    // @ts-ignore
    return mock.bypass(() => toMatchInlineSnapshot.call(this, ...args));
  },
  toMatchSnapshot(...args) {
    // @ts-ignore
    return mock.bypass(() => toMatchSnapshot.call(this, ...args));
  },
  toThrowErrorMatchingInlineSnapshot(...args) {
    // @ts-ignore
    return mock.bypass(() => toThrowErrorMatchingInlineSnapshot.call(this, ...args));
  },
  toThrowErrorMatchingSnapshot(...args) {
    // @ts-ignore
    return mock.bypass(() => toThrowErrorMatchingSnapshot.call(this, ...args));
  },
});
const nativeConsoleLog = console.log;
const nativeConsoleWarn = console.warn;
const nativeConsoleError = console.error;
const nativeConsoleInfo = console.error;
const nativeConsoleDebug = console.error;
console.log = (...args) => mock.bypass(() => nativeConsoleLog.call(console, ...args));
console.warn = (...args) => mock.bypass(() => nativeConsoleWarn.call(console, ...args));
console.error = (...args) => mock.bypass(() => nativeConsoleError.call(console, ...args));
console.info = (...args) => mock.bypass(() => nativeConsoleInfo.call(console, ...args));
console.debug = (...args) => mock.bypass(() => nativeConsoleDebug.call(console, ...args));

// Mocking by mock-fs prevents jest from reporting test results. Therefore, un-mock before the test is finished.
afterEach(() => mock.restore());

const jsonSerializer: jest.SnapshotSerializerPlugin = {
  serialize(val) {
    return format(JSON.stringify(val), { parser: 'json', printWidth: 120 }).trimEnd();
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
