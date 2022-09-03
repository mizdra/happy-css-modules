import { lessTransformer } from './less-transformer.js';
import { scssTransformer } from './scss-transformer.js';

/**
 * The value returned from the transformer.
 * `false` means to skip transpiling on that file.
 * */
export type TransformResult =
  | {
      /** The transformed code. */
      css: string;
      /** The source map from the transformed code to the original code. */
      map: string | object;
      dependencies: (string | URL)[];
    }
  | false;

/** The function to transform source code. */
// TODO: support resolver
export type Transformer = (source: string, from: string) => TransformResult | Promise<TransformResult>;

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
