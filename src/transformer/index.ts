import type { StrictlyResolver } from '../loader/index.js';
import { createLessTransformer } from './less-transformer.js';
import { createScssTransformer } from './scss-transformer.js';

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
  /**
   * Whether the specifier should be ignored.
   * For example, specifiers starting with `http://` or `https://` should be ignored.
   */
  isIgnoredSpecifier: (specifier: string) => boolean;
};

/** The function to transform source code. */
export type Transformer = (source: string, options: TransformerOptions) => TransformResult | Promise<TransformResult>;

export const createDefaultTransformer: () => Transformer = () => async (source, options) => {
  const scssTransformer = createScssTransformer();
  const lessTransformer = createLessTransformer();
  if (options.from.endsWith('.scss')) {
    return scssTransformer(source, options);
  } else if (options.from.endsWith('.less')) {
    return lessTransformer(source, options);
  }
  // TODO: support postcss
  return false;
};
