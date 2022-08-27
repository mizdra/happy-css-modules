import { format } from 'prettier';
// eslint-disable-next-line no-restricted-imports
import { removeFixtures } from './src/test/util.js';

afterEach(() => removeFixtures());

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
