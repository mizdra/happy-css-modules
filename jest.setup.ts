import { format } from 'prettier';
// eslint-disable-next-line no-restricted-imports
import { FIXTURE_DIR_PATH } from './packages/happy-css-modules/src/test-util/util.js';

const jsonSerializer: jest.SnapshotSerializerPlugin = {
  serialize(val) {
    const json = JSON.stringify(val);
    const replacedJson = json.replace(new RegExp(FIXTURE_DIR_PATH, 'gu'), '<fixtures>');
    return format(replacedJson, { parser: 'json5', printWidth: 120 }).trimEnd();
  },

  test(val) {
    const isLoadResult =
      val &&
      Object.prototype.hasOwnProperty.call(val, 'tokenInfos') &&
      Object.prototype.hasOwnProperty.call(val, 'transpileDependencies');
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

    const isDefinition =
      val &&
      Object.prototype.hasOwnProperty.call(val, 'file') &&
      Object.prototype.hasOwnProperty.call(val, 'text') &&
      Object.prototype.hasOwnProperty.call(val, 'start') &&
      Object.prototype.hasOwnProperty.call(val, 'end');
    return isLoadResult || isLocation || isSourceMap || isDefinition;
  },
};

const errorSerializer: jest.SnapshotSerializerPlugin = {
  serialize(val) {
    if (!(val instanceof Error)) throw new Error('unreachable');
    return val.message.replace(new RegExp(FIXTURE_DIR_PATH, 'gu'), '<fixtures>');
  },

  test(val) {
    return val instanceof Error && val.message.includes(FIXTURE_DIR_PATH);
  },
};

expect.addSnapshotSerializer(jsonSerializer);
expect.addSnapshotSerializer(errorSerializer);
