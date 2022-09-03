import type { Transformer } from '../index.js';
import { handleImportError } from './index.js';

export const lessTransformer: Transformer = async (source, options) => {
  const less = await import('less').catch(handleImportError('less'));
  const result = await less.default.render(source, {
    filename: options.from,
    sourceMap: {},
  });
  return { css: result.css, map: result.map, dependencies: result.imports };
};
