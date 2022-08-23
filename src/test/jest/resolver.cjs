const nativeModule = require('node:module');

// workaround for https://github.com/facebook/jest/issues/12270#issuecomment-1194746382
function resolver(module, options) {
  const { basedir, defaultResolver } = options;
  try {
    return defaultResolver(module, options);
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    return nativeModule.createRequire(basedir).resolve(module);
  }
}

module.exports = resolver;
