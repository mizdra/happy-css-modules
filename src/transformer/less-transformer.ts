import type { Transformer } from '../index.js';
import { handleImportError } from './index.js';

export const lessTransformer: Transformer = async (source, from) => {
  const less = await import('less').catch(handleImportError('less'));
  const result = await less.default.render(source, {
    filename: from,
    sourceMap: {},
  });
  return { css: result.css, map: result.map, dependencies: result.imports };
};
