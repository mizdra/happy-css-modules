import type { StrictlyResolver } from '../loader/index.js';
import { createLessTransformer } from './less-transformer.js';
import type { PostcssTransformerOptions } from './postcss-transformer.js';
import { createPostcssTransformer } from './postcss-transformer.js';
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

export const handleImportError = (packageName: string) => (e: unknown) => {
  console.error(`${packageName} import failed. Did you forget to \`npm install -D ${packageName}\`?`);
  throw e;
};

export type DefaultTransformerOptions = PostcssTransformerOptions;

export const createDefaultTransformer: (defaultTransformerOptions?: DefaultTransformerOptions) => Transformer = (
  defaultTransformerOptions,
) => {
  const scssTransformer = createScssTransformer();
  const lessTransformer = createLessTransformer();
  const postcssTransformer = createPostcssTransformer(defaultTransformerOptions);
  return async (source, options) => {
    if (options.from.endsWith('.scss')) {
      return scssTransformer(source, options);
    } else if (options.from.endsWith('.less')) {
      return lessTransformer(source, options);
    } else {
      // TODO: Support multi-stage transformations by sass and less.
      return postcssTransformer(source, options);
    }
  };
};
