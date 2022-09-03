import type { StrictlyResolver } from '../loader/index.js';
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

export type TransformerOptions = {
  /** The path of the file to transform. */
  from: string;
  /** The function to resolve the path of the imported file. */
  resolver: StrictlyResolver;
};

/** The function to transform source code. */
export type Transformer = (source: string, options: TransformerOptions) => TransformResult | Promise<TransformResult>;

export const handleImportError = (packageName: string) => (e: unknown) => {
  console.error(`${packageName} import failed. Did you forget to \`npm install -D ${packageName}\`?`);
  throw e;
};

// TODO: support resolver
export const defaultTransformer: Transformer = async (source, options) => {
  if (options.from.endsWith('.scss')) {
    return scssTransformer(source, options);
  } else if (options.from.endsWith('.less')) {
    return lessTransformer(source, options);
  }
  // TODO: support postcss
  return false;
};
