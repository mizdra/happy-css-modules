import { format } from 'prettier';
// eslint-disable-next-line no-restricted-imports
import { FIXTURE_DIR_PATH } from './src/test/util.js';

const jsonSerializer: jest.SnapshotSerializerPlugin = {
  serialize(val) {
    const json = JSON.stringify(val);
    const replacedJson = json.replace(new RegExp(FIXTURE_DIR_PATH, 'g'), '<fixtures>');
    return format(replacedJson, { parser: 'json', printWidth: 120 }).trimEnd();
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
    const isSourceMap =
      val &&
      Object.prototype.hasOwnProperty.call(val, 'file') &&
      Object.prototype.hasOwnProperty.call(val, 'mappings') &&
      Object.prototype.hasOwnProperty.call(val, 'names') &&
      Object.prototype.hasOwnProperty.call(val, 'sourceRoot') &&
      Object.prototype.hasOwnProperty.call(val, 'version') &&
      Object.prototype.hasOwnProperty.call(val, 'sources');
    return isLoadResult || isLocation || isSourceMap;
  },
};

expect.addSnapshotSerializer(jsonSerializer);
