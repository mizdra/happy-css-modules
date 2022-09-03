import { type Transformer } from '../loader/index.js';
import { lessTransformer } from './less-transformer.js';
import { scssTransformer } from './scss-transformer.js';

export const handleImportError = (packageName: string) => (e: unknown) => {
  console.error(`${packageName} import failed. Did you forget to \`npm install -D ${packageName}\`?`);
  throw e;
};

// TODO: support resolver
export const defaultTransformer: Transformer = async (source, from) => {
  if (from.endsWith('.scss')) {
    return scssTransformer(source, from);
  } else if (from.endsWith('.less')) {
    return lessTransformer(source, from);
  }
  // TODO: support postcss
  return false;
};
