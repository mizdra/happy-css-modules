import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import postcss, { type Message } from 'postcss';
import type { Result } from 'postcss-load-config';
import type { Transformer } from '../index.js';

const require = createRequire(import.meta.url);

const postcssrc: typeof import('postcss-load-config') = require('postcss-load-config');

//ref: https://github.com/postcss/postcss-import#dependency-message-support
interface DependencyMessage extends Message {
  type: 'dependency';
  file: string;
  parent: string;
}
function isDependencyMessage(message: Message): message is DependencyMessage {
  return message.type === 'dependency';
}

export type PostcssTransformerOptions = {
  cwd?: string | undefined;
  /**
   * The option compatible with postcss's `--config`. It is a relative or absolute path.
   * @example '.'
   * @example 'postcss.config.js'
   * @example '/home/user/repository/src'
   */
  postcssConfig?: string | undefined;
};

export const createPostcssTransformer: (postcssTransformerOptions?: PostcssTransformerOptions) => Transformer = (
  postcssTransformerOptions,
) => {
  const cwd = postcssTransformerOptions?.cwd ?? process.cwd();
  const configSearchPath = postcssTransformerOptions?.postcssConfig
    ? resolve(cwd, postcssTransformerOptions?.postcssConfig)
    : cwd;
  return async (source, options) => {
    // NOTE: postcss-load-config cache the configuration file so is is not reloaded.
    const postcssConfig: Result | undefined = await postcssrc({ cwd }, configSearchPath).catch((e) => {
      if (e instanceof Error && e.message.includes('No PostCSS Config found')) return undefined;
      throw e;
    });
    if (postcssConfig === undefined) return false;

    const result = await postcss.default(postcssConfig.plugins).process(source, {
      ...postcssConfig.options,
      from: options.from,
      map: { inline: false, absolute: true },
    });

    const dependencies = result.messages.filter(isDependencyMessage).map((message) => message.file);

    return { css: result.css, map: result.map, dependencies };
  };
};
